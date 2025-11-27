use std::{
  fs,
  path::{Path, PathBuf},
  process::{Child, Command, Stdio},
  sync::Mutex,
  time::Duration,
  collections::HashMap,
};

use tauri::{path::BaseDirectory, App, AppHandle, Manager, RunEvent};
use std::thread;
use serde::{Deserialize, Serialize};

struct BackendProcess(Mutex<Option<Child>>);

impl Default for BackendProcess {
  fn default() -> Self {
    Self(Mutex::new(None))
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let context = tauri::generate_context!();

  tauri::Builder::default()
    .manage(BackendProcess::default())
    .invoke_handler(tauri::generate_handler![http_request])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Disable window shadow on macOS
      // Try all available windows, with a small delay to ensure window is fully created
      #[cfg(target_os = "macos")]
      {
        let app_handle = app.handle().clone();
        thread::spawn(move || {
          // Wait a bit for window to be fully created
          thread::sleep(Duration::from_millis(100));
          for (label, window) in app_handle.webview_windows() {
            if let Err(e) = window.set_shadow(false) {
              eprintln!("[window] Failed to disable shadow for window '{}': {e}", label);
            } else {
              eprintln!("[window] Disabled shadow for window '{}'", label);
            }
          }
        });
      }

      if let Err(err) = start_embedded_backend(app) {
        eprintln!("[backend] ❌ Failed to launch backend: {err}");
        eprintln!("[backend] Please check:");
        eprintln!("[backend]   1. Backend script exists and is executable");
        eprintln!("[backend]   2. Python virtual environment exists (.venv-tauri or .venv)");
        eprintln!("[backend]   3. Backend dependencies are installed");
      } else {
        eprintln!("[backend] ✅ Backend started successfully");
      }

      Ok(())
    })
    .build(context)
    .expect("error while building tauri application")
    .run(|app_handle, event| {
      match event {
        RunEvent::WindowEvent { label, event, .. } => {
          // Disable shadow when window is focused or resized (including maximize)
          #[cfg(target_os = "macos")]
          {
            if matches!(
              event,
              tauri::WindowEvent::Focused(true) | tauri::WindowEvent::Resized(_)
            ) {
              if let Some(window) = app_handle.get_webview_window(&label) {
                let _ = window.set_shadow(false);
              }
            }
          }
        }
        RunEvent::ExitRequested { .. } | RunEvent::Exit => {
          stop_embedded_backend(app_handle);
        }
        _ => {}
      }
    });
}

fn start_embedded_backend(app: &App) -> anyhow::Result<()> {
  let backend_dir = resolve_backend_dir(app)?;
  let script_path = backend_launch_script(&backend_dir)?;

  let app_data_dir = app.path().app_local_data_dir()?;

  let logs_dir = app_data_dir.join("logs");
  let data_dir = app_data_dir.join("data");

  fs::create_dir_all(&logs_dir)?;
  fs::create_dir_all(&data_dir)?;

  copy_default_data(&backend_dir, &data_dir)?;

  let mut command = if cfg!(target_os = "windows") {
    let mut cmd = Command::new("powershell");
    cmd.arg("-NoProfile")
      .arg("-ExecutionPolicy")
      .arg("Bypass")
      .arg("-File")
      .arg(script_path);
    cmd
  } else {
    let mut cmd = Command::new("bash");
    cmd.arg(script_path);
    cmd
  };

  if cfg!(debug_assertions) {
    command.stdout(Stdio::inherit()).stderr(Stdio::inherit());
  } else {
    command.stdout(Stdio::null()).stderr(Stdio::null());
  }

  command
    .current_dir(&backend_dir)
    .env("WEAVIATE_KING_HOST", "127.0.0.1")
    .env("WEAVIATE_KING_PORT", "5175")
    .env("LOG_DIR", &logs_dir)
    .env("DATA_DIR", &data_dir)
    .env("PYTHONUNBUFFERED", "1");

  let child = command.spawn()?;

  let state = app.state::<BackendProcess>();
  *state.0.lock().expect("backend state poisoned") = Some(child);

  Ok(())
}

fn stop_embedded_backend(app_handle: &AppHandle) {
  let maybe_child = {
    let state = app_handle.state::<BackendProcess>();
    let result = match state.0.lock() {
      Ok(mut guard) => guard.take(),
      Err(_) => None,
    };
    result
  };

  if let Some(mut child) = maybe_child {
    let _ = child.kill();
  }
}

