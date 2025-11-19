import pandas as pd
from typing import Dict, Any, List


def read_table(path: str) -> Dict[str, Any]:
    try:
        if path.lower().endswith(".csv"):
            df = pd.read_csv(path)
        else:
            df = pd.read_excel(path)
    except Exception as exc:
        raise ValueError(f"Unable to parse spreadsheet: {exc}") from exc

    df = df.fillna("")
    blocks: List[Dict[str, Any]] = []
    text_segments: List[str] = []

    for row_idx, (_, row) in enumerate(df.iterrows()):
        row_values = [str(value) for value in row]
        text_segments.append(" ".join(row_values))
        for col_idx, value in enumerate(row_values):
            if not value.strip():
                continue
            blocks.append(
                {
                    "text": value,
                    "page": 1,
                    "bounds": {
                        "x": float(col_idx * 100),
                        "y": float(row_idx * 20),
                        "width": 100.0,
                        "height": 20.0,
                    },
                }
            )

    return {"blocks": blocks, "full_text": "\n".join(text_segments)}

