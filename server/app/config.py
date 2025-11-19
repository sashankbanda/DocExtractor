from functools import lru_cache
from pydantic import BaseModel
import os


class Settings(BaseModel):
  mongo_uri: str = os.getenv('MONGO_URI', 'mongodb://localhost:27017/document_extractor')
  mongo_db: str = os.getenv('MONGO_DB', 'document_extractor')
  uploads_dir: str = os.getenv('UPLOADS_DIR', 'uploads')
  ollama_url: str = os.getenv('OLLAMA_URL', 'http://localhost:11434')


@lru_cache
def get_settings() -> Settings:
  return Settings()

