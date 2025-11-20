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
    # Policy number - more specific patterns
    "policyNumber": r"(?:policy(?:\s+number|\s+no\.?)?[:\s#-]*)([A-Z0-9\-\/]{1,30})(?=\s|$|[,\n]|\.|;|Policy|Claim|Insured|Carrier)",
    # Claim number
    "claimNumber": r"(?:claim(?:\s+number|\s+no\.?)?[:\s#-]*)([A-Z0-9\-\/]{1,30})(?=\s|$|[,\n]|\.|;|Policy|Claim|Insured)",
    # Line of business - stop at common delimiters
    "lob": r"(?:line\s+of\s+business|lob|pac)[:\s]+([A-Za-z &/\-]{1,60})(?=\s|$|[,\n]|Policy|Claim|Insured|Carrier|MCC)",
    # Insured - more restrictive
    "insured": r"(?:insured|policyholder)[:\s]+([A-Za-z0-9 .,&'-]{1,80})(?=\s|$|[,\n]|Division|PAC|MCC|Policy|Claim)",
    # DBA
    "dba": r"(?:dba|doing\s+business\s+as)[:\s]+([A-Za-z0-9 .,&'-]{1,80})(?=\s|$|[,\n]|Policy|Claim)",
    # Carrier
    "carrier": r"(?:carrier|insurer)[:\s]+([A-Za-z0-9 .,&'-]{1,80})(?=\s|$|[,\n]|Policy|Claim|Insured)",
    # Dates - more specific
    "valuedDate": r"(?:valued\s+date|valuation\s+date)[:\s]+([0-9]{1,2}[/\-\.][0-9]{1,2}[/\-\.][0-9]{2,4})(?=\s|$|[,\n])",
    # Claimant - stop at status or other claim fields
    "claimant": r"(?:claimant)[:\s]+([A-Za-z0-9 .,&'-]{1,50})(?=\s|$|[,\n]|Sts|Status|Gross|Paid|Outstanding)",
    # Claim status - single letter or word
    "claimStatus": r"(?:claim\s+status|status|sts)[:\s]+([A-Za-z0-9]{1,10})(?=\s|$|[,\n]|Gross|Paid|Outstanding)",
    # Dates
    "closedDate": r"(?:closed\s+date|close\s+date)[:\s]+([0-9]{1,2}[/\-\.][0-9]{1,2}[/\-\.][0-9]{2,4})(?=\s|$|[,\n])",
    "reportedDate": r"(?:reported\s+date|report\s+date)[:\s]+([0-9]{1,2}[/\-\.][0-9]{1,2}[/\-\.][0-9]{2,4})(?=\s|$|[,\n])",
    "dateOfLoss": r"(?:date\s+of\s+loss|loss\s+date|dol|event\s+date)[:\s]+([0-9]{1,2}[/\-\.][0-9]{1,2}[/\-\.][0-9]{2,4})(?=\s|$|[,\n])",
    # Loss description - stop at Claimant or Status
    "lossDescription": r"(?:loss\s+description|desc|description)[:\s-]+([\w\s,.()-]{10,120})(?=\s|$|[,\n]|Claimant|Sts|Status|Gross)",
    # Location
    "lossLocation": r"(?:loss\s+location|location)[:\s]+([A-Za-z0-9 .,&'-]{1,80})(?=\s|$|[,\n]|State|City|Claimant)",
    # State - 2-3 letter codes only
    "state": r"(?:^|\s)(?:state)[:\s]+([A-Z]{2,3})(?=\s|$|[,\n]|City|Claimant|Desc|Description)",
    # City
    "city": r"(?:city)[:\s]+([A-Za-z .'-]{1,50})(?=\s|$|[,\n]|State|Claimant|Desc)",
    # Policy dates
    "effdate": r"(?:effective\s+date|eff\.?\s*date)[:\s]+([0-9]{1,2}[/\-\.][0-9]{1,2}[/\-\.][0-9]{2,4})(?=\s|$|[,\n]|Exp|Expiration)",
    "expdate": r"(?:expiration\s+date|exp\.?\s*date|exp\s+date)[:\s]+([0-9]{1,2}[/\-\.][0-9]{1,2}[/\-\.][0-9]{2,4})(?=\s|$|[,\n]|Policy|Claim)",
    # Currency
    "inferredCurrency": r"(?:currency)[:\s]+([A-Z$]{1,5})(?=\s|$|[,\n])",
    # Metadata
    "pageNumber": r"(?:page\s+number|page)[:\s#-]*([0-9]+)(?=\s|$|[,\n])",
    "sheetName": r"(?:sheet\s+name|sheet)[:\s-]+([A-Za-z0-9 _-]{1,50})(?=\s|$|[,\n])",
}

