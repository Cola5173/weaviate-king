import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import connection, schema, objects

from config.settings import (
    SERVER_CONFIG,
    CORS_CONFIG,
    STORAGE_CONFIG,
    DATA_CONFIG,
)

# 确保应用日志可见（在未配置处理器时设置一个默认处理器）
root_logger = logging.getLogger()
if not root_logger.hasHandlers():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )

# 降低第三方库 httpx/httpcore 的日志级别，避免冗余的请求明细日志
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

logger = logging.getLogger("weaviate_king")


def print_all_configs() -> None:
    """打印所有配置信息到日志"""
    logger.info("=" * 80)
    logger.info("🚀 Weaviate-King API 启动配置信息")
    logger.info("=" * 80)

    # 服务器配置
    logger.info("📋 服务器配置:")
    logger.info(f"   📍 Weaviate-King服务: {SERVER_CONFIG['HOST']}:{SERVER_CONFIG['PORT']}")

    # 存储配置
    logger.info("💾 存储配置:")
    logger.info(f"   📁 日志目录: {STORAGE_CONFIG['LOG_DIR']}")
    logger.info(f"   📁 数据目录: {STORAGE_CONFIG['DATA_DIR']}")

    # 数据配置
    logger.info("🗄️ 数据配置:")
    logger.info(f"   📄 集群文件: {DATA_CONFIG['clusters_file']}")

    logger.info("=" * 80)


app = FastAPI(
    title="Weaviate-King API",
    description="Weaviate-King 后端 API",
    version="0.1.0"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    **CORS_CONFIG
)

# 注册路由
app.include_router(connection.router)
app.include_router(schema.router)
app.include_router(objects.router)


@app.on_event("startup")
async def startup_event():
    """应用启动时的事件处理"""
    print_all_configs()
    logger.info("✅ Weaviate-King API 启动完成")
