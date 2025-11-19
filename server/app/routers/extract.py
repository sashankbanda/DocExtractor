from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import get_db
from app.services import extractor
import traceback

router = APIRouter(tags=["extract"])


class ExtractPayload(BaseModel):
    fileId: str


@router.post("/extract")
async def start_extraction(payload: ExtractPayload):
    db = get_db()
    file_doc = await db.files.find_one({"fileId": payload.fileId})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    await db.files.update_one({"fileId": payload.fileId}, {"$set": {"status": "extracting"}})
    try:
        record, citations = await extractor.run_extraction(file_doc)
    except Exception as exc:
        await db.files.update_one(
            {"fileId": payload.fileId},
            {"$set": {"status": "failed", "error": str(exc), "traceback": traceback.format_exc()}},
        )
        raise HTTPException(status_code=500, detail=f"Extraction failed: {exc}") from exc

    return {"data": record, "citations": citations}

