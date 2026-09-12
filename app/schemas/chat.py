from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(min_length=1, max_length=100_000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=100)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    temperature: float = Field(default=0.7, ge=0, le=2)


class ChatResponse(BaseModel):
    message: ChatMessage
    model: str
    provider: str
    duration_ms: int


class UploadResponse(BaseModel):
    id: str
    filename: str
    content_type: str
    size: int
    url: str


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=4_000)
    size: str = Field(default="1024x1024", pattern=r"^\d{3,4}x\d{3,4}$")


class ImageGenerationResponse(BaseModel):
    status: Literal["completed", "unavailable"]
    prompt: str
    url: str | None = None
    message: str | None = None
