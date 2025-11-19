import logging
import re
from datetime import datetime
from typing import Dict, List, Tuple
from app.schemas.extraction import ExtractionRecord
from app.db import get_db
from app.services import pdf_service, excel_service, ocr_service, citation
from app.utils.file_detector import detect_type, DocumentType
from app.utils.llm_fallback import infer_with_llama

logger = logging.getLogger(__name__)

DATE_FORMATS = [
    "%Y-%m-%d",
    "%m/%d/%Y",
    "%m/%d/%y",
    "%d/%m/%Y",
    "%d-%b-%Y",
    "%b %d %Y",
]

TEXT_PATTERNS = {
    "policyNumber": r"(?:policy(?:\s+number|\s+no\.?)?[:\s#-]*)([A-Z0-9\-\/]+)",
    "claimNumber": r"(?:claim(?:\s+number|\s+no\.?)?[:\s#-]*)([A-Z0-9\-\/]+)",
    "lob": r"(?:line\s+of\s+business|lob)[:\s]+([A-Za-z &/]+)",
    "insured": r"(?:insured|policyholder)[:\s]+([A-Za-z0-9 .,&'-]+)",
    "dba": r"(?:dba|doing\s+business\s+as)[:\s]+([A-Za-z0-9 .,&'-]+)",
    "carrier": r"(?:carrier|insurer)[:\s]+([A-Za-z0-9 .,&'-]+)",
    "valuedDate": r"(?:valued\s+date)[:\s]+([0-9/.\-]+)",
    "claimant": r"(?:claimant)[:\s]+([A-Za-z0-9 .,&'-]+)",
    "claimStatus": r"(?:claim\s+status)[:\s]+([A-Za-z ]+)",
    "closedDate": r"(?:closed\s+date)[:\s]+([0-9/.\-]+)",
    "reportedDate": r"(?:reported\s+date)[:\s]+([0-9/.\-]+)",
    "dateOfLoss": r"(?:date\s+of\s+loss|loss\s+date)[:\s]+([0-9/.\-]+)",
    "lossDescription": r"(?:loss\s+description)[:\s-]+([\w\s,.()-]{10,200})",
    "lossLocation": r"(?:loss\s+location)[:\s]+([A-Za-z0-9 .,&'-]+)",
    "state": r"(?:state)[:\s]+([A-Za-z ]{2,})",
    "city": r"(?:city)[:\s]+([A-Za-z .'-]+)",
    "effdate": r"(?:effective\s+date|eff\.?\s*date)[:\s]+([0-9/.\-]+)",
    "expdate": r"(?:expiration\s+date|exp\.?\s*date)[:\s]+([0-9/.\-]+)",
    "inferredCurrency": r"(?:currency)[:\s]+([A-Za-z$]{1,5})",
    "pageNumber": r"(?:page\s+number)[:\s#-]*([0-9]+)",
    "sheetName": r"(?:sheet\s+name)[:\s-]+([A-Za-z0-9 _-]+)",
}

DATE_FIELDS = {"valuedDate", "closedDate", "reportedDate", "dateOfLoss", "effdate", "expdate"}

SERIES_PATTERNS = {
    "medicalPaid": {"label": "medical paid", "count": 3},
    "medicalReserves": {"label": "medical reserves", "count": 3},
    "indemnityPaid": {"label": "indemnity paid", "count": 6},
    "indemnityReserves": {"label": "indemnity reserves", "count": 6},
    "expensesPaid": {"label": "expenses paid", "count": 6},
    "expensesReserves": {"label": "expenses reserves", "count": 6},
    "totalPaid": {"label": "total paid", "count": 2},
    "totalReserve": {"label": "total reserve", "count": 2},
    "totalIncurredSource": {"label": "total incurred", "count": 1},
    "recoveries": {"label": "recoveries", "count": 6},
    "totalMedical": {"label": "total medical", "count": 1},
    "totalIndemnity": {"label": "total indemnity", "count": 1},
    "totalExpenses": {"label": "total expenses", "count": 1},
}

CRITICAL_FIELDS = ["policyNumber", "claimNumber", "insured", "carrier", "dateOfLoss"]


