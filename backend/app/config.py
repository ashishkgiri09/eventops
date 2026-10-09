from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# Keep the local database stable even when Uvicorn is launched from a different
# working directory (for example, the repository root instead of ./backend).
DEFAULT_DATABASE_PATH = Path(__file__).resolve().parents[1] / "eventops.db"


class Settings(BaseSettings):
    app_name: str = "EVENTOPS API"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    database_url: str = f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}"
    jwt_secret: str = "development-only-change-me"
    access_token_minutes: int = 20
    refresh_token_days: int = 14
    cors_origins: str = "http://localhost:3000"
    ai_provider: str = "disabled"
    ai_api_key: str = ""
    ai_model: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        """Normalize hosted Postgres URLs for the installed psycopg v3 driver."""
        if self.database_url.startswith("postgres://"):
            return self.database_url.replace("postgres://", "postgresql+psycopg://", 1)
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url


settings = Settings()
