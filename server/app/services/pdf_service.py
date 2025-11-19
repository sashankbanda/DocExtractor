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
            words = page.get_text("words")
            if not words:
                empty_pages.append(page_index + 1)
                continue

            for word in words:
                x0, y0, x1, y1, text, *_ = word
                if not text.strip():
                    continue
                full_text_segments.append(text)
                block = TextBlock(
                    text=text,
                    page=page_index + 1,
                    bounds={"x": float(x0), "y": float(y0), "width": float(x1 - x0), "height": float(y1 - y0)},
                )
                blocks.append(asdict(block))

        return PdfExtractionResult(blocks=blocks, full_text=" ".join(full_text_segments), empty_pages=empty_pages)
    finally:
        doc.close()

