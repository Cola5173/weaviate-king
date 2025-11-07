import logging
from typing import Dict

import httpx
from fastapi import APIRouter

from models.base import Response
from models.connect_model import ClassObjectsRequest, ClassObjectsSearchRequest, ObjectFilter
from config.business_setting import TIMEOUT_CONFIG

OBJECTS_QUERY_TIMEOUT = TIMEOUT_CONFIG["OBJECTS_QUERY_TIMEOUT"]

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/objects", tags=["objects"])


@router.post("/query", response_model=Response)
async def query_objects(request: ClassObjectsRequest) -> Response:
    """查询指定 className 下的对象列表。

    通过 Weaviate 的 /v1/objects 接口，使用 query 参数 `class`、`limit`、`after` 进行查询。
    """
    base_url = f"{request.scheme}://{request.address}".rstrip("/")
    objects_url = f"{base_url}/v1/objects"

    params = {
        "class": request.className,
    }
    if request.limit is not None:
        params["limit"] = request.limit
    if request.after:
        params["after"] = request.after

    headers: Dict[str, str] = {}
    if request.apiKey:
        headers["Authorization"] = f"Bearer {request.apiKey}"

    logger.info(
        "查询 objects 开始 id=%s name=%s class=%s url=%s 超时时间=%ss",
        request.id, request.name, request.className, objects_url, OBJECTS_QUERY_TIMEOUT,
    )

    try:
        async with httpx.AsyncClient(timeout=OBJECTS_QUERY_TIMEOUT) as client:
            try:
                resp = await client.get(objects_url, params=params, headers=headers)
                if resp.status_code == 200:
                    try:
                        data = resp.json()
                        logger.info(
                            "查询 objects 成功 id=%s class=%s count=%s",
                            request.id, request.className, len(data.get("objects", [])) if isinstance(data, dict) else "?",
                        )
                        return Response(
                            success=True,
                            message="查询对象成功",
                            data={
                                "id": request.id,
                                "name": request.name,
                                "address": f"{request.scheme}://{request.address}",
                                "className": request.className,
                                "result": data,
                            },
                        )
                    except Exception as e:
                        logger.error("解析 objects 响应失败 id=%s class=%s 错误=%s", request.id, request.className, str(e))
                        return Response(success=False, message=f"解析响应失败: {str(e)}")
                elif resp.status_code == 404:
                    return Response(success=False, message="未找到该 class 或对象不存在")
                elif resp.status_code == 401:
                    return Response(success=False, message="未授权，请检查 API Key")
                else:
                    return Response(success=False, message=f"查询失败: HTTP {resp.status_code}")
            except httpx.TimeoutException:
                return Response(success=False, message="查询超时，请稍后重试")
            except httpx.ConnectError as e:
                return Response(success=False, message=f"连接失败: {str(e)}")
    except Exception as e:
        logger.exception("查询 objects 出现未预期异常 id=%s class=%s 错误=%s", request.id, request.className, str(e))
        return Response(success=False, message=f"查询异常: {str(e)}")


def _to_where_operand(f: ObjectFilter):
    op = f.operator
    path = ["id"] if f.property == "id" else [f.property]
    if op == "Equal":
        return {"path": path, "operator": "Equal", "valueString": f.value}
    if op == "NotEqual":
        return {"operator": "Not", "operands": [
            {"path": path, "operator": "Equal", "valueString": f.value}
        ]}
    if op == "Like":
        return {"path": path, "operator": "Like", "valueString": f"*{f.value}*"}
    if op == "NotLike":
        return {"operator": "Not", "operands": [
            {"path": path, "operator": "Like", "valueString": f"*{f.value}*"}
        ]}
    # 默认 Equal
    return {"path": path, "operator": "Equal", "valueString": f.value}


def _to_graphql_operand_literal(f: ObjectFilter) -> str:
    import json

    path = ["id"] if f.property == "id" else [f.property]
    path_literal = json.dumps(path, ensure_ascii=False)

    operator = f.operator
    if operator == "Equal":
        value_literal = json.dumps(f.value, ensure_ascii=False)
        return f"{{ path: {path_literal} operator: Equal valueString: {value_literal} }}"
    if operator == "Like":
        value_literal = json.dumps(f"*{f.value}*", ensure_ascii=False)
        return f"{{ path: {path_literal} operator: Like valueString: {value_literal} }}"
    if operator == "NotEqual":
        inner = _to_graphql_operand_literal(ObjectFilter(property=f.property, operator="Equal", value=f.value))
        return f"{{ operator: Not operands: [{inner}] }}"
    if operator == "NotLike":
        inner = _to_graphql_operand_literal(ObjectFilter(property=f.property, operator="Like", value=f.value))
        return f"{{ operator: Not operands: [{inner}] }}"
    value_literal = json.dumps(f.value, ensure_ascii=False)
    return f"{{ path: {path_literal} operator: Equal valueString: {value_literal} }}"