DATE_FIELDS = {"valuedDate", "closedDate", "reportedDate", "dateOfLoss", "effdate", "expdate"}

SERIES_PATTERNS = {
    "medicalPaid": {"label": "medical paid", "count": 3, "variants": ["med paid", "medical pd", "med pd"]},
    "medicalReserves": {"label": "medical reserves", "count": 3, "variants": ["med reserves", "medical res", "med res"]},
    "indemnityPaid": {"label": "indemnity paid", "count": 6, "variants": ["ind paid", "indemnity pd", "ind pd", "indem paid"]},
    "indemnityReserves": {"label": "indemnity reserves", "count": 6, "variants": ["ind reserves", "indemnity res", "ind res", "indem reserves"]},
    "expensesPaid": {"label": "expenses paid", "count": 6, "variants": ["exp paid", "expenses pd", "exp pd", "expense paid"]},
    "expensesReserves": {"label": "expenses reserves", "count": 6, "variants": ["exp reserves", "expenses res", "exp res", "expense reserves"]},
    "totalPaid": {"label": "total paid", "count": 2, "variants": ["tot paid", "total pd"]},
    "totalReserve": {"label": "total reserve", "count": 2, "variants": ["tot reserve", "total res", "total reserves"]},
    "totalIncurredSource": {"label": "total incurred", "count": 1, "variants": ["tot incurred", "total incur", "incurred"]},
    "recoveries": {"label": "recoveries", "count": 6, "variants": ["recovery", "recovered"]},
    "totalMedical": {"label": "total medical", "count": 1, "variants": ["tot medical", "total med"]},
    "totalIndemnity": {"label": "total indemnity", "count": 1, "variants": ["tot indemnity", "total ind"]},
    "totalExpenses": {"label": "total expenses", "count": 1, "variants": ["tot expenses", "total exp"]},
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


def _extract_series(source_text: str, base_field: str, meta: Dict) -> Dict[str, str]:
    label = meta["label"]
    count = meta["count"]
    variants = meta.get("variants", [])
    result = {}
    
    # Build pattern with all variants
    all_labels = [label] + variants
    patterns = []
    for lbl in all_labels:
        label_regex = re.escape(lbl).replace(r'\ ', r'[\s_\-]*')
        # Match with optional number suffix (e.g., "medical paid 2", "medical paid2")
        patterns.append(rf"{label_regex}[\s_]*(\d+)?[:\s$]*([\d,.\-]+)")
        # Also match without number (for first item)
        patterns.append(rf"{label_regex}[:\s$]+([\d,.\-]+)")
    
    # Try to find matches with numbered variants first
    for pattern_str in patterns:
        pattern = re.compile(pattern_str, re.IGNORECASE)
        matches = pattern.findall(source_text)
        for match in matches:
            if len(match) == 2:  # Has number and value
                num_str, value = match
                if num_str:
                    num = int(num_str)
                    if num > 1:
                        field_name = f"{base_field}{num}"
                    else:
                        field_name = base_field
                else:
                    field_name = base_field
            else:  # Just value
                value = match[0] if match else ""
                field_name = base_field
            
            if value and not result.get(field_name):
                result[field_name] = _clean_amount(value)
    
    # Fallback: simple pattern matching for sequential extraction
    if not result:
        label_regex = label.replace(' ', r'[\s_\-]*')
        pattern = re.compile(rf"{label_regex}[\s_]*(\d+)?[:\s$]*([\d,.\-]+)", re.IGNORECASE)
        matches = pattern.findall(source_text)
        for match in matches[:count * 2]:  # Get more matches to account for variants
            if len(match) == 2:
                num_str, value = match
                if num_str:
                    num = int(num_str)
                    if num > 1 and num <= count:
                        field_name = f"{base_field}{num}"
                    else:
                        field_name = base_field
                else:
                    field_name = base_field
            else:
                continue
            
            if value and not result.get(field_name):
                result[field_name] = _clean_amount(value)
    
    return result


def rule_based_extract(raw_text: str) -> Dict[str, str]:
    extracted: Dict[str, str] = {}
    
    # Split text into sentences/lines for better context
    # This helps prevent matching across unrelated sections
    text_lines = re.split(r'[.\n]', raw_text)
    
    for field, pattern in TEXT_PATTERNS.items():
        # Try to find match in each line first (more accurate)
        best_match = None
        best_line = None
        
        for line in text_lines:
            if not line.strip():
                continue
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                # Prefer shorter matches (less likely to be concatenated)
                if best_match is None or len(match.group(1)) < len(best_match.group(1)):
                    best_match = match
                    best_line = line
        
        # Fallback to full text search if no line match found
        if best_match is None:
            best_match = re.search(pattern, raw_text, re.IGNORECASE | re.MULTILINE)
        
        if best_match:
            value = best_match.group(1).strip()
            # Clean up value - remove extra whitespace
            value = re.sub(r'\s+', ' ', value)
            # Remove trailing punctuation that might have been captured
            value = re.sub(r'[.,;:]+$', '', value)
            
            # For certain fields, apply strict length limits
            max_lengths = {
                "policyNumber": 30,
                "claimNumber": 30,
                "state": 3,
                "claimStatus": 10,
                "city": 50,
                "lob": 60,
                "claimant": 50,
            }
            if field in max_lengths:
                value = value[:max_lengths[field]]
            
            # Validate state codes
            if field == "state" and len(value) > 3:
                continue  # Skip invalid state codes
            
            if field in DATE_FIELDS:
                value = _normalize_date(value)
            
            if value and value != "":
                extracted[field] = value

    for base_field, meta in SERIES_PATTERNS.items():
        extracted.update(_extract_series(raw_text, base_field, meta))

    return extracted


def _coverage(fields: Dict[str, str]) -> float:
    if not CRITICAL_FIELDS:
        return 1.0
    hits = sum(1 for field in CRITICAL_FIELDS if fields.get(field))
    return hits / len(CRITICAL_FIELDS) if CRITICAL_FIELDS else 1.0


async def run_extraction(file_doc: Dict) -> Tuple[Dict, List[Dict]]:
    file_path = file_doc["path"]
    file_id = file_doc["fileId"]
    doc_type = detect_type(file_path)

    text_blocks: List[Dict] = []
    full_text_segments: List[str] = []
    structured_field_values: Dict[str, str] = {}  # For Excel/CSV structured extraction
    table_result = None

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
        # Extract sheet name if available
        if "sheet_name" in table_result:
            structured_field_values["sheetName"] = table_result["sheet_name"]
        # Extract data from column mappings for structured extraction
        for block in table_result["blocks"]:
            if "field" in block and block.get("field") and block.get("text"):
                field_name = block["field"]
                value = str(block["text"]).strip()
                if value and value != "" and not structured_field_values.get(field_name):
                    structured_field_values[field_name] = value
    else:
        raise ValueError("Unsupported document type")

    raw_text = " ".join(segment for segment in full_text_segments if segment)
    normalized = normalize_text(raw_text)
    field_values = rule_based_extract(raw_text)
    
    # Merge structured extraction results (Excel/CSV column mappings take precedence)
    for key, value in structured_field_values.items():
        if value and value != "":
            field_values[key] = value
    
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

