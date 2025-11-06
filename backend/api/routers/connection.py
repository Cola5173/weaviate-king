import logging
from typing import Dict

import httpx
from fastapi import APIRouter
from models.base import Response
from models.connect_model import TestConnectionRequest
from config.business_setting import TIMEOUT_CONFIG

CONNECTION_TEST_TIMEOUT = TIMEOUT_CONFIG["TEST_CONNECTION_TIMEOUT"]

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/connection", tags=["connection"])


@router.post("/test", response_model=Response)
async def test(
        body: TestConnectionRequest
) -> Response:
    """测试 Weaviate 连接。

    前端表单传入 scheme(http/https)、address(例如 127.0.0.1:8080) 和可选 apiKey。
    逻辑：尝试访问 /v1/meta，若失败再尝试 /v1。
    """
    base_url = f"{body.scheme}://{body.address}".rstrip("/")
    # 打印 apiKey（做基础脱敏处理）
    if body.apiKey:
        if len(body.apiKey) >= 8:
            masked_api_key = f"{body.apiKey[:4]}...{body.apiKey[-4:]}"
        else:
            masked_api_key = "***"
    else:
        masked_api_key = "<none>"

    logger.info(
        "连接测试开始 name=%s url=%s 超时时间=%ss apiKey=%s",
        body.name, base_url, CONNECTION_TEST_TIMEOUT, masked_api_key
    )

    headers: Dict[str, str] = {}
    if body.apiKey:
        headers["Authorization"] = f"Bearer {body.apiKey}"

    try:
        async with httpx.AsyncClient(timeout=CONNECTION_TEST_TIMEOUT) as client:
            # 1) 优先检查就绪探针，确保服务处于可用状态
            ready_url = f"{base_url}/v1/.well-known/ready"
            try:
                ready_resp = await client.get(ready_url, headers=headers)
                ready_ok = ready_resp.status_code == 200
                if ready_ok:
                    logger.info("连接就绪检查通过 路径=%s", ready_url)
                else:
                    logger.error("连接就绪检查失败 路径=%s 状态码=%s", ready_url, ready_resp.status_code)
            except httpx.TimeoutException:
                logger.error("连接就绪检查超时 url=%s 超时时间=%ss", ready_url, CONNECTION_TEST_TIMEOUT)
                return Response(success=False, message="连接超时，请检查地址是否正确")
            except httpx.ConnectError as e:
                logger.error("连接就绪检查连接错误 url=%s 错误=%s", ready_url, str(e))
                return Response(success=False, message="无法连接到服务器，请检查地址和网络")
            except Exception as e:
                logger.exception("连接就绪检查发生错误 url=%s 错误=%s", ready_url, str(e))
                return Response(success=False, message=f"连接测试失败: {str(e)}")

            # 2) 读取 meta，拿到版本等信息，验证 API Key 权限
            meta_url = f"{base_url}/v1/meta"
            meta_info = {}
            try:
                meta_resp = await client.get(meta_url, headers=headers)
                if meta_resp.status_code == 200:
                    try:
                        meta_json = meta_resp.json()
                    except Exception:
                        meta_json = None
                    meta_info = meta_json or {}
                    logger.info("连接 meta 检查通过 路径=%s", meta_url)
                else:
                    logger.error("连接 meta 检查失败 路径=%s 状态码=%s", meta_url, meta_resp.status_code)
            except httpx.TimeoutException:
                logger.error("连接 meta 检查超时 url=%s 超时时间=%ss", meta_url, CONNECTION_TEST_TIMEOUT)
                return Response(success=False, message="连接超时，请检查地址是否正确")
            except httpx.ConnectError as e:
                logger.error("连接 meta 检查连接错误 url=%s 错误=%s", meta_url, str(e))
                return Response(success=False, message="无法连接到服务器，请检查地址和网络")
            except Exception as e:
                logger.exception("连接 meta 检查发生错误 url=%s 错误=%s", meta_url, str(e))
                return Response(success=False, message=f"连接测试失败: {str(e)}")

            # 3) 访问 schema，确认具备基本读权限（很多部署会要求 API Key）
            schema_url = f"{base_url}/v1/schema"
            schema_ok = False
            try:
                schema_resp = await client.get(schema_url, headers=headers)
                if schema_resp.status_code == 200:
                    schema_ok = True
                    logger.info("连接 schema 检查通过 路径=%s", schema_url)
                else:
                    logger.error("连接 schema 检查失败 路径=%s 状态码=%s", schema_url, schema_resp.status_code)
            except httpx.TimeoutException:
                logger.error("连接 schema 检查超时 url=%s 超时时间=%ss", schema_url, CONNECTION_TEST_TIMEOUT)
                return Response(success=False, message="连接超时，请检查地址是否正确")
            except httpx.ConnectError as e:
                logger.error("连接 schema 检查连接错误 url=%s 错误=%s", schema_url, str(e))
                return Response(success=False, message="无法连接到服务器，请检查地址和网络")
            except Exception as e:
                logger.exception("连接 schema 检查发生错误 url=%s 错误=%s", schema_url, str(e))
                return Response(success=False, message=f"连接测试失败: {str(e)}")

            if ready_ok and schema_ok:
                return Response(success=True, message="连接测试成功", data={
                    "name": body.name,
                    "address": f"{body.scheme}://{body.address}",
                    "probe": {
                        "ready": ready_url,
                        "meta": meta_url,
                        "schema": schema_url,
                    },
                    "meta": meta_info,
                })
    except Exception as e:
        logger.exception("连接测试出现未预期异常 错误=%s", str(e))
        return Response(success=False, message=f"连接测试异常: {str(e)}")

    logger.error("连接测试失败 url=%s 原因=未通过就绪或schema检查", base_url)
    return Response(success=False, message="连接失败: 服务未就绪或无权访问 schema")
