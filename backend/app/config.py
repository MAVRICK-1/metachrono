from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # OpenMetadata connection
    OPENMETADATA_URL: str = "https://sandbox.open-metadata.org/api/v1"
    OPENMETADATA_JWT_TOKEN: Optional[str] = None
    OPENMETADATA_USERNAME: str = "admin@open-metadata.org"
    OPENMETADATA_PASSWORD: str = "Admin@1234"

    # Gemini (free tier) — primary AI provider
    # Get key at: https://aistudio.google.com/app/apikey
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # OpenAI — fallback AI provider (optional, paid)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"

    # App
    APP_NAME: str = "MetaChronos"
    DEBUG: bool = False
    CORS_ORIGINS: str = "http://localhost:3000,http://frontend:3000"

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()
