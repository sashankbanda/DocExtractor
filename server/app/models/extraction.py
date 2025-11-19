from dataclasses import dataclass, field
from typing import Dict


@dataclass
class ExtractionModel:
    fileId: str
    data: Dict[str, str] = field(default_factory=dict)
    citations: list[dict] = field(default_factory=list)

