from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra fields from .env
    )

    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "weatherpocket"
    GEMINI_API_KEY: str = "your-gemini-api-key"
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


@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
