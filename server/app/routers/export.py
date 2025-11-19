from io import BytesIO
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
import pandas as pd
from app.db import get_db
from app.schemas.extraction import ExtractionRecord

router = APIRouter(tags=["export"])


@router.get("/export/{file_id}")
async def export_file(file_id: str, format: str = "json"):
    db = get_db()
    doc = await db.extractions.find_one({"fileId": file_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Extraction not found")

    record_input = {field: doc.get(field, "") for field in ExtractionRecord.model_fields.keys()}
    payload = ExtractionRecord(**record_input).model_dump()
    if format == "json":
        return JSONResponse({"data": payload, "citations": doc.get("citations", [])})

    if format in {"xlsx", "xls"}:
        df = pd.DataFrame([payload])
        buffer = BytesIO()
        df.to_excel(buffer, index=False)
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=extraction_{file_id}.xlsx"},
        )

    raise HTTPException(status_code=400, detail="Unsupported format")

