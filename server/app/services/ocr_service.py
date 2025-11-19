from functools import lru_cache
from typing import List, Dict, Any
import easyocr
import fitz
import logging

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_reader():
    return easyocr.Reader(["en"], gpu=False)


def ocr_pages(path: str, pages: List[int]) -> Dict[str, Any]:
    if not pages:
        return {"blocks": [], "full_text": ""}

    try:
        doc = fitz.open(path)
    except Exception as exc:
        logger.error("Unable to open PDF for OCR: %s", exc)
        return {"blocks": [], "full_text": ""}

    reader = get_reader()
    try:
        blocks: List[Dict[str, Any]] = []
        text_segments: List[str] = []
        for page_number in pages:
            if page_number < 1 or page_number > len(doc):
                continue
            page = doc.load_page(page_number - 1)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            image_bytes = pix.tobytes("png")
            try:
                results = reader.readtext(image_bytes, detail=1, paragraph=False)
            except Exception as exc:
                logger.warning("OCR failed on page %s: %s", page_number, exc)
                continue
            for bbox, text, _ in results:
                if not text.strip():
                    continue
                xs = [point[0] for point in bbox]
                ys = [point[1] for point in bbox]
                block = {
                    "text": text,
                    "page": page_number,
                    "bounds": {
                        "x": float(min(xs)),
                        "y": float(min(ys)),
                        "width": float(max(xs) - min(xs)),
                        "height": float(max(ys) - min(ys)),
                    },
                }
                blocks.append(block)
                text_segments.append(text)

        return {"blocks": blocks, "full_text": " ".join(text_segments)}
    finally:
        doc.close()

