from fastapi import APIRouter, Depends, HTTPException

from app.core.config import Settings, get_settings
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ollama import OllamaService, OllamaUnavailableError

router = APIRouter(prefix="/chat", tags=["chat"])


def get_ollama(settings: Settings = Depends(get_settings)) -> OllamaService:
    return OllamaService(settings)


@router.get("/health")
async def provider_health(service: OllamaService = Depends(get_ollama)) -> dict[str, object]:
    return await service.health()


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, service: OllamaService = Depends(get_ollama)) -> ChatResponse:
    try:
        return await service.chat(request)
    except OllamaUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
