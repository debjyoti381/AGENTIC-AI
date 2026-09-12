# Agentic AI

A local-first multimodal AI workspace built with React, FastAPI, and Ollama.

## Structure

- `app/` FastAPI application, API routes, schemas, provider services, and settings
- `src/` React workspace UI and API client
- `storage/uploads/` local upload storage (ignored by git)

## Run locally

```bash
cp .env.example .env
python -m pip install -e .
npm install
```

Start Ollama and confirm the model exists:

```bash
ollama serve
ollama pull gemma4
```

In separate terminals:

```bash
uvicorn app.main:app --reload --port 8000
npm run dev
```

Open `http://localhost:5173`.

## Image generation

Gemma is a text model, so image generation uses a separate provider adapter. The default `IMAGE_PROVIDER=pollinations` returns an image URL without an API key, which is useful for development. For production, set `IMAGE_PROVIDER=custom` and configure `IMAGE_PROVIDER_URL` and `IMAGE_PROVIDER_API_KEY` for an OpenAI-compatible image endpoint.
