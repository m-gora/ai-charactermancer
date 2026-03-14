from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongodb_uri: str
    mongodb_db: str = "charactermancer"
    auth0_domain: str
    auth0_audience: str

    # Comma-separated list of allowed CORS origins; defaults to local Vite dev server
    cors_origins: str = "http://localhost:5173"

    @field_validator("auth0_domain", "auth0_audience", "mongodb_uri")
    @classmethod
    def must_not_be_empty(cls, v: str, info) -> str:
        if not v or not v.strip():
            raise ValueError(f"{info.field_name} must not be empty")
        return v.strip()

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
