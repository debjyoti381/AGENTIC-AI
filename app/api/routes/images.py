from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.schemas.chat import ImageGenerationRequest, ImageGenerationResponse
from app.services.images import ImageService

router = APIRouter(prefix="/images", tags=["images"])


@router.post("/generate", response_model=ImageGenerationResponse)
async def generate_image(
    request: ImageGenerationRequest,
    settings: Settings = Depends(get_settings),
) -> ImageGenerationResponse:
    return await ImageService(settings).generate(request)
