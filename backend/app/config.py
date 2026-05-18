import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Uses pydantic_settings for validation and management.
    """

    # General
    PROJECT_ID: str
    FIRESTORE_DATABASE: str = "(default)"
    CORS_ORIGINS: str = "http://localhost:5173"

    # Authentication
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    @property
    def cors_origins_list(self) -> list[str]:
        """Split comma-separated CORS_ORIGINS string into a list."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra fields not defined in the schema
    )


@lru_cache()
def get_settings():
    """
    Cached function to get application settings.
    Ensures settings are loaded only once.
    """
    # For local development, load .env file
    # In Cloud Run, environment variables are set directly.
    if os.path.exists(".env"):
        from dotenv import load_dotenv
        load_dotenv()
    return Settings()


settings = get_settings()