def _normalize_logic(value: str | None) -> str:
    if isinstance(value, str) and value.strip().lower() == "or":
        return "Or"
    return "And"


def _build_graphql_where(filters: list[ObjectFilter], logic: str | None = "And") -> str | None:
    if not filters:
        return None
    operands = [_to_graphql_operand_literal(f) for f in filters]
    operands = [o for o in operands if o]
    if not operands:
        return None
    if len(operands) == 1:
        return operands[0]
    operator = _normalize_logic(logic)
    return "{ operator: " + operator + " operands: [" + ", ".join(operands) + "] }"


@router.post("/search", response_model=Response)
async def search_objects(request: ClassObjectsSearchRequest) -> Response:
    """基于 GraphQL where 的对象查询，支持属性过滤。"""
    base_url = f"{request.scheme}://{request.address}".rstrip("/")
    graphql_url = f"{base_url}/v1/graphql"

    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if request.apiKey:
        headers["Authorization"] = f"Bearer {request.apiKey}"

    schema_headers: Dict[str, str] = {}
    if request.apiKey:
        schema_headers["Authorization"] = f"Bearer {request.apiKey}"

    properties: list[str] = []

    logger.info("GraphQL objects 搜索 开始 class=%s url=%s", request.className, graphql_url)

    try:
        async with httpx.AsyncClient(timeout=OBJECTS_QUERY_TIMEOUT) as client:
            schema_url = f"{base_url}/v1/schema/{request.className}"
            try:
                schema_resp = await client.get(schema_url, headers=schema_headers)
                if schema_resp.status_code == 200:
                    schema_json = schema_resp.json()
                    raw_props = schema_json.get("properties", []) if isinstance(schema_json, dict) else []
                    properties = [p.get("name") for p in raw_props if isinstance(p, dict) and p.get("name")]
            except Exception as schema_error:
                logger.warning("获取 schema 属性失败 class=%s 错误=%s", request.className, str(schema_error))

            selection_parts = ["_additional { id vector creationTimeUnix lastUpdateTimeUnix }"]
            if properties:
                selection_parts.append(" ".join(properties))
            selection_body = " ".join(selection_parts)

            logic = _normalize_logic(getattr(request, "logic", "And"))
            where_literal = _build_graphql_where(request.filters or [], logic)
            limit_value = request.limit or 100
            where_fragment = f", where: {where_literal}" if where_literal else ""

            query = (
                "{ "
                "Get { "
                f"{request.className}(limit: {limit_value}{where_fragment}) "
                f"{{ {selection_body} }} "
                "} }"
            )

            body = {
                "query": query,
            }

            resp = await client.post(graphql_url, headers=headers, json=body)
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    raw_objects = (
                        data.get("data", {})
                        .get("Get", {})
                        .get(request.className, [])
                        if isinstance(data, dict)
                        else []
                    )

                    formatted_objects = []
                    for item in raw_objects:
                        if not isinstance(item, dict):
                            continue
                        additional = item.get("_additional", {}) if isinstance(item.get("_additional"), dict) else {}
                        props = {
                            key: value
                            for key, value in item.items()
                            if key not in {"_additional", "__typename"}
                        }
                        formatted_objects.append(
                            {
                                "id": additional.get("id"),
                                "properties": props,
                                "vector": additional.get("vector"),
                                "creationTimeUnix": additional.get("creationTimeUnix"),
                                "lastUpdateTimeUnix": additional.get("lastUpdateTimeUnix"),
                                "raw": item,
                            }
                        )

                    return Response(
                        success=True,
                        message="查询对象成功",
                        data={
                            "objects": formatted_objects,
                            "raw": data,
                        },
                    )
                except Exception as e:
                    return Response(success=False, message=f"解析响应失败: {str(e)}")
            elif resp.status_code == 401:
                return Response(success=False, message="未授权，请检查 API Key")
            else:
                return Response(success=False, message=f"查询失败: HTTP {resp.status_code}")
    except httpx.TimeoutException:
        return Response(success=False, message="查询超时，请稍后重试")
    except httpx.ConnectError as e:
        return Response(success=False, message=f"连接失败: {str(e)}")
    except Exception as e:
        logger.exception("GraphQL objects 搜索异常 class=%s 错误=%s", request.className, str(e))
        return Response(success=False, message=f"查询异常: {str(e)}")
