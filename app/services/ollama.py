import time

import httpx

from app.core.config import Settings
from app.schemas.chat import ChatMessage, ChatRequest, ChatResponse


class OllamaUnavailableError(RuntimeError):
    pass


class OllamaService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def health(self) -> dict[str, object]:
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                response = await client.get(f"{self.settings.ollama_base_url}/api/tags")
                response.raise_for_status()
            models = [model.get("name") for model in response.json().get("models", [])]
            return {"status": "online", "model": self.settings.ollama_model, "models": models}
        except (httpx.HTTPError, ValueError):
            return {"status": "offline", "model": self.settings.ollama_model, "models": []}

    async def chat(self, request: ChatRequest) -> ChatResponse:
        started = time.perf_counter()
        model = request.model or self.settings.ollama_model
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a coding assistant. When providing code, always use Markdown fenced code blocks "
                        "with the language name, such as ```python. Keep code complete, runnable, and properly indented. "
                        "If the user asks for a file, provide one clearly named code block and briefly state the filename."
                    ),
                },
                *[message.model_dump() for message in request.messages],
            ],
            "stream": False,
            "options": {"temperature": request.temperature},
        }
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(f"{self.settings.ollama_base_url}/api/chat", json=payload)
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException as exc:
            raise OllamaUnavailableError(
                f"The {model} model timed out while generating a response. "
                "Try a smaller model or allow more memory for Ollama."
            ) from exc
        except httpx.ConnectError as exc:
            raise OllamaUnavailableError(
                "Ollama cannot be reached. Make sure Ollama is running and accessible."
            ) from exc
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:500] or "No provider details returned."
            if "process has terminated" in detail or "signal: terminated" in detail:
                raise OllamaUnavailableError(
                    f"The {model} model was stopped by the environment while loading. "
                    "This Codespace does not have enough memory for Gemma 4. "
                    "Select llama3.2:1b, or use a machine with more memory for Gemma."
                ) from exc
            raise OllamaUnavailableError(f"Ollama rejected the request: {detail}") from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise OllamaUnavailableError(
                f"Ollama failed while generating a response for {model}."
            ) from exc

        answer = data.get("message", {}).get("content", "").strip()
        if not answer:
            raise OllamaUnavailableError("Ollama returned an empty response.")
        return ChatResponse(
            message=ChatMessage(role="assistant", content=answer),
            model=model,
            provider="ollama",
            duration_ms=round((time.perf_counter() - started) * 1000),
        )
