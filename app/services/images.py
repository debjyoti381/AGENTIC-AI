import base64
from urllib.parse import quote

import httpx

from app.core.config import Settings
from app.schemas.chat import ImageGenerationRequest, ImageGenerationResponse


class ImageService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def generate(self, request: ImageGenerationRequest) -> ImageGenerationResponse:
        if self.settings.image_provider == "pollinations":
            prompt = quote(request.prompt, safe="")
            width, height = request.size.split("x")
            url = (
                f"https://image.pollinations.ai/prompt/{prompt}"
                f"?width={width}&height={height}&nologo=true&model=flux"
            )
            return ImageGenerationResponse(status="completed", prompt=request.prompt, url=url)

        if not self.settings.image_provider_url:
            return ImageGenerationResponse(
                status="unavailable",
                prompt=request.prompt,
                message=(
                    "Image generation is not configured. Set IMAGE_PROVIDER=pollinations "
                    "or configure IMAGE_PROVIDER_URL and IMAGE_PROVIDER_API_KEY."
                ),
            )

        headers = {}
        if self.settings.image_provider_api_key:
            headers["Authorization"] = f"Bearer {self.settings.image_provider_api_key}"
        payload = {"prompt": request.prompt, "size": request.size, "n": 1}
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(self.settings.image_provider_url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        image = data.get("data", [{}])[0]
        if image.get("url"):
            return ImageGenerationResponse(status="completed", prompt=request.prompt, url=image["url"])
        if image.get("b64_json"):
            return ImageGenerationResponse(
                status="completed",
                prompt=request.prompt,
                url=f"data:image/png;base64,{base64.b64encode(base64.b64decode(image['b64_json'])).decode()}",
            )
        return ImageGenerationResponse(status="unavailable", prompt=request.prompt, message="Provider returned no image.")
