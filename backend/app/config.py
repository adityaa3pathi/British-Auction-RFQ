import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "british_auction.db")


class Settings(BaseSettings):
    PROJECT_NAME: str = "British Auction RFQ System"
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH}"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "*"]
    WORKER_TICK_SECONDS: float = 1.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
