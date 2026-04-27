from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "KYTRONA VISION"
    database_url: str = "sqlite:///./kytrona.db"
    yolo_model: str = "yolov8n.pt"
    confidence_threshold: float = 0.35
    stream_width: int = 960
    stream_height: int = 540
    snapshots_dir: Path = Path("snapshots")
    videos_dir: Path = Path("videos")
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
