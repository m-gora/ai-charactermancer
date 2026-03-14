from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "charactermancer"

    # Google / Gemini
    google_api_key: str

    # Embedding
    embedding_model: str = "gemini-embedding-001"
    embedding_dimensions: int = 3072  # gemini-embedding-001 default
    embedding_batch_size: int = 100  # max texts per embed_content call

    # Data
    foundry_data_path: str = "/data/foundryvtt-pathfinder1/packs"
    pf1_content_path: str = "/data/pf1-content/src"

    # Packs to ingest (order matters for relationship resolution)
    enabled_packs: list[str] = [
        "feats",
        "classes",
        "races",
        "spells",
        "class-abilities",
        "traits",
        "racial-traits",
        "items",
    ]


settings = Settings()
