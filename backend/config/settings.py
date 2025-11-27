# Weaviate-King Web API 配置文件
import os

# 存储路径配置
STORAGE_CONFIG = {
    # 日志文件存储路径
    "LOG_DIR": os.getenv("LOG_DIR", "../logs"),
    # 数据文件存储路径
    "DATA_DIR": os.getenv("DATA_DIR", "../data"),
}

# 服务器配置
SERVER_CONFIG = {
    # 应用服务器配置
    "HOST": os.getenv("WEAVIATE_KING_HOST", "0.0.0.0"),
    "PORT": int(os.getenv("WEAVIATE_KING_PORT", "5175")),
}

# CORS 配置
# 注意：
# - 在 Tauri WebView 中，Origin 可能是 `tauri://localhost`、`null` 等非标准 HTTP/HTTPS 源，
#   同时前端并未使用 Cookie 等凭证，所以这里直接放宽为「任意来源」即可，避免 dev/build 不一致。
CORS_CONFIG = {
    "allow_origins": ["*"],      # 允许任意 origin 访问
    "allow_credentials": False,  # 不使用 Cookie/认证头的跨站凭证
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}

# 数据文件配置
DATA_CONFIG = {
    "clusters_file": os.path.join(STORAGE_CONFIG["DATA_DIR"], "clusters.json"),
}