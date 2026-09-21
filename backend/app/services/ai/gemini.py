import json
import logging
from typing import AsyncGenerator, Optional
import httpx
from app.core.config import settings
from app.services.ai.base import BaseAIProvider

logger = logging.getLogger(__name__)


class GeminiProvider(BaseAIProvider):
    provider_name: str = "gemini"

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.default_model = settings.GEMINI_DEFAULT_MODEL

    def is_available(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        **kwargs,
    ) -> str:
        if not self.is_available():
            raise ValueError("Gemini API key is not configured.")

        chosen_model = model or self.default_model
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{chosen_model}:generateContent?key={self.api_key}"

        contents = []
        if system_prompt:
            contents.append({
                "role": "user",
                "parts": [{"text": f"System Instructions:\n{system_prompt}\n\nPlease follow the instructions carefully."}],
            })
            contents.append({
                "role": "model",
                "parts": [{"text": "Understood. I will follow all the provided system instructions."}],
            })
        contents.append({
            "role": "user",
            "parts": [{"text": prompt}],
        })

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts:
                    return parts[0].get("text", "")
            return ""

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        # Fallback to single chunk stream for basic setup
        text = await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs,
        )
        yield text
