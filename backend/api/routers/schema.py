import logging
from typing import Dict

import httpx
from fastapi import APIRouter
from models.base import Response
from models.connect_model import Connections
from config.business_setting import TIMEOUT_CONFIG

SCHEMA_QUERY_TIMEOUT = TIMEOUT_CONFIG["TEST_CONNECTION_TIMEOUT"]

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/schema", tags=["schema"])


@router.post("/query", response_model=Response)
async def query_schema(request: Connections) -> Response:
    """查询 Weaviate 中的 schema。

    根据传入的连接配置（id、name、scheme、address、apiKey）查询 Weaviate 的 schema。
    调用 Weaviate 的 /v1/schema 端点获取 schema 信息。
    """
    base_url = f"{request.scheme}://{request.address}".rstrip("/")
    schema_url = f"{base_url}/v1/schema"

    logger.info(
        "查询 schema 开始 id=%s name=%s url=%s 超时时间=%ss",
        request.id, request.name, schema_url, SCHEMA_QUERY_TIMEOUT,
    )

    headers: Dict[str, str] = {}
    if request.apiKey:
        headers["Authorization"] = f"Bearer {request.apiKey}"

    try:
        async with httpx.AsyncClient(timeout=SCHEMA_QUERY_TIMEOUT) as client:
            try:
                schema_resp = await client.get(schema_url, headers=headers)
                
                if schema_resp.status_code == 200:
                    try:
                        schema_data = schema_resp.json()
                        logger.info("查询 schema 成功 id=%s name=%s", request.id, request.name)
                        return Response(
                            success=True,
                            message="查询 schema 成功",
                            data={
                                "id": request.id,
                                "name": request.name,
                                "address": f"{request.scheme}://{request.address}",
                                "schema": schema_data,
                            }
                        )
                    except Exception as e:
                        logger.error("解析 schema 响应失败 id=%s 错误=%s", request.id, str(e))
                        return Response(
                            success=False,
                            message=f"解析 schema 响应失败: {str(e)}"
                        )
                elif schema_resp.status_code == 401:
                    logger.error("查询 schema 失败 未授权 id=%s", request.id)
                    return Response(
                        success=False,
                        message="查询失败: 未授权，请检查 API Key"
                    )
                elif schema_resp.status_code == 404:
                    logger.error("查询 schema 失败 端点不存在 id=%s url=%s", request.id, schema_url)
                    return Response(
                        success=False,
                        message="查询失败: Schema 端点不存在"
                    )
                else:
                    logger.error(
                        "查询 schema 失败 状态码=%s id=%s url=%s",
                        schema_resp.status_code, request.id, schema_url
                    )
                    return Response(
                        success=False,
                        message=f"查询失败: HTTP {schema_resp.status_code}"
                    )
            except httpx.TimeoutException:
                logger.error("查询 schema 超时 id=%s url=%s 超时时间=%ss", request.id, schema_url, SCHEMA_QUERY_TIMEOUT)
                return Response(
                    success=False,
                    message="查询超时，请检查网络连接或增加超时时间"
                )
            except httpx.ConnectError as e:
                logger.error("查询 schema 连接错误 id=%s url=%s 错误=%s", request.id, schema_url, str(e))
                return Response(
                    success=False,
                    message="无法连接到服务器，请检查地址和网络"
                )
    except Exception as e:
        logger.exception("查询 schema 出现未预期异常 id=%s 错误=%s", request.id, str(e))
        return Response(
            success=False,
            message=f"查询异常: {str(e)}"
        )

