import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "FeedbackIQ"
    APP_ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    
    # Database
    DATABASE_URL: str = "sqlite:///./feedbackiq.db"
    
    # Authentication & Supabase
    SUPABASE_URL: str = "https://mock-supabase.supabase.co"
    SUPABASE_ANON_KEY: str = "mock-anon-key"
    SUPABASE_JWT_SECRET: str = "super-secret-jwt-key-for-development-mode-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    
    # LLM Settings
    LLM_PROVIDER: str = "mock"  # Options: 'mock', 'google', 'openai', 'anthropic'
    LLM_MODEL: str = "gemini-2.5-flash"
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # Scheduling & Verification
    SCHEDULE_INTERVAL_DAYS: int = 7
    MIN_VERIFICATION_SAMPLE_SIZE: int = 3
    VERIFICATION_WINDOW_DAYS: int = 7

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