fn resolve_backend_dir(app: &App) -> anyhow::Result<PathBuf> {
  // In development（tauri dev / cargo run）模式下，优先使用源码目录下的 backend
  // 在 release / build 出来的应用中，始终使用打包到 Resources 里的 backend
  #[cfg(debug_assertions)]
  {
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("backend");
    if dev_path.exists() {
      return Ok(dev_path);
    }
  }

  // 非 debug（也就是 build 出来的 app）走打包资源目录
  // 注意：tauri bundler 会把工作目录打包到 Resources/_up_ 下
  // 我们优先尝试 _up_/backend，其次回退到 backend 以兼容未来可能的布局
  if let Ok(path) = app.path().resolve("_up_/backend", BaseDirectory::Resource) {
    if path.exists() {
      return Ok(path);
    }
  }

  if let Ok(path) = app.path().resolve("backend", BaseDirectory::Resource) {
    if path.exists() {
      return Ok(path);
    }
  }

  Err(anyhow::anyhow!("cannot locate backend resources"))
}

fn backend_launch_script(backend_dir: &Path) -> anyhow::Result<PathBuf> {
  let script = if cfg!(target_os = "windows") {
    backend_dir.join("start-backend.ps1")
  } else {
    backend_dir.join("start-backend.sh")
  };

  if script.exists() {
    Ok(script)
  } else {
    Err(anyhow::anyhow!("backend launch script missing: {}", script.display()))
  }
}

fn copy_default_data(backend_dir: &Path, data_dir: &Path) -> anyhow::Result<()> {
  let source = backend_dir.join("data").join("clusters.json");
  let dest = data_dir.join("clusters.json");
  if !dest.exists() && source.exists() {
    fs::copy(source, dest)?;
  }
  Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct HttpRequest {
  url: String,
  method: String,
  headers: Option<HashMap<String, String>>,
  body: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct HttpResponse {
  status: u16,
  status_text: String,
  headers: HashMap<String, String>,
  body: String,
}

#[tauri::command]
async fn http_request(request: HttpRequest) -> Result<HttpResponse, String> {
  eprintln!("[http_request] 收到请求: method={}, url={}", request.method, request.url);
  
  // 对于本地请求，先检查服务是否就绪，最多重试 5 次
  let max_retries = 5;
  let mut last_error = None;
  
  for attempt in 1..=max_retries {
    // 使用 ureq（同步 HTTP 库），在 tokio 的 spawn_blocking 中运行以避免阻塞
    let request_clone = request.clone();
    let resp_result = tokio::task::spawn_blocking(move || {
      let mut req_builder = match request_clone.method.as_str() {
        "GET" => ureq::get(&request_clone.url),
        "POST" => ureq::post(&request_clone.url),
        "PUT" => ureq::put(&request_clone.url),
        "DELETE" => ureq::delete(&request_clone.url),
        "PATCH" => ureq::request("PATCH", &request_clone.url),
        _ => return Err(format!("Unsupported method: {}", request_clone.method)),
      };

      // 设置请求头
      if let Some(headers) = request_clone.headers {
        for (key, value) in headers {
          req_builder = req_builder.set(&key, &value);
        }
      }

      // 发送请求
      eprintln!("[http_request] 发送请求到: {}", request_clone.url);
      let resp = if let Some(body) = request_clone.body {
        req_builder.send_string(&body)
      } else {
        req_builder.call()
      };

      resp.map_err(|e| {
        eprintln!("[http_request] 请求失败: {} (url: {})", e, request_clone.url);
        format!("Request failed: {} (url: {})", e, request_clone.url)
      })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;

    match resp_result {
      Ok(resp) => {
        eprintln!("[http_request] 收到响应: status={}", resp.status());
        
        let status = resp.status();
        let status_text = resp.status_text().to_string();
        
        let mut response_headers = HashMap::new();
        resp.headers_names().iter().for_each(|name| {
          if let Some(value) = resp.header(name) {
            response_headers.insert(name.clone(), value.to_string());
          }
        });

        let body = resp.into_string().map_err(|e| format!("Failed to read response body: {}", e))?;

        return Ok(HttpResponse {
          status: status as u16,
          status_text,
          headers: response_headers,
          body,
        });
      }
      Err(e) => {
        last_error = Some(e.clone());
        if attempt < max_retries {
          eprintln!("[http_request] 尝试 {}/{} 失败，等待后重试...", attempt, max_retries);
          tokio::time::sleep(Duration::from_millis(500)).await;
          continue;
        } else {
          return Err(e);
        }
      }
    }
  }
  
  Err(last_error.unwrap_or_else(|| "Unknown error".to_string()))
}