def _normalize_date(value: str) -> str:
    cleaned = value.strip().replace(".", "/").replace("-", "/")
    for fmt in DATE_FORMATS:
        try:
            dt = datetime.strptime(cleaned, fmt.replace("-", "/"))
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return value.strip()


def normalize_text(text: str) -> str:
    lowered = text.lower()
    lowered = re.sub(r"[^a-z0-9/\-\s.,]", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered)
    return lowered.strip()


def _clean_amount(value: str) -> str:
    cleaned = re.sub(r"[^0-9.\-]", "", value)
    return cleaned.strip()


def _extract_series(source_text: str, base_field: str, meta: Dict[str, int]) -> Dict[str, str]:
    label = meta["label"]
    count = meta["count"]
    pattern = re.compile(rf"{label.replace(' ', r'[\s_]*')}[:\s$]*([\d,.\-]+)", re.IGNORECASE)
    matches = pattern.findall(source_text)
    result = {}
    for idx, match in enumerate(matches[:count]):
        field_name = base_field if idx == 0 else f"{base_field}{idx + 1}"
        result[field_name] = _clean_amount(match)
    return result


def rule_based_extract(raw_text: str) -> Dict[str, str]:
    extracted: Dict[str, str] = {}
    for field, pattern in TEXT_PATTERNS.items():
        match = re.search(pattern, raw_text, re.IGNORECASE | re.MULTILINE | re.DOTALL)
        if match:
            value = match.group(1).strip()
            if field in DATE_FIELDS:
                value = _normalize_date(value)
            extracted[field] = value

    for base_field, meta in SERIES_PATTERNS.items():
        extracted.update(_extract_series(raw_text, base_field, meta))

    return extracted


def _coverage(fields: Dict[str, str]) -> float:
    if not CRITICAL_FIELDS:
        return 1.0
    hits = sum(1 for field in CRITICAL_FIELDS if fields.get(field))
    return hits / len(CRITICAL_FIELDS)


async def run_extraction(file_doc: Dict) -> Tuple[Dict, List[Dict]]:
    file_path = file_doc["path"]
    file_id = file_doc["fileId"]
    doc_type = detect_type(file_path)

    text_blocks: List[Dict] = []
    full_text_segments: List[str] = []

    if doc_type in {DocumentType.DIGITAL_PDF, DocumentType.SCANNED_PDF}:
        pdf_result = pdf_service.extract_text_with_boxes(file_path)
        text_blocks.extend(pdf_result.blocks)
        full_text_segments.append(pdf_result.full_text)
        if pdf_result.empty_pages:
            ocr_result = ocr_service.ocr_pages(file_path, pdf_result.empty_pages)
            text_blocks.extend(ocr_result["blocks"])
            full_text_segments.append(ocr_result["full_text"])
    elif doc_type in {DocumentType.EXCEL, DocumentType.CSV}:
        table_result = excel_service.read_table(file_path)
        text_blocks.extend(table_result["blocks"])
        full_text_segments.append(table_result["full_text"])
    else:
        raise ValueError("Unsupported document type")

    raw_text = " ".join(segment for segment in full_text_segments if segment)
    normalized = normalize_text(raw_text)
    field_values = rule_based_extract(raw_text)
    coverage = _coverage(field_values)

    if coverage < 0.65:
        missing = [field for field in ExtractionRecord.model_fields if field not in field_values and field != "fileId"]
        llm_suggestions = await infer_with_llama(normalized, missing)
        for key, value in llm_suggestions.items():
            if key == "fileId":
                continue
            if value and not field_values.get(key):
                field_values[key] = value.strip()

    record = ExtractionRecord(fileId=file_id, **field_values)
    record_data = record.model_dump()
    citations = citation.map_fields_to_boxes(record_data, text_blocks)

    db = get_db()
    payload = {
        **record_data,
        "citations": citations,
        "textBlocks": text_blocks,
        "normalizedText": normalized,
        "documentType": doc_type.value,
    }
    await db.extractions.update_one({"fileId": file_id}, {"$set": payload}, upsert=True)
    await db.files.update_one({"fileId": file_id}, {"$set": {"status": "extracted"}})

    return record_data, citations

