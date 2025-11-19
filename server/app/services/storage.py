from pathlib import Path
import fitz
from fastapi import UploadFile, HTTPException
from app.config import get_settings

settings = get_settings()
BASE_DIR = Path(settings.uploads_dir)
BASE_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 20 * 1024 * 1024


async def save_file(file_id: str, upload: UploadFile) -> str:
    target_dir = BASE_DIR / file_id
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / upload.filename
    data = await upload.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 20MB limit")
    target_path.write_bytes(data)
    return str(target_path)


async def render_page_image(file_path: str, page_number: int):
    doc = fitz.open(file_path)
    try:
        if page_number < 1 or page_number > len(doc):
            raise HTTPException(status_code=404, detail="Page not found")
        page = doc.load_page(page_number - 1)
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        return pix.tobytes("png")
    finally:
        doc.close()

