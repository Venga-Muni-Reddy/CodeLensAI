import logging
from typing import AsyncGenerator, List, Optional
from app.services.ai.base import BaseAIProvider
from app.services.ai.openrouter import OpenRouterProvider
from app.services.ai.gemini import GeminiProvider
from app.services.ai.openai import OpenAIProvider

logger = logging.getLogger(__name__)


class AIFallbackService:
    """Manages AI provider fallback chain: OpenRouter -> Gemini -> OpenAI."""

    def __init__(self):
        self.providers: List[BaseAIProvider] = [
            OpenRouterProvider(),
            GeminiProvider(),
            OpenAIProvider(),
        ]

    def get_available_providers(self) -> List[str]:
        return [p.provider_name for p in self.providers if p.is_available()]

    async def generate_with_fallback(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        **kwargs,
    ) -> str:
        last_error = None

        for provider in self.providers:
            if not provider.is_available():
                continue
            try:
                logger.info("Attempting AI generation with provider: %s", provider.provider_name)
                result = await provider.generate(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs,
                )
                return result
            except Exception as exc:
                logger.warning(
                    "Provider %s failed with error: %s. Falling back to next available provider...",
                    provider.provider_name,
                    exc,
                )
                last_error = exc

        raise RuntimeError(
            f"All configured AI providers failed or no provider is configured. Last error: {last_error}"
        )


ai_service = AIFallbackService()
