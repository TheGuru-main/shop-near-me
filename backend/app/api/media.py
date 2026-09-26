from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.models.user import User
from app.services.b2_storage import upload_bytes

router = APIRouter(prefix="/media", tags=["media"])

MAX_IMAGE = 8 * 1024 * 1024  # 8MB; client should still compress
MAX_VIDEO = 25 * 1024 * 1024


@router.post("/upload", response_model=None)
@limiter.limit("30/minute")
async def upload_media(
    request: Request,
    file: UploadFile = File(...),
    kind: str = "product",
    user: User = Depends(get_current_user),
):
    data = await file.read()
    ctype = (file.content_type or "").lower()
    name = (file.filename or "file").lower()
    kind = (kind or "product").strip().lower()[:32]

    if ctype.startswith("image/") or name.endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
        if len(data) > MAX_IMAGE:
            raise HTTPException(status_code=400, detail="Image too large (max 2MB)")
        ext = "jpg"
        if "png" in ctype or name.endswith(".png"):
            ext = "png"
        elif "webp" in ctype or name.endswith(".webp"):
            ext = "webp"
        media_type = "image"
    elif ctype.startswith("video/") or name.endswith((".mp4", ".webm", ".mov")):
        if len(data) > MAX_VIDEO:
            raise HTTPException(status_code=400, detail="Video too large (max 25MB)")
        ext = "mp4" if ("mp4" in ctype or name.endswith(".mp4")) else "webm"
        media_type = "video"
    else:
        raise HTTPException(status_code=400, detail="Only image or video allowed")

    prefix = f"{kind}/{user.id}"
    try:
        url = upload_bytes(
            data,
            ctype or "application/octet-stream",
            prefix=prefix,
            ext=ext,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upload failed: {e}",
        ) from e

    return {"url": url, "media_type": media_type, "bytes": len(data)}
