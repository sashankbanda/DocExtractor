from typing import Dict, Any, List, Optional
from difflib import SequenceMatcher


def _best_block(value: str, blocks: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not value:
        return None
    target = value.lower()
    best = None
    best_score = 0.0

    for block in blocks:
        candidate = block.get("text", "").lower()
        if not candidate:
            continue
        if target in candidate:
            score = 1.0
        else:
            score = SequenceMatcher(None, target, candidate).ratio()
        if score > best_score:
            best = block
            best_score = score

    if best_score < 0.45:
        return None
    return best


def map_fields_to_boxes(fields: Dict[str, str], blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    citations: List[Dict[str, Any]] = []
    for field, value in fields.items():
        if not value:
            continue
        match = _best_block(value, blocks)
        citations.append(
            {
                "field": field,
                "page": match["page"] if match else None,
                "bounds": match["bounds"] if match else None,
                "snippet": match["text"] if match else None,
            }
        )
    return citations


def update_single_field(field: str, value: str, blocks: List[Dict[str, Any]], existing: List[Dict[str, Any]]):
    blocks = blocks or []
    existing = existing or []
    match = _best_block(value, blocks)
    updated = {
        "field": field,
        "page": match["page"] if match else None,
        "bounds": match["bounds"] if match else None,
        "snippet": match["text"] if match else None,
    }
    remaining = [c for c in existing if c.get("field") != field]
    remaining.append(updated)
    return remaining

