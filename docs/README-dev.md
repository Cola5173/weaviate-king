# Weaviate-King

> 更人性化的 Weaviate GUI 桌面管理工具

Weaviate-King 是一个跨平台的 Weaviate 向量数据库桌面管理工具，提供直观的图形界面来管理 Weaviate 集群、查询数据、浏览 Schema 等。

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **桌面框架**: Tauri 2.0
- **UI 组件库**: Ant Design 5
- **构建工具**: Vite
- **状态管理**: Zustand
- **数据查询**: React Query + GraphQL
- **代码编辑**: CodeMirror 6

### 📋 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 yarn >= 1.22.0 或 pnpm >= 8.0.0
- Rust >= 1.70.0 (用于构建 Tauri 应用)
- Python >= 3.10 (运行后端 API)

## 📁 项目结构

```
weaviate-king/
├── frontend/                 # 前端代码
│   ├── src/
│   │   ├── components/       # 组件
│   │   │   ├── Layout.tsx   # 布局组件
│   │   │   ├── Header.tsx    # 顶部标题栏
│   │   │   ├── Sidebar.tsx   # 左侧导航栏
│   │   │   └── ClusterCard.tsx # 集群卡片
│   │   ├── pages/            # 页面
│   │   │   └── ClustersPage.tsx # 集群列表页
│   │   ├── utils/            # 工具函数
│   │   ├── App.tsx           # 主应用组件
│   │   └── main.tsx          # 入口文件
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── src-tauri/                # Tauri 后端（Rust）
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── backend/                  # Python FastAPI 服务
│   ├── api/
│   │   ├── app.py            # 主应用入口
│   │   ├── debug.py          # 本地调试脚本
│   │   ├── routers/          # connection/schema/objects 路由
│   │   └── models/           # 请求/响应模型
│   ├── config/               # 配置项（端口/CORS/存储路径）
│   ├── requirements.txt      # Python 依赖
│   └── data/                 # 本地存储的连接数据
└── README.md
```

## 🚀 快速开始

### 1. 克隆并进入仓库

```bash
git clone https://github.com/your-repo/weaviate-king.git
cd weaviate-king
```

### 2. 初始化 Tauri 配置（仅首次缺失时）

> 如果版本库里已经包含 `src-tauri/` 与 `tauri.conf.json`，可以跳过本步骤。

```bash
# 确认位于仓库根目录
ls src-tauri || true

# 若输出 "No such file or directory"，则先安装根目录依赖并初始化 Tauri
npm install
npx tauri init
```

> `npx tauri init` 会在项目根目录生成 `src-tauri/`、`tauri.conf.json` 等必须文件；执行过程中按照提示选择或直接使用默认值即可。
> 主要会询问静态资源目录与开发服务器地址，通常填写 `../frontend/dist` 与 `http://localhost:5173`。若想一次性配置，可执行：
>
> ```bash
> npx tauri init --ci \
>   --app-name weaviate-king \
>   --window-title weaviate-king \
>   --dev-path ../frontend/dist \
>   --dev-url http://localhost:5173 \
>   --before-dev-command "cd frontend && npm run dev" \
>   --before-build-command "cd frontend && npm run build"
> ```

### 3. 初始化前端依赖

```bash
cd frontend
npm install
```

> 前端使用 Vite，开发时默认监听 `http://localhost:5173`。

### 4. 初始化后端依赖

```bash
cd backend
python -m venv .venv            # 创建虚拟环境
source .venv/bin/activate       # macOS/Linux
# Windows PowerShell: .venv\Scripts\Activate.ps1

pip install -r requirements.txt

# 可选：第一次运行时创建默认数据目录
mkdir -p ../logs ../data && cp data/clusters.json ../data/

# 完成后保留虚拟环境激活状态，继续下一步
```

## 🏃‍♂️ 本地开发流程

### 启动后端 FastAPI 服务

在 `backend` 目录下（确保虚拟环境已激活）执行一次命令即可：

```bash
uvicorn api.app:app --host 0.0.0.0 --port 5175 --reload
```

