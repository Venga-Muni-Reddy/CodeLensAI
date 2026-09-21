from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, List, Optional


class BaseAIProvider(ABC):
    """Abstract base class for all LLM providers in CodeLensAI."""

    provider_name: str

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if required API keys and configurations are present."""
        pass

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        **kwargs,
    ) -> str:
        """Generate a complete text completion."""
        pass

    @abstractmethod
    async def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        """Stream completion tokens."""
        pass
