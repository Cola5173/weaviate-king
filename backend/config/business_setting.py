# Weaviate-King 业务侧配置
import os

# 连接相关配置
TIMEOUT_CONFIG = {
    # 连接测试 HTTP 客户端超时时间（秒）
    "TEST_CONNECTION_TIMEOUT": float(os.getenv("CONNECTION_TEST_TIMEOUT", "30.0")),
    # Schema 查询 HTTP 客户端超时时间（秒）
    "SCHEMA_QUERY_TIMEOUT": float(os.getenv("SCHEMA_QUERY_TIMEOUT", "30.0")),
    # Objects 查询 HTTP 客户端超时时间（秒）
    "OBJECTS_QUERY_TIMEOUT": float(os.getenv("OBJECTS_QUERY_TIMEOUT", "30.0")),
}