from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.config import Settings, get_settings
from app.schemas.chat import UploadResponse

router = APIRouter(prefix="/uploads", tags=["uploads"])
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "text/plain", "application/pdf"}


@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> UploadResponse:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Supported files: images, PDF, or plain text.")
    content = await file.read()
    max_size = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=413, detail=f"Files must be smaller than {settings.max_upload_size_mb} MB.")
    suffix = Path(file.filename or "upload").suffix
    stored_name = f"{uuid4().hex}{suffix}"
    destination = Path(settings.upload_dir) / stored_name
    destination.write_bytes(content)
    return UploadResponse(
        id=stored_name,
        filename=file.filename or stored_name,
        content_type=file.content_type or "application/octet-stream",
        size=len(content),
        url=f"/storage/{stored_name}",
    )
