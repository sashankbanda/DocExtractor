import pandas as pd
import re
from typing import Dict, Any, List, Optional


# Field name mappings for common column header variations
FIELD_MAPPINGS = {
    "policy number": "policyNumber",
    "policy no": "policyNumber",
    "policy #": "policyNumber",
    "policy": "policyNumber",
    "insured": "insured",
    "insured name": "insured",
    "policyholder": "insured",
    "dba": "dba",
    "doing business as": "dba",
    "carrier": "carrier",
    "insurer": "carrier",
    "insurance company": "carrier",
    "lob": "lob",
    "line of business": "lob",
    "effective date": "effdate",
    "eff date": "effdate",
    "effdate": "effdate",
    "expiration date": "expdate",
    "exp date": "expdate",
    "expdate": "expdate",
    "claim number": "claimNumber",
    "claim no": "claimNumber",
    "claim #": "claimNumber",
    "claim": "claimNumber",
    "claimant": "claimant",
    "claim status": "claimStatus",
    "status": "claimStatus",
    "date of loss": "dateOfLoss",
    "loss date": "dateOfLoss",
    "dol": "dateOfLoss",
    "reported date": "reportedDate",
    "closed date": "closedDate",
    "valued date": "valuedDate",
    "loss description": "lossDescription",
    "description": "lossDescription",
    "loss location": "lossLocation",
    "location": "lossLocation",
    "state": "state",
    "city": "city",
    "medical paid": "medicalPaid",
    "indemnity paid": "indemnityPaid",
    "expenses paid": "expensesPaid",
    "medical reserves": "medicalReserves",
    "indemnity reserves": "indemnityReserves",
    "expenses reserves": "expensesReserves",
    "total paid": "totalPaid",
    "total reserve": "totalReserve",
    "total incurred": "totalIncurredSource",
    "recoveries": "recoveries",
    "total medical": "totalMedical",
    "total indemnity": "totalIndemnity",
    "total expenses": "totalExpenses",
    "currency": "inferredCurrency",
}


def _normalize_column_name(col: str) -> str:
    """Normalize column name for matching"""
    return re.sub(r"[^a-z0-9\s]", "", str(col).lower().strip())


def _map_column_to_field(col_name: str) -> Optional[str]:
    """Map a column name to a field name"""
    normalized = _normalize_column_name(col_name)
    
    # Direct match
    if normalized in FIELD_MAPPINGS:
        return FIELD_MAPPINGS[normalized]
    
    # Partial match for series fields (e.g., "medical paid 2", "indemnity paid 3")
    for key, field in FIELD_MAPPINGS.items():
        if key in normalized:
            # Check for numbered variants
            match = re.search(rf"{re.escape(key)}\s*(\d+)", normalized)
            if match:
                num = int(match.group(1))
                if num > 1:
                    return f"{field}{num}"
            return field
    
    return None


def read_table(path: str) -> Dict[str, Any]:
    try:
        if path.lower().endswith(".csv"):
            df = pd.read_csv(path)
            sheet_name = "Sheet1"  # CSV doesn't have sheet names
        else:
            # For Excel, try to get sheet name
            excel_file = pd.ExcelFile(path)
            sheet_name = excel_file.sheet_names[0] if excel_file.sheet_names else "Sheet1"
            df = pd.read_excel(path, sheet_name=sheet_name)
    except Exception as exc:
        raise ValueError(f"Unable to parse spreadsheet: {exc}") from exc

    df = df.fillna("")
    blocks: List[Dict[str, Any]] = []
    text_segments: List[str] = []
    
    # Map column headers to field names
    column_to_field: Dict[int, Optional[str]] = {}
    for col_idx, col_name in enumerate(df.columns):
        field_name = _map_column_to_field(str(col_name))
        column_to_field[col_idx] = field_name
        # Store column header as a block
        blocks.append({
            "text": str(col_name),
            "page": 1,
            "bounds": {
                "x": float(col_idx * 100),
                "y": 0.0,
                "width": 100.0,
                "height": 20.0,
            },
        })

    # Process data rows
    for row_idx, (_, row) in enumerate(df.iterrows()):
        row_values = [str(value) if pd.notna(value) else "" for value in row]
        text_segments.append(" ".join(row_values))
        
        for col_idx, value in enumerate(row_values):
            if not value or str(value).strip() == "" or str(value).lower() == "nan":
                continue
            
            value_str = str(value).strip()
            field_name = column_to_field.get(col_idx)
            
            blocks.append(
                {
                    "text": value_str,
                    "page": 1,
                    "bounds": {
                        "x": float(col_idx * 100),
                        "y": float((row_idx + 1) * 20),  # +1 to account for header row
                        "width": 100.0,
                        "height": 20.0,
                    },
                    "field": field_name,  # Store field mapping for easier extraction
                }
            )

    return {
        "blocks": blocks,
        "full_text": "\n".join(text_segments),
        "sheet_name": sheet_name,
        "column_mappings": {col: field for col, field in enumerate(column_to_field.values()) if field}
    }

