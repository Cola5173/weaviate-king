#!/usr/bin/env python3
"""
Weaviate-King API 调试启动文件
专门用于IDE调试，配置更简单
"""
import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

if __name__ == "__main__":
    # 导入并启动应用
    import uvicorn
    from config.settings import SERVER_CONFIG
    from api.app import app

    host = SERVER_CONFIG["HOST"]
    port = SERVER_CONFIG["PORT"]

    # 启动服务（调试模式，禁用reload避免冲突）
    uvicorn.run(
        app,
        host=host,
        port=port,
        reload=False,  # 调试模式下禁用reload
        log_level="debug"  # 调试日志级别
    )
