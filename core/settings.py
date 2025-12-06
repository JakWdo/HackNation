from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: Optional[str] = None

    # Anthropic
    anthropic_api_key: Optional[str] = None

    # Google Gemini
    gemini_api_key: Optional[str] = None

    # Hugging Face
    hf_token: Optional[str] = None

    # App
    debug: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
