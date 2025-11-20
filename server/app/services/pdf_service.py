from dataclasses import dataclass, asdict
from typing import List, Dict, Any
import fitz


@dataclass
class TextBlock:
    text: str
    page: int
    bounds: Dict[str, float]


@dataclass
class PdfExtractionResult:
    blocks: List[Dict[str, Any]]
    full_text: str
    empty_pages: List[int]


def extract_text_with_boxes(path: str) -> PdfExtractionResult:
    doc = fitz.open(path)
    try:
        blocks: List[Dict[str, Any]] = []
        empty_pages: List[int] = []
        full_text_segments: List[str] = []

        for page_index in range(len(doc)):
            page = doc.load_page(page_index)
            
            # Try to get text blocks (paragraphs/sentences) first for better context
            text_dict = page.get_text("dict")
            if not text_dict.get("blocks"):
                # Fallback to words if blocks are not available
                words = page.get_text("words")
                if not words:
                    empty_pages.append(page_index + 1)
                    continue
                
                # Group words into lines for better context
                lines: Dict[float, List[tuple]] = {}
                for word in words:
                    x0, y0, x1, y1, text, *_ = word
                    if not text.strip():
                        continue
                    # Group by y-coordinate (same line)
                    y_center = (y0 + y1) / 2
                    line_key = round(y_center / 5) * 5  # Round to nearest 5 pixels
                    if line_key not in lines:
                        lines[line_key] = []
                    lines[line_key].append((x0, y0, x1, y1, text))
                
                # Create blocks from lines
                for y_key in sorted(lines.keys()):
                    line_words = sorted(lines[y_key], key=lambda w: w[0])  # Sort by x position
                    if not line_words:
                        continue
                    
                    line_text = " ".join(w[4] for w in line_words)
                    full_text_segments.append(line_text)
                    
                    # Calculate bounding box for the entire line
                    min_x = min(w[0] for w in line_words)
                    min_y = min(w[1] for w in line_words)
                    max_x = max(w[2] for w in line_words)
                    max_y = max(w[3] for w in line_words)
                    
                    block = TextBlock(
                        text=line_text,
                        page=page_index + 1,
                        bounds={"x": float(min_x), "y": float(min_y), "width": float(max_x - min_x), "height": float(max_y - min_y)},
                    )
                    blocks.append(asdict(block))
            else:
                # Use text blocks (better for structured documents)
                for block_dict in text_dict["blocks"]:
                    if "lines" not in block_dict:
                        continue
                    
                    block_text_parts = []
                    min_x, min_y, max_x, max_y = float('inf'), float('inf'), 0, 0
                    
                    for line in block_dict["lines"]:
                        line_text_parts = []
                        for span in line.get("spans", []):
                            span_text = span.get("text", "").strip()
                            if span_text:
                                line_text_parts.append(span_text)
                                bbox = span.get("bbox", [])
                                if len(bbox) == 4:
                                    min_x = min(min_x, bbox[0])
                                    min_y = min(min_y, bbox[1])
                                    max_x = max(max_x, bbox[2])
                                    max_y = max(max_y, bbox[3])
                        
                        if line_text_parts:
                            line_text = " ".join(line_text_parts)
                            block_text_parts.append(line_text)
                    
                    if block_text_parts and min_x != float('inf'):
                        block_text = " ".join(block_text_parts)
                        full_text_segments.append(block_text)
                        
                        block = TextBlock(
                            text=block_text,
                            page=page_index + 1,
                            bounds={"x": float(min_x), "y": float(min_y), "width": float(max_x - min_x), "height": float(max_y - min_y)},
                        )
                        blocks.append(asdict(block))

        return PdfExtractionResult(blocks=blocks, full_text=" ".join(full_text_segments), empty_pages=empty_pages)
    finally:
        doc.close()

