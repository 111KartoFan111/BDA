"""
Database configuration and session management.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import redis
from typing import Generator

from app.core.config import settings
from app.models.base import Base  # Импортируем Base из правильного места

# SQLAlchemy setup
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Redis setup
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

def get_db() -> Generator:
    """
    Database dependency for FastAPI.
    
    Yields:
        Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_redis() -> redis.Redis:
    """
    Get Redis client.
    
    Returns:
        Redis client instance
    """
    return redis_client

# Database utilities
def init_db() -> None:
    """Initialize database tables."""
    Base.price_metadata.create_all(bind=engine)

def drop_db() -> None:
    """Drop all database tables."""
    Base.price_metadata.drop_all(bind=engine)