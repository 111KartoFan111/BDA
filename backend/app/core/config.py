"""
Configuration settings for the application.
"""

from typing import List, Optional, Union
from pydantic import AnyHttpUrl, field_validator, Field
from pydantic_settings import BaseSettings
import secrets


class Settings(BaseSettings):
    """Application settings."""
    
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "RentChain API"
    PROJECT_VERSION: str = "1.0.0"
    DESCRIPTION: str = "Backend API for RentChain rental platform"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # 30 minutes
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7     # 7 days
    BCRYPT_ROUNDS: int = 12
    PASSWORD_MIN_LENGTH: int = 8
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/rentchain"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # CORS - изменяем на Union[str, List[str]]
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,https://localhost:3000,http://localhost:8080,https://localhost:8080"
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000"]  # default fallback
    
    # Email Configuration
    SMTP_SERVER: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    EMAIL_FROM: str = "noreply@rentchain.com"
    EMAIL_FROM_NAME: str = "RentChain"
    
    # File Storage - изменяем на Union[str, List[str]]
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_TYPES: Union[str, List[str]] = "image/jpeg,image/png,image/webp,image/gif"
    ALLOWED_DOCUMENT_TYPES: Union[str, List[str]] = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    
    @field_validator("ALLOWED_IMAGE_TYPES", mode="before")
    @classmethod
    def parse_allowed_image_types(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["image/jpeg", "image/png"]  # default fallback
    
    @field_validator("ALLOWED_DOCUMENT_TYPES", mode="before")
    @classmethod
    def parse_allowed_document_types(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["application/pdf"]  # default fallback
    
    # Blockchain
    WEB3_PROVIDER_URL: str = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
    CONTRACT_ADDRESS: Optional[str] = None
    PRIVATE_KEY: Optional[str] = None
    
    # ML Models
    MODEL_PATH: str = "models"
    ENABLE_RECOMMENDATIONS: bool = True
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds
    
    # Monitoring
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379"
    
    # Admin users (for initial setup)
    FIRST_SUPERUSER_EMAIL: str = "admin@rentchain.com"
    FIRST_SUPERUSER_PASSWORD: str = "changeme123"
    
    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()