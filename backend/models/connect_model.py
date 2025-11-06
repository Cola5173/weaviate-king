from typing import Optional
from pydantic import BaseModel, Field


class TestConnectionRequest(BaseModel):
    """"""
    name: str
    scheme: str = Field(default="http", pattern=r"^(http|https)$")
    address: str = Field(..., description="host:port 或 带路径的主机")
    apiKey: Optional[str] = Field(default=None, description="可选的 API Key")
