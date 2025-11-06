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
    "PORT": int(os.getenv("WEAVIATE_KING_PORT", "8000")),
}

# CORS 配置
CORS_CONFIG = {
    "allow_origins": [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}

# 数据文件配置
DATA_CONFIG = {
    "clusters_file": os.path.join(STORAGE_CONFIG["DATA_DIR"], "clusters.json"),
}