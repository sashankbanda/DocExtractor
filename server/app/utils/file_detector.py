from enum import Enum
from pathlib import Path
import fitz


class DocumentType(str, Enum):
    DIGITAL_PDF = "digital_pdf"
    SCANNED_PDF = "scanned_pdf"
    EXCEL = "excel"
    CSV = "csv"


def detect_type(path: str) -> DocumentType:
    ext = Path(path).suffix.lower()
    if ext in {".xls", ".xlsx"}:
        return DocumentType.EXCEL
    if ext == ".csv":
        return DocumentType.CSV
    # Default to PDF if not matched above
    doc = fitz.open(path)
    try:
        for page_index in range(len(doc)):
            text = doc.load_page(page_index).get_text().strip()
            if text:
                return DocumentType.DIGITAL_PDF
        return DocumentType.SCANNED_PDF
    finally:
        doc.close()

