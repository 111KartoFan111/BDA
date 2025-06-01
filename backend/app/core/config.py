"""
Configuration settings for the application.
"""

import os
from typing import List, Optional, Union
from pydantic import AnyHttpUrl, field_validator
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
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_MIN_LENGTH: int = 8
    
    # Database
    DATABASE_URL: str
    
    # CORS
    BACKEND_CORS_ORIGINS: Union[str, List[AnyHttpUrl]] = []
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
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
    ALLOWED_IMAGE_TYPES: Union[str, List[str]] = "image/jpeg,image/png,image/gif,image/webp"
    
    @field_validator("ALLOWED_IMAGE_TYPES", mode="before")
    @classmethod
    def parse_allowed_image_types(cls, v):
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    # Try to parse as JSON array
                    return json.loads(v)
                except json.JSONDecodeError:
                    # If JSON parsing fails, treat as comma-separated string
                    return [item.strip() for item in v.strip("[]").split(",")]
            else:
                # Comma-separated string
                return [item.strip() for item in v.split(",")]
        return v
    
    # Email Settings
    EMAIL_HOST: Optional[str] = None
    EMAIL_PORT: Optional[int] = None
    EMAIL_USERNAME: Optional[str] = None
    EMAIL_PASSWORD: Optional[str] = None
    EMAIL_USE_TLS: bool = True
    
    # SMTP Settings (alternative naming)
    SMTP_SERVER: Optional[str] = None
    SMTP_PORT: Optional[int] = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    EMAIL_FROM: Optional[str] = None
    EMAIL_FROM_NAME: Optional[str] = "RentChain"
    
    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Redis Settings (for caching)
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Celery Settings
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # ML Model Settings
    MODEL_PATH: str = "models"
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 3600  # 1 hour
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"
        
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Auto-load factory address from deployed file
        self._load_deployed_addresses()
        
        # Ensure certain settings are properly typed
        self._validate_and_convert_settings()
    
    def _validate_and_convert_settings(self):
        """Validate and convert settings to proper types."""
        # Convert string values to integers where needed
        if isinstance(self.ACCESS_TOKEN_EXPIRE_MINUTES, str):
            self.ACCESS_TOKEN_EXPIRE_MINUTES = int(self.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        if isinstance(self.REFRESH_TOKEN_EXPIRE_DAYS, str):
            self.REFRESH_TOKEN_EXPIRE_DAYS = int(self.REFRESH_TOKEN_EXPIRE_DAYS)
            
        if isinstance(self.PASSWORD_MIN_LENGTH, str):
            self.PASSWORD_MIN_LENGTH = int(self.PASSWORD_MIN_LENGTH)
            
        if isinstance(self.MAX_FILE_SIZE, str):
            self.MAX_FILE_SIZE = int(self.MAX_FILE_SIZE)
        
        # Ensure directories exist
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)
        os.makedirs(self.MODEL_PATH, exist_ok=True)
    
    def _load_deployed_addresses(self):
        """Load contract addresses from deployed file."""
        try:
            # Ищем файл с развернутыми адресами в нескольких местах
            possible_paths = [
                # В корне бэкенда
                os.path.join(os.path.dirname(__file__), '..', '..', 'deployed-addresses.json'),
                # В smart-contracts/deployed
                os.path.join(
                    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
                    'smart-contracts', 'deployed', 'sepolia-addresses.json'
                ),
                # В текущей директории
                'deployed-addresses.json'
            ]
            
            deployed_data = None
            used_path = None
            
            for deployed_file in possible_paths:
                if os.path.exists(deployed_file):
                    try:
                        with open(deployed_file, 'r') as f:
                            deployed_data = json.load(f)
                            used_path = deployed_file
                            break
                    except Exception as e:
                        print(f"Error reading {deployed_file}: {e}")
                        continue
            
            if deployed_data:
                # Update factory address if not set in environment variables
                if not self.RENTAL_FACTORY_ADDRESS and 'RentalFactory' in deployed_data:
                    self.RENTAL_FACTORY_ADDRESS = deployed_data['RentalFactory']
                    print(f"✅ Loaded RENTAL_FACTORY_ADDRESS from {used_path}: {self.RENTAL_FACTORY_ADDRESS}")
                
                # Также загружаем другие полезные данные
                if 'chainId' in deployed_data:
                    print(f"📡 Target network: {deployed_data.get('network', 'unknown')} (Chain ID: {deployed_data['chainId']})")
                
                if 'deployedAt' in deployed_data:
                    print(f"🕒 Contracts deployed at: {deployed_data['deployedAt']}")
                    
            else:
                print("⚠️  No deployed addresses file found. Please deploy smart contracts first.")
                print("💡 Run: cd smart-contracts && npm run deploy")
                
        except Exception as e:
            print(f"❌ Could not load deployed addresses: {e}")
            print("💡 Make sure smart contracts are deployed and addresses file exists")

# Create settings instance with proper error handling
try:
    settings = Settings()
except Exception as e:
    print(f"Error loading settings: {e}")
    print("Please check your .env file configuration")
    raise

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
print(f"Allowed Image Types: {settings.ALLOWED_IMAGE_TYPES}")