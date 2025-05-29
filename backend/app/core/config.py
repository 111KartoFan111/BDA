"""
Configuration settings for the application.
"""

from typing import List, Optional, Union
from pydantic import AnyHttpUrl, field_validator, Field
from pydantic_settings import BaseSettings
import secrets
import os


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
    
    # CORS - ИСПРАВЛЕННЫЕ НАСТРОЙКИ
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://localhost:5173", 
        "http://localhost:8080",
        "https://localhost:3000",
        "https://localhost:5173",
        "https://localhost:8080"
    ]
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            # Если строка, разбиваем по запятым
            origins = [i.strip() for i in v.split(",") if i.strip()]
            # Добавляем стандартные origins для разработки если их нет
            default_origins = [
                "http://localhost:3000",
                "http://localhost:5173", 
                "http://localhost:8080"
            ]
            for origin in default_origins:
                if origin not in origins:
                    origins.append(origin)
            return origins
        elif isinstance(v, list):
            return v
        return [
            "http://localhost:3000",
            "http://localhost:5173", 
            "http://localhost:8080"
        ]  # default fallback
    
    # Email Configuration
    SMTP_SERVER: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    EMAIL_FROM: str = "noreply@rentchain.com"
    EMAIL_FROM_NAME: str = "RentChain"
    
    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_TYPES: Union[str, List[str]] = [
        "image/jpeg",
        "image/png", 
        "image/webp",
        "image/gif"
    ]
    ALLOWED_DOCUMENT_TYPES: Union[str, List[str]] = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    
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
    FRONTEND_URL: str = "http://localhost:5173"
    
    # ML and Pricing Model Settings
    MODEL_PATH: str = os.getenv("MODEL_PATH", "models")
    ML_MODELS_ENABLED: bool = os.getenv("ML_MODELS_ENABLED", "true").lower() == "true"
    
    # Dynamic Pricing Configuration
    PRICING_UPDATE_FREQUENCY_HOURS: int = int(os.getenv("PRICING_UPDATE_FREQUENCY_HOURS", "24"))
    PRICING_MAX_AUTO_ADJUSTMENT: float = float(os.getenv("PRICING_MAX_AUTO_ADJUSTMENT", "0.2"))
    PRICING_MIN_CONFIDENCE_THRESHOLD: float = float(os.getenv("PRICING_MIN_CONFIDENCE_THRESHOLD", "0.7"))
    PRICING_NOTIFICATION_THRESHOLD: float = float(os.getenv("PRICING_NOTIFICATION_THRESHOLD", "0.1"))
    
    # Celery Configuration for Background Tasks
    CELERY_BROKER_URL: Optional[str] = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: Optional[str] = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    CELERY_TASK_SERIALIZER: str = "json"
    CELERY_RESULT_SERIALIZER: str = "json"
    CELERY_ACCEPT_CONTENT: List[str] = ["json"]
    CELERY_TIMEZONE: str = "UTC"
    CELERY_ENABLE_UTC: bool = True
    
    # Machine Learning Model Configuration
    ML_TRAINING_MIN_SAMPLES: int = int(os.getenv("ML_TRAINING_MIN_SAMPLES", "100"))
    ML_MODEL_UPDATE_FREQUENCY_DAYS: int = int(os.getenv("ML_MODEL_UPDATE_FREQUENCY_DAYS", "7"))
    ML_FEATURE_CACHE_TTL: int = int(os.getenv("ML_FEATURE_CACHE_TTL", "3600"))  # 1 hour
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()