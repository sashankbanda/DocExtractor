from typing import Dict, Any, List, Optional
from difflib import SequenceMatcher
import re


def _normalize_for_matching(text: str) -> str:
    """Normalize text for better matching"""
    # Remove special characters, normalize whitespace
    text = re.sub(r'[^\w\s]', ' ', text.lower())
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def _extract_numeric_value(text: str) -> Optional[str]:
    """Extract numeric value from text (for amounts, dates, etc.)"""
    # Remove currency symbols and commas, keep numbers and decimal points
    cleaned = re.sub(r'[^\d.]', '', text)
    return cleaned if cleaned else None


def _best_block(value: str, blocks: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not value or not value.strip():
        return None
    
    # Clean and normalize the target value
    target_clean = value.strip()
    # Limit target length to prevent matching overly long concatenated strings
    if len(target_clean) > 100:
        target_clean = target_clean[:100]
    
    target = _normalize_for_matching(target_clean)
    target_numeric = _extract_numeric_value(target_clean)
    best = None
    best_score = 0.0

    for block in blocks:
        candidate_text = block.get("text", "")
        if not candidate_text or not candidate_text.strip():
            continue
        
        # Limit candidate text length to prevent matching large blocks
        candidate_text_limited = candidate_text[:200] if len(candidate_text) > 200 else candidate_text
        candidate = _normalize_for_matching(candidate_text_limited)
        candidate_numeric = _extract_numeric_value(candidate_text_limited)
        
        # Exact match (after normalization)
        if target == candidate:
            score = 1.0
        # Exact substring match (prefer shorter matches)
        elif target in candidate:
            # Penalize if candidate is much longer than target (likely concatenated)
            length_ratio = len(candidate) / len(target) if len(target) > 0 else 1
            if length_ratio > 2:
                score = 0.7  # Reduced score for overly long matches
            else:
                score = 0.9
        elif candidate in target:
            score = 0.85
        # Numeric match (for amounts, dates)
        elif target_numeric and candidate_numeric and target_numeric == candidate_numeric:
            score = 0.85
        # Partial numeric match (for series fields like "medical paid 2")
        elif target_numeric and candidate_numeric and target_numeric in candidate_numeric:
            score = 0.75
        # Similarity match
        else:
            score = SequenceMatcher(None, target, candidate).ratio()
            # Boost score if there's any overlap, but penalize long candidates
            if len(target) > 3 and any(word in candidate for word in target.split() if len(word) > 2):
                length_penalty = min(len(candidate) / len(target), 2.0)  # Penalize if candidate is much longer
                score = max(score / length_penalty, 0.5)
        
        if score > best_score:
            best = block
            best_score = score

    # Require higher threshold to avoid matching concatenated text
    if best_score < 0.5:
        return None
    return best


def map_fields_to_boxes(fields: Dict[str, str], blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    citations: List[Dict[str, Any]] = []
    used_blocks = set()  # Track used blocks to avoid duplicate citations
    
    for field, value in fields.items():
        if not value or not str(value).strip() or field == "fileId":
            continue
        
        # Try to find the best matching block
        match = _best_block(str(value), blocks)
        
        if match:
            # Create a unique identifier for the block to avoid duplicates
            block_id = f"{match.get('page', 0)}-{match.get('bounds', {}).get('x', 0)}-{match.get('bounds', {}).get('y', 0)}"
            if block_id not in used_blocks:
                used_blocks.add(block_id)
        
        citations.append(
            {
                "field": field,
                "page": match["page"] if match else None,
                "bounds": match["bounds"] if match else None,
                "snippet": match.get("text") if match else None,
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

