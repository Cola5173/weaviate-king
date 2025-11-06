import logging
import uuid
from datetime import datetime, timezone
import os
import json
from typing import Dict, List

import httpx
from fastapi import APIRouter
from models.base import Response
from models.connect_model import TestConnectionRequest, Connections, UpdateConnectionRequest
from config.business_setting import TIMEOUT_CONFIG
from config.settings import DATA_CONFIG
from utils.connection_utils import test_connection

CONNECTION_TEST_TIMEOUT = TIMEOUT_CONFIG["TEST_CONNECTION_TIMEOUT"]

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/connection", tags=["connection"])


def generate_numeric_id() -> str:
    """生成仅包含数字的 ID。

    规则：毫秒时间戳 + 4 位随机数，长度约 17-19 位，避免碰撞。
    """
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    rand_suffix = str(uuid.uuid4().int % 10000).zfill(4)
    return f"{now_ms}{rand_suffix}"


@router.get("/get/{conn_id}", response_model=Response)
async def get_connection(conn_id: str) -> Response:
    """根据 id 查询连接配置详情。

    从 `DATA_CONFIG['clusters_file']` 读取 JSON 数组，返回 `id == conn_id` 的项。
    若文件不存在或未找到对应项，返回失败消息。
    """
    file_path = DATA_CONFIG["clusters_file"]
    if not os.path.exists(file_path):
        return Response(success=False, message="未找到：数据文件不存在")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            try:
                data: List[Dict] = json.load(f) or []
            except json.JSONDecodeError:
                data = []

        for item in data:
            if isinstance(item, dict) and str(item.get("id", "")) == str(conn_id):
                return Response(success=True, message="查询成功", data=item)

        logger.info("查询失败 未找到指定id id=%s", conn_id)
        return Response(success=False, message="查询失败：未找到指定记录")
    except Exception as e:
        logger.exception("读取连接配置详情失败 错误=%s", str(e))
        return Response(success=False, message=f"查询失败: {str(e)}")

@router.delete("/delete/{conn_id}", response_model=Response)
async def delete_connection(conn_id: str) -> Response:
    """根据 id 删除已保存的连接配置。

    从 `DATA_CONFIG['clusters_file']` 读取 JSON 数组，移除 `id == conn_id` 的项后写回。
    若文件不存在或未找到对应项，则返回失败消息。
    """
    file_path = DATA_CONFIG["clusters_file"]
    if not os.path.exists(file_path):
        return Response(success=False, message="无可删除的数据")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            try:
                data: List[Dict] = json.load(f) or []
            except json.JSONDecodeError:
                data = []

        before = len(data)
        data = [item for item in data if not (isinstance(item, dict) and item.get("id") == conn_id)]
        after = len(data)

        if before == after:
            logger.warning("删除失败 未找到指定id id=%s", conn_id)
            return Response(success=False, message="删除失败：未找到指定记录")

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        logger.info("已删除连接配置 id=%s 剩余=%d", conn_id, after)
        return Response(success=True, message="删除成功")
    except Exception as e:
        logger.exception("删除连接配置失败 错误=%s", str(e))
        return Response(success=False, message=f"删除失败: {str(e)}")


