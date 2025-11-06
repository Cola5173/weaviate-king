from typing import Optional, Any
from pydantic import BaseModel


class Response(BaseModel):
    """""响应模型"""
    success: bool
    message: str
    data: Optional[Any] = None
