# Weaviate-King 部署与打包指南

本文档搭配仓库内的自动化脚本，帮助你一键整合前端 (React + Tauri) 与后端 (FastAPI)，输出可分发的桌面应用安装包。

---

## ⚠️ 准备工作

- Node.js ≥ 18（建议搭配 npm ≥ 9）
- Rust ≥ 1.70（Tauri 2.0 构建所需）
- Python ≥ 3.10
- 本地已配置 `src-tauri/` 目录（包含 `tauri.conf.json` 与 `src/main.rs`），并允许通过 Shell/PowerShell 调起后端服务脚本

> 首次构建前，建议使用 `rustup update` 与 `npm install -g npm@latest` 保证工具链完备。

## 🧾 打包脚本速览

| 脚本                            | 适用平台              | 主要参数                   | 作用                               |
|-------------------------------|-------------------|------------------------|----------------------------------|
| `scripts/package-macos.sh`    | macOS (Intel/ARM) | `--fresh`、`--debug`    | 构建前端、安装后端依赖、调用 `npx tauri build` |
| `scripts/package-windows.ps1` | Windows 10/11     | `-Fresh`、`-Mode debug` | 同步依赖并执行 Tauri 构建                 |

脚本会：

- 安装/更新根目录与前端依赖（使用 `npm install`、`npm ci`）
- 输出最新的前端产物 `frontend/dist`
- 在 `backend/.venv-tauri` 内安装后端依赖并生成 `requirements.lock`
- 调用 `npx tauri build` 生成桌面端安装包（默认 release）

## 🍎 macOS 打包

```bash
cd /Users/cola1213/iflytek/01_codes/WebstormProjects/weaviate-king
chmod +x scripts/package-macos.sh
./scripts/package-macos.sh          # 默认 release
./scripts/package-macos.sh --fresh  # 重新创建虚拟环境后再构建
./scripts/package-macos.sh --debug  # 输出调试包
```

产物位于 `src-tauri/target/{debug|release}`；`.app`、`.dmg`、`.tar.gz` 等文件会按 Tauri 配置生成。

### ⚠️ macOS Gatekeeper 问题

如果用户打开 DMG 或应用时提示"已损坏，无法打开"，这是因为应用未经过代码签名，macOS Gatekeeper 阻止了运行。

#### 临时解决方案（用户端）

用户可以通过以下方式绕过：

1. **方法一：右键打开**
   - 在 Finder 中找到 `weaviate-king.app`
   - 右键点击 → 选择"打开"
   - 在弹出的警告对话框中点击"打开"

2. **方法二：终端命令**
   ```bash
   sudo xattr -rd com.apple.quarantine /path/to/weaviate-king.app
   ```

3. **方法三：系统设置**
   - 系统设置 → 隐私与安全性
   - 在"安全性"部分，找到被阻止的应用
   - 点击"仍要打开"

#### 长期解决方案：配置代码签名

如果有 Apple Developer 账号（$99/年），可以配置代码签名和公证，让应用可以直接运行：

1. **获取签名证书**
   - 登录 [Apple Developer](https://developer.apple.com/)
   - 创建 "Developer ID Application" 证书（用于分发）
   - 下载并安装到钥匙串

2. **配置 Tauri**
   在 `src-tauri/tauri.conf.json` 中添加：
   ```json
   {
     "bundle": {
       "macOS": {
         "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
         "entitlements": "entitlements.plist"
       }
     }
   }
   ```

3. **创建 entitlements.plist**
   创建 `src-tauri/entitlements.plist`：
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>com.apple.security.cs.allow-jit</key>
     <true/>
     <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
     <true/>
     <key>com.apple.security.cs.disable-library-validation</key>
     <true/>
   </dict>
   </plist>
   ```

4. **配置公证（可选但推荐）**
   添加环境变量：
   ```bash
   export APPLE_ID="your@email.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="TEAM_ID"
   ```
   
   在 `tauri.conf.json` 中启用公证：
   ```json
   {
     "bundle": {
       "macOS": {
         "notarize": true
       }
     }
   }
   ```

> **注意**：代码签名和公证需要 Apple Developer 账号。对于内部使用，建议使用临时解决方案。

## 🪟 Windows 打包

```powershell
Set-Location "C:/Users/cola1213/iflytek/01_codes/WebstormProjects/weaviate-king"
powershell -ExecutionPolicy Bypass -File .\scripts\package-windows.ps1         # release
powershell -ExecutionPolicy Bypass -File .\scripts\package-windows.ps1 -Fresh   # 清理后再构建
powershell -ExecutionPolicy Bypass -File .\scripts\package-windows.ps1 -Mode debug
```

安装包位于 `src-tauri\target\{debug|release}`，包含 `.msi`、`.exe`、`.appx` 等 Tauri 默认产物。

> 如遇 PowerShell 执行策略限制，可临时执行 `Set-ExecutionPolicy Bypass -Scope Process`。

## 🔧 自定义与扩展

- **后端启动脚本**：确保 `tauri.conf.json > bundle.externalBin` 或 `fs::copy` 逻辑包含你的后端启动脚本、虚拟环境与数据目录。
- **环境变量**：脚本默认使用 `backend/.venv-tauri` 与 `WEAVIATE_KING_PORT=5175`，可在脚本顶部或 Tauri 配置处调整。
- **CI/CD**：在流水线中直接调用对应脚本，可搭配缓存 `~/.cargo`、`~/.npm`、`backend/.venv-tauri` 提升效率。
- **多语言安装向导**：可在 `tauri.conf.json > bundle` 中补充 `license`、`publisher` 等信息，以便自动生成安装界面资源。

## ✅ 构建完成后建议自测

- 应用启动后后端服务是否成功拉起、日志无异常
- 首次启动能否创建 Weaviate 连接并落盘到预期目录
- GraphQL/Schema 功能正常（若已实现）
- 打包产物中无多余缓存 (`node_modules/.cache`、日志、临时文件等)

如脚本执行失败，请先查看控制台输出；常见原因包括工具链版本不满足要求或 `src-tauri` 配置缺失。

---

**Happy shipping!**