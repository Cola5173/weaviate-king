# Weaviate-King Backend

Weaviate-King 后端服务，使用 FastAPI 构建。

## 项目结构

```
backend/
├── api/                    # API 相关代码
│   ├── app.py             # FastAPI 应用主文件
│   ├── debug.py           # 调试启动文件
│   ├── models/            # 数据模型
│   │   └── cluster.py     # 集群模型
│   ├── routers/           # 路由模块
│   │   ├── clusters.py    # 集群路由
│   │   └── health.py      # 健康检查路由
│   └── services/          # 业务逻辑服务
│       └── cluster_service.py  # 集群服务
├── config/                # 配置文件
│   └── settings.py        # 应用配置
├── main.py                # 主启动文件
├── requirements.txt       # Python 依赖
└── README.md             # 项目说明
```

## 环境设置

### 1. 创建虚拟环境

```bash
# 进入 backend 目录
cd backend

# 创建虚拟环境（推荐使用 venv）
python -m venv .venv
```

### 2. 激活虚拟环境

**macOS/Linux:**
```bash
source .venv/bin/activate
```

激活成功后，命令行提示符前会显示 `(.venv)`。

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 退出虚拟环境

```bash
deactivate
```
