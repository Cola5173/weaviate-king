import logging
import os
import json
from typing import Dict, List

import httpx
from fastapi import APIRouter
from models.base import Response
from models.connect_model import TestConnectionRequest
from config.business_setting import TIMEOUT_CONFIG
from config.settings import DATA_CONFIG
from utils.connection_utils import test_connection

CONNECTION_TEST_TIMEOUT = TIMEOUT_CONFIG["TEST_CONNECTION_TIMEOUT"]

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/connection", tags=["connection"])


@router.post("/test", response_model=Response)
async def test(
        request: TestConnectionRequest
) -> Response:
    """测试 Weaviate 连接。

    前端表单传入 scheme(http/https)、address(例如 127.0.0.1:8080) 和可选 apiKey。
    逻辑：尝试访问 /v1/meta，若失败再尝试 /v1。
    """
    base_url = f"{request.scheme}://{request.address}".rstrip("/")

    logger.info(
        "连接测试开始 name=%s url=%s 超时时间=%ss apiKey=%s",
        request.name, base_url, CONNECTION_TEST_TIMEOUT, request.apiKey or "<none>",
    )

    headers: Dict[str, str] = {}
    if request.apiKey:
        headers["Authorization"] = f"Bearer {request.apiKey}"

    try:
        async with httpx.AsyncClient(timeout=CONNECTION_TEST_TIMEOUT) as client:
            ok, result, msg = await test_connection(client, base_url, headers, CONNECTION_TEST_TIMEOUT)
            if ok:
                return Response(success=True, message=msg, data={
                    "name": request.name,
                    "address": f"{request.scheme}://{request.address}",
                    **result,
                })
            return Response(success=False, message=msg)
    except Exception as e:
        logger.exception("连接测试出现未预期异常 错误=%s", str(e))
        return Response(success=False, message=f"连接测试异常: {str(e)}")

    logger.error("连接测试失败 url=%s 原因=未通过就绪或schema检查", base_url)
    return Response(success=False, message="连接失败: 服务未就绪或无权访问 schema")


@router.post("/save", response_model=Response)
async def save(
        request: TestConnectionRequest
) -> Response:
    """保存连接配置到数据文件。

    将 `TestConnectionRequest` 内容保存到 `DATA_CONFIG['clusters_file']` 指定的 JSON 文件中。
    逻辑：按 `name` 进行简单 upsert（存在则覆盖，不存在则追加）。
    """
    file_path = DATA_CONFIG["clusters_file"]
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    logger.info(
        "保存连接配置 name=%s scheme=%s address=%s apiKey=%s -> %s",
        request.name, request.scheme, request.address, request.apiKey or "<none>", file_path,
    )

    record = {
        "name": request.name,
        "scheme": request.scheme,
        "address": request.address,
        "apiKey": request.apiKey or "",
    }

    try:
        # 可选：保存前再次进行连接测试
        async with httpx.AsyncClient(timeout=CONNECTION_TEST_TIMEOUT) as client:
            save_headers: Dict[str, str] = {}
            if request.apiKey:
                save_headers["Authorization"] = f"Bearer {request.apiKey}"
            ok, _, msg = await test_connection(client, f"{request.scheme}://{request.address}", save_headers, CONNECTION_TEST_TIMEOUT)
            if not ok:
                logger.error("保存前连接测试未通过 name=%s 地址=%s 错误=%s", request.name, request.address, msg)
                return Response(success=False, message=f"保存失败: {msg}")

        # 读取现有列表
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                try:
                    data: List[Dict] = json.load(f) or []
                except json.JSONDecodeError:
                    data = []
        else:
            data = []

        # upsert by name
        updated = False
        for idx, item in enumerate(data):
            if isinstance(item, dict) and item.get("name") == request.name:
                data[idx] = record
                updated = True
                break
        if not updated:
            data.append(record)

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return Response(success=True, message="保存成功", data=record)
    except Exception as e:
        logger.exception("保存连接配置失败 错误=%s", str(e))
        return Response(success=False, message=f"保存失败: {str(e)}")