> 如果你的环境不支持 `uvicorn` 命令，也可以使用 `python api/debug.py`。

默认端口为 `5175`，与前端默认配置一致。运行日志会打印当前配置以及数据目录。

### 启动前端 Web/Tauri 客户端

打开另一个终端窗口，进入 `frontend` 目录后选择你需要的开发模式：

```bash
cd frontend

# Web 版调试（推荐）
npm run dev

# 或者以桌面应用方式运行，需要在仓库根目录调用 tauri 命令：
cd /weaviate-king
npm run tauri dev
```

> Tauri 模式会自动尝试运行 `backend/start-backend.sh`（或 Windows 上的 `start-backend.ps1`），默认优先使用 `.venv-tauri` 虚拟环境；若不存在会退回 `.venv`。首次为桌面端准备后端依赖，可执行 `./scripts/package-macos.sh --fresh` 或 `./scripts/package-windows.ps1 -Fresh` 预构建 `.venv-tauri`。

前端会从 `VITE_BACKEND_URL` 环境变量读取后端地址，默认 `http://localhost:5175`。

### 前后端联调

1. 启动后端 `uvicorn` 服务，确认日志显示 `✅ Weaviate-King API 启动完成`。
2. 启动前端开发服务后，在浏览器或 Tauri 窗口访问；首次进入时可以通过左侧导航栏创建连接并同步 Schema。

## ⚙️ 环境变量说明

| 变量                     | 默认值                     | 说明           |
|------------------------|-------------------------|--------------|
| `WEAVIATE_KING_PORT`   | `5175`                  | 后端 API 监听端口  |
| `WEAVIATE_KING_HOST`   | `0.0.0.0`               | 后端绑定地址       |
| `LOG_DIR` / `DATA_DIR` | `../logs` / `../data`   | API 日志与数据目录  |
| `VITE_BACKEND_URL`     | `http://localhost:5175` | 前端访问的 API 地址 |

`frontend/.env` 或 `.env.local` 中设置 `VITE_BACKEND_URL`，即可覆盖默认后端地址。

## 🔁 常见开发任务

- **新增后端接口**：在 `backend/api/routers/` 中添加路由，必要时扩展 `models/` 与 `utils/`
- **新增页面**：按照下文“添加新页面”步骤更新 `Layout.tsx` 与 `Sidebar.tsx`
- **本地数据**：修改 `backend/data/clusters.json` 或通过应用 UI 操作，数据会写入 `STORAGE_CONFIG['DATA_DIR']`

## 🔧 配置说明

### Weaviate 连接配置

应用会将连接配置存储在本地应用数据目录：

- **macOS**: `~/Library/Application Support/weaviate-king/`
- **Windows**: `%APPDATA%\weaviate-king\`
- **Linux**: `~/.local/share/weaviate-king/`

配置文件：`connections.json`

## 📝 开发指南

### 添加新页面

1. 在 `frontend/src/pages/` 创建新页面组件
2. 在 `frontend/src/components/Layout.tsx` 中添加路由
3. 在 `frontend/src/components/Sidebar.tsx` 中添加菜单项

### 样式规范

- 使用 CSS Modules 或独立的 CSS 文件
- 遵循深色主题设计规范
- 主色调：`#52c41a` (绿色)

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件使用函数式组件 + Hooks

### 其它注意事项

- **日志**：可启用 `tauri-plugin-log` 将 Rust 与前端日志写入文件，便于排查后端启动失败等问题。
- **端口冲突**：确保打包时选择的后端端口未被系统占用，可在启动后检测返回码并提示用户。
- **更新**：若要支持自动更新，可结合 Tauri Updater 或自建更新服务器发布带后端的版本。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

## 🙏 致谢

- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [Ant Design](https://ant.design/) - 企业级 UI 组件库
- [Weaviate](https://weaviate.io/) - 开源向量数据库

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [GitHub Issue](https://github.com/your-repo/weaviate-king/issues)
- 加入技术交流群

---

**Made with ❤️ for the Weaviate community**