@router.get("/list", response_model=List[Connections])
async def list_connections() -> List[Connections]:
    """查询已保存的连接配置列表。

    从 `DATA_CONFIG['clusters_file']` 读取 JSON 数组，并返回为 `Connections` 列表。
    若文件不存在或内容为空，返回空列表。
    """
    file_path = DATA_CONFIG["clusters_file"]
    if not os.path.exists(file_path):
        return []

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            try:
                raw = json.load(f) or []
            except json.JSONDecodeError:
                raw = []

        # 按 updatedAt 倒序排序（新更新的在前）
        try:
            raw = sorted(
                [item for item in raw if isinstance(item, dict)],
                key=lambda x: x.get("updatedAt", ""),
                reverse=True,
            )
        except Exception:
            # 排序失败则保持原顺序
            pass

        results: List[Connections] = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            try:
                results.append(Connections(
                    id=item.get("id", ""),
                    name=item.get("name", ""),
                    scheme=item.get("scheme", "http"),
                    address=item.get("address", ""),
                    apiKey=item.get("apiKey", ""),
                ))
            except Exception:
                # 跳过无法解析的项
                continue

        return results
    except Exception as e:
        logger.exception("读取连接配置列表失败 错误=%s", str(e))
        return []


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

    # 读取现有列表（用于 upsert 以及继承 id/createdAt）
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            try:
                data: List[Dict] = json.load(f) or []
            except json.JSONDecodeError:
                data = []
    else:
        data = []

    now_iso = datetime.now(timezone.utc).isoformat()

    # 查找是否已存在同名记录
    existing_idx = -1
    existing_item: Dict = {}
    for idx, item in enumerate(data):
        if isinstance(item, dict) and item.get("name") == request.name:
            existing_idx = idx
            existing_item = item
            break

    # 如果存在，优先沿用其 id；若 id 非纯数字则生成新的数字 ID；否则新建数字 ID
    if existing_idx >= 0:
        old_id = str(existing_item.get("id", ""))
        record_id = old_id if old_id.isdigit() and old_id else generate_numeric_id()
    else:
        record_id = generate_numeric_id()
    created_at = existing_item.get("createdAt") if existing_idx >= 0 else now_iso
    updated_at = now_iso

    record = {
        "id": record_id,
        "name": request.name,
        "scheme": request.scheme,
        "address": request.address,
        "apiKey": request.apiKey or "",
        "createdAt": created_at,
        "updatedAt": updated_at,
    }

    try:
        # 保存前再次进行连接测试
        async with httpx.AsyncClient(timeout=CONNECTION_TEST_TIMEOUT) as client:
            save_headers: Dict[str, str] = {}
            if request.apiKey:
                save_headers["Authorization"] = f"Bearer {request.apiKey}"
            ok, _, msg = await test_connection(client, f"{request.scheme}://{request.address}", save_headers,
                                               CONNECTION_TEST_TIMEOUT)
            if not ok:
                logger.error("保存前连接测试未通过 name=%s 地址=%s 错误=%s", request.name, request.address, msg)
                return Response(success=False, message=f"保存失败: {msg}")

        logger.info(
            "保存连接配置 name=%s scheme=%s address=%s apiKey=%s -> %s",
            request.name, request.scheme, request.address, request.apiKey or "<none>", file_path,
        )

        # upsert by name
        if existing_idx >= 0:
            data[existing_idx] = record
        else:
            data.append(record)

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return Response(success=True, message="保存成功", data=record)
    except Exception as e:
        logger.exception("保存连接配置失败 错误=%s", str(e))
        return Response(success=False, message=f"保存失败: {str(e)}")


@router.post("/update", response_model=Response)
async def update_connection(request: UpdateConnectionRequest) -> Response:
    """编辑并更新已存在的连接配置。

    根据 `id` 查找并更新对应记录；更新前会进行连接测试验证。
    成功后写回 `DATA_CONFIG['clusters_file']`。
    """
    file_path = DATA_CONFIG["clusters_file"]
    if not os.path.exists(file_path):
        return Response(success=False, message="更新失败：数据文件不存在")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            try:
                data: List[Dict] = json.load(f) or []
            except json.JSONDecodeError:
                data = []

        # 定位待更新记录
        existing_idx = -1
        existing_item: Dict = {}
        for idx, item in enumerate(data):
            if isinstance(item, dict) and str(item.get("id", "")) == str(request.id):
                existing_idx = idx
                existing_item = item
                break

        if existing_idx < 0:
            logger.warning("更新失败 未找到指定id id=%s", request.id)
            return Response(success=False, message="更新失败：未找到指定记录")

        # 更新前进行连接测试
        headers: Dict[str, str] = {}
        if request.apiKey:
            headers["Authorization"] = f"Bearer {request.apiKey}"

        base_url = f"{request.scheme}://{request.address}".rstrip("/")
        try:
            async with httpx.AsyncClient(timeout=CONNECTION_TEST_TIMEOUT) as client:
                ok, _, msg = await test_connection(client, base_url, headers, CONNECTION_TEST_TIMEOUT)
                if not ok:
                    logger.error("更新前连接测试未通过 id=%s 错误=%s", request.id, msg)
                    return Response(success=False, message=f"更新失败: {msg}")
        except Exception as e:
            logger.exception("更新连接配置测试异常 错误=%s", str(e))
            return Response(success=False, message=f"更新失败: {str(e)}")

        now_iso = datetime.now(timezone.utc).isoformat()
        updated_record = {
            "id": str(existing_item.get("id", request.id)),
            "name": request.name,
            "scheme": request.scheme,
            "address": request.address,
            "apiKey": request.apiKey or "",
            "createdAt": existing_item.get("createdAt") or now_iso,
            "updatedAt": now_iso,
        }

        data[existing_idx] = updated_record

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return Response(success=True, message="更新成功", data=updated_record)
    except Exception as e:
        logger.exception("更新连接配置失败 错误=%s", str(e))
        return Response(success=False, message=f"更新失败: {str(e)}")
