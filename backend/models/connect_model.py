from typing import Optional
from pydantic import BaseModel, Field


class TestConnectionRequest(BaseModel):
    """"""
    name: str
    scheme: str = Field(default="http", pattern=r"^(http|https)$")
    address: str = Field(..., description="host:port 或 带路径的主机")
    apiKey: Optional[str] = Field(default=None, description="可选的 API Key")


class UpdateConnectionRequest(BaseModel):
    """更新连接配置请求体"""
    id: str
    name: str
    scheme: str = Field(default="http", pattern=r"^(http|https)$")
    address: str = Field(..., description="host:port 或 带路径的主机")
    apiKey: Optional[str] = Field(default=None, description="可选的 API Key")


class Connections(BaseModel):
    """"""
    id: str
    name: str
    scheme: str
    address: str
    apiKey: str


class ClassSchemaRequest(BaseModel):
    """请求某个 class 的 Schema 详情"""
    id: str
    name: str
    scheme: str = Field(default="http", pattern=r"^(http|https)$")
    address: str
    apiKey: Optional[str] = Field(default=None)
    className: str = Field(..., description="要查询的 class 名称")


class ClassObjectsRequest(BaseModel):
    """请求某个 class 下的对象列表"""
    id: str
    name: str
    scheme: str = Field(default="http", pattern=r"^(http|https)$")
    address: str
    apiKey: Optional[str] = Field(default=None)
    className: str = Field(..., description="要查询的 class 名称")
    limit: Optional[int] = Field(default=100, ge=1, le=1000, description="返回的最大对象数量")
    after: Optional[str] = Field(default=None, description="分页游标（上一次返回的最后一个对象的 id）")


class ObjectFilter(BaseModel):
    """前端传入的属性过滤条件"""
    property: str = Field(..., description="属性名")
    operator: str = Field(..., description="操作符: Equal | NotEqual | Like | NotLike")
    value: str = Field(..., description="字符串值")


class ClassObjectsSearchRequest(BaseModel):
    """GraphQL where 查询对象请求"""
    id: str
    name: str
    scheme: str = Field(default="http", pattern=r"^(http|https)$")
    address: str
    apiKey: Optional[str] = Field(default=None)
    className: str = Field(...)
    filters: Optional[list[ObjectFilter]] = Field(default=None, description="过滤条件数组")
    logic: str = Field(default="And", description="过滤条件之间的逻辑关系: And | Or")
    limit: Optional[int] = Field(default=100, ge=1, le=1000)
