"""
Configuration settings for the application.
"""

import os
from typing import List, Optional, Union
from pydantic import AnyHttpUrl, validator,Extra
from pydantic_settings import BaseSettings
import json


class Settings(BaseSettings):
    """Application settings."""
    
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "RentChain API"
    PROJECT_VERSION: str = "1.0.0"
    DESCRIPTION: str = "Blockchain-based rental platform"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    DATABASE_URL: str
    
    # CORS
    BACKEND_CORS_ORIGINS: Union[str, List[AnyHttpUrl]] = []
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # Blockchain Settings
    WEB3_PROVIDER_URL: Optional[str] = None
    RENTAL_FACTORY_ADDRESS: Optional[str] = None
    BLOCKCHAIN_OWNER_ADDRESS: Optional[str] = None
    BLOCKCHAIN_PRIVATE_KEY: Optional[str] = None
    
    # File Upload Settings
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_FILE_TYPES: List[str] = ["jpg", "jpeg", "png", "pdf", "doc", "docx"]
    
    # Email Settings (for future use)
    EMAIL_HOST: Optional[str] = None
    EMAIL_PORT: Optional[int] = None
    EMAIL_USERNAME: Optional[str] = None
    EMAIL_PASSWORD: Optional[str] = None
    EMAIL_USE_TLS: bool = True
    
    # Redis Settings (for caching)
    REDIS_URL: Optional[str] = None
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 3600  # 1 hour
    
    class Config:
        extra = Extra.allow
        case_sensitive = True
        env_file = ".env"
        
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Автозагрузка адреса фабрики из deployed файла
        self._load_deployed_addresses()
    
    def _load_deployed_addresses(self):
        """Загрузка адресов контрактов из deployed файла."""
        try:
            import os
            deployed_file = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
                'smart-contracts', 'deployed', 'sepolia-addresses.json'
            )
            
            if os.path.exists(deployed_file):
                with open(deployed_file, 'r') as f:
                    deployed_data = json.load(f)
                    
                # Обновляем адрес фабрики если он не задан в переменных окружения
                if not self.RENTAL_FACTORY_ADDRESS and 'RentalFactory' in deployed_data:
                    self.RENTAL_FACTORY_ADDRESS = deployed_data['RentalFactory']
                    print(f"Loaded RENTAL_FACTORY_ADDRESS from deployed file: {self.RENTAL_FACTORY_ADDRESS}")
                    
        except Exception as e:
            print(f"Could not load deployed addresses: {e}")


# Create settings instance
settings = Settings()

# Validate critical settings
if not settings.SECRET_KEY:
    raise ValueError("SECRET_KEY must be set")

if not settings.DATABASE_URL:
    raise ValueError("DATABASE_URL must be set")

# Print configuration status
print(f"🚀 {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}")
print(f"Environment: {settings.ENVIRONMENT}")
print(f"Debug: {settings.DEBUG}")
print(f"Web3 Provider: {settings.WEB3_PROVIDER_URL}")
print(f"Factory Address: {settings.RENTAL_FACTORY_ADDRESS}")
print(f"CORS Origins: {settings.BACKEND_CORS_ORIGINS}")