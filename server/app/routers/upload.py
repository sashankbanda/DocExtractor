from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from uuid import uuid4
from app.services import storage
from app.db import get_db

router = APIRouter(prefix="/upload", tags=["upload"])

SUPPORTED_EXT = {"pdf", "xls", "xlsx", "csv"}


@router.post("")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename missing")

    ext = file.filename.split(".")[-1].lower()
    if ext not in SUPPORTED_EXT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    file_id = str(uuid4())

    try:
        saved_path = await storage.save_file(file_id, file)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to store file: {exc}") from exc

    db = get_db()
    await db.files.update_one(
        {"fileId": file_id},
        {
            "$set": {
                "fileId": file_id,
                "filename": file.filename,
                "path": saved_path,
                "status": "uploaded",
                "uploadedAt": datetime.utcnow(),
            }
        },
        upsert=True,
    )

    return {"fileId": file_id, "filename": file.filename, "status": "uploaded"}

