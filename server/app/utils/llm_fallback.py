import aiohttp
import json
import logging
from typing import Dict, List
from app.config import get_settings

logger = logging.getLogger(__name__)


async def infer_with_llama(normalized_text: str, missing_fields: List[str]) -> Dict[str, str]:
    if not missing_fields:
        return {}

    settings = get_settings()
    instruction = (
        "You are assisting with insurance document extraction. "
        "Review the normalized text below and return a JSON object that only contains the requested keys. "
        "If a value cannot be determined confidently, omit the key. "
    )
    prompt = f"""{instruction}
Missing keys: {', '.join(missing_fields)}
Normalized text:
{normalized_text}

Respond with valid JSON only."""

    payload = {
        "model": "llama3.1:8b",
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1},
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{settings.ollama_url}/api/generate", json=payload, timeout=180) as resp:
                resp.raise_for_status()
                data = await resp.json()
        text = data.get("response", "{}")
        return json.loads(text)
    except Exception as exc:
        logger.warning("LLM fallback failed: %s", exc)
        return {}

