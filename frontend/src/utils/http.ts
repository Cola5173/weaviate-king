/**
 * HTTP 请求工具函数
 * 在 Tauri 环境下使用原生 HTTP（绕过 WebView 网络限制），
 * 在浏览器环境下使用标准 fetch API
 */

interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * 检测是否在 Tauri 环境中运行
 */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * 兼容 fetch API 的响应对象包装器
 */
class TauriResponse extends Response {
  private _jsonCache: any = null;

  constructor(body: string, init: ResponseInit) {
    super(body, init);
  }

  async json(): Promise<any> {
    if (this._jsonCache === null) {
      const text = await this.text();
      this._jsonCache = JSON.parse(text);
    }
    return this._jsonCache;
  }
}

/**
 * 统一的 HTTP 请求函数
 * @param url 请求 URL
 * @param options 请求选项
 * @returns Promise<Response> 兼容 fetch API 的响应对象
 */
export async function httpRequest(
  url: string,
  options: HttpRequestOptions = {}
): Promise<Response> {
  if (isTauri()) {
    // Tauri 环境：使用原生 HTTP
    const { invoke } = await import("@tauri-apps/api/core");
    
    const tauriResponse = await invoke<{
      status: number;
      status_text: string;
      headers: Record<string, string>;
      body: string;
    }>("http_request", {
      request: {
        url,
        method: options.method || "GET",
        headers: options.headers || {},
        body: options.body,
      },
    });

    // 将 Tauri 响应转换为兼容 fetch 的 Response 对象
    const headers = new Headers();
    for (const [key, value] of Object.entries(tauriResponse.headers)) {
      headers.set(key, value);
    }

    return new TauriResponse(tauriResponse.body, {
      status: tauriResponse.status,
      statusText: tauriResponse.status_text,
      headers,
    });
  } else {
    // 浏览器环境：使用标准 fetch
    return fetch(url, {
      method: options.method || "GET",
      headers: options.headers,
      body: options.body,
    });
  }
}

