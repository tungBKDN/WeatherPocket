import os
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra fields from .env
    )

    QDRANT_ENDPOINT: str = ""
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "weather_docs"

    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "weatherpocket"
    GEMINI_API_KEY: str = "your-gemini-api-key"  # legacy single-key fallback
    # Multi-key support: GEMINI_API_KEY_1 .. GEMINI_API_KEY_5 in .env.
    # The GeminiKeyManager rolls through these; a key that hits quota (429) or
    # is invalid/expired is skipped for the rest of the process lifetime.
    GEMINI_API_KEY_1: str = ""
    GEMINI_API_KEY_2: str = ""
    GEMINI_API_KEY_3: str = ""
    GEMINI_API_KEY_4: str = ""
    GEMINI_API_KEY_5: str = ""
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # Aliases for LangChain libraries that expect different key names
    @property
    def MONGODB_URI(self) -> str:
        return self.MONGO_URI

    @property
    def MONGO_DB_NAME(self) -> str:
        return self.MONGO_DB

    @property
    def GOOGLE_API_KEY(self) -> str:
        return self.GEMINI_API_KEY

    @property
    def GEMINI_API_KEYS(self) -> List[str]:
        """Ordered list of usable Gemini keys: numbered keys first, then the
        single GEMINI_API_KEY (deduplicated, blanks dropped)."""
        keys = [getattr(self, f"GEMINI_API_KEY_{n}", "") for n in range(1, 6)]
        keys = [k.strip() for k in keys if k and k.strip()]
        if self.GEMINI_API_KEY and self.GEMINI_API_KEY != "your-gemini-api-key":
            fallback = self.GEMINI_API_KEY.strip()
            if fallback and fallback not in keys:
                keys.append(fallback)
        return keys


@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
