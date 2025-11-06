# Weaviate-King 业务侧配置
import os

# 连接相关配置
TIMEOUT_CONFIG = {
    # 连接测试 HTTP 客户端超时时间（秒）
    "TEST_CONNECTION_TIMEOUT": float(os.getenv("CONNECTION_TEST_TIMEOUT", "30.0")),
}