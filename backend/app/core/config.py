import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "RecoverIQ Decision Engine"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/recoveriq.db")
    SEED: int = int(os.getenv("RECOVERIQ_SEED", "42"))
    SYNTHETIC_DATA_SIZE: int = int(os.getenv("RECOVERIQ_SYNTHETIC_SIZE", "3000"))
    ARTIFACTS_DIR: Path = BASE_DIR / "app" / "ml" / "artifacts"
    MODEL_PATH: Path = BASE_DIR / "app" / "ml" / "artifacts" / "logistic_regression_v1.joblib"
    MODEL_METRICS_PATH: Path = BASE_DIR / "app" / "ml" / "artifacts" / "model_metrics.json"

settings = Settings()
