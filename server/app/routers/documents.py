from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO
from app.db import get_db
from app.schemas.extraction import EditPayload, ExtractionRecord
from app.services import storage, citation

router = APIRouter(tags=["documents"])
FIELD_NAMES = list(ExtractionRecord.model_fields.keys())


def _record_data(doc: dict) -> dict:
    return {field: doc.get(field, "") for field in FIELD_NAMES}


@router.get("/extracted/{file_id}")
async def get_extracted(file_id: str):
    db = get_db()
    doc = await db.extractions.find_one({"fileId": file_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Extraction not found")
    record = ExtractionRecord(**_record_data(doc))
    return {"data": record.model_dump(), "citations": doc.get("citations", [])}


@router.get("/page/{file_id}/{page}")
async def get_page(file_id: str, page: int):
    db = get_db()
    file_doc = await db.files.find_one({"fileId": file_id})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    if not file_doc["filename"].lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Page preview only available for PDF files")

    image_bytes = await storage.render_page_image(file_doc["path"], page)
    return StreamingResponse(BytesIO(image_bytes), media_type="image/png")


@router.post("/edit")
async def save_edit(payload: EditPayload):
    db = get_db()
    doc = await db.extractions.find_one({"fileId": payload.fileId})
    if not doc:
        raise HTTPException(status_code=404, detail="Extraction not found")

    text_blocks = doc.get("textBlocks", [])
    citations = citation.update_single_field(payload.field, payload.value, text_blocks, doc.get("citations", []))
    await db.extractions.update_one(
        {"fileId": payload.fileId},
        {"$set": {payload.field: payload.value, "citations": citations}},
    )
    record_dict = _record_data({**doc, payload.field: payload.value})
    updated = ExtractionRecord(**record_dict)
    return {"data": updated.model_dump(), "citations": citations}

