from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "charactermancer"

    # Google / Gemini
    google_api_key: str

    # Embedding (must match the ingestion pipeline settings)
    embedding_model: str = "gemini-embedding-001"
    embedding_dimensions: int = 3072

    # Chat LLM
    chat_model: str = "gemini-2.5-flash-lite"

    # Auth0 JWT validation
    auth0_domain: str
    auth0_audience: str

    # CORS — comma-separated list of allowed origins
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
