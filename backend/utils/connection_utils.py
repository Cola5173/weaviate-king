import logging
from typing import Dict, Tuple, Any

import httpx


logger = logging.getLogger(__name__)


async def test_connection(
    client: httpx.AsyncClient,
    base_url: str,
    headers: Dict[str, str],
    timeout_seconds: float,
) -> Tuple[bool, Dict[str, Any], str]:
    """测试 Weaviate 连接可用性。

    返回: (是否成功, 结果数据, 失败消息)
    结果数据包含 probe 和 meta 信息。
    """
    # 1) 就绪检查
    ready_url = f"{base_url}/v1/.well-known/ready"
    try:
        ready_resp = await client.get(ready_url, headers=headers)
        ready_ok = ready_resp.status_code == 200
        if ready_ok:
            logger.info("连接就绪检查通过 路径=%s", ready_url)
        else:
            logger.error("连接就绪检查失败 路径=%s 状态码=%s", ready_url, ready_resp.status_code)
    except httpx.TimeoutException:
        logger.error("连接就绪检查超时 url=%s 超时时间=%ss", ready_url, timeout_seconds)
        return False, {}, "连接超时，请检查地址是否正确"
    except httpx.ConnectError as e:
        logger.error("连接就绪检查连接错误 url=%s 错误=%s", ready_url, str(e))
        return False, {}, "无法连接到服务器，请检查地址和网络"
    except Exception as e:
        logger.exception("连接就绪检查发生错误 url=%s 错误=%s", ready_url, str(e))
        return False, {}, f"连接测试失败: {str(e)}"

    # 2) meta 检查
    meta_url = f"{base_url}/v1/meta"
    meta_info: Dict[str, Any] = {}
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
        logger.error("连接 meta 检查超时 url=%s 超时时间=%ss", meta_url, timeout_seconds)
        return False, {}, "连接超时，请检查地址是否正确"
    except httpx.ConnectError as e:
        logger.error("连接 meta 检查连接错误 url=%s 错误=%s", meta_url, str(e))
        return False, {}, "无法连接到服务器，请检查地址和网络"
    except Exception as e:
        logger.exception("连接 meta 检查发生错误 url=%s 错误=%s", meta_url, str(e))
        return False, {}, f"连接测试失败: {str(e)}"

    # 3) schema 检查
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
        logger.error("连接 schema 检查超时 url=%s 超时时间=%ss", schema_url, timeout_seconds)
        return False, {}, "连接超时，请检查地址是否正确"
    except httpx.ConnectError as e:
        logger.error("连接 schema 检查连接错误 url=%s 错误=%s", schema_url, str(e))
        return False, {}, "无法连接到服务器，请检查地址和网络"
    except Exception as e:
        logger.exception("连接 schema 检查发生错误 url=%s 错误=%s", schema_url, str(e))
        return False, {}, f"连接测试失败: {str(e)}"

    if ready_ok and schema_ok:
        return True, {
            "probe": {
                "ready": ready_url,
                "meta": meta_url,
                "schema": schema_url,
            },
            "meta": meta_info,
        }, "连接测试成功"

    return False, {}, "连接失败: 服务未就绪或无权访问 schema"


