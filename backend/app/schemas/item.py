# 1. Исправить app/schemas/item.py

"""
Item schemas for request/response validation.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, field_validator, ConfigDict, Field
from datetime import datetime
from decimal import Decimal
import uuid
from uuid import UUID

# Сначала определяем базовые схемы пользователя
class UserOut(BaseModel):
    """Базовая схема пользователя для вывода."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    email: str
    first_name: str
    last_name: str
    avatar: Optional[str] = None
    is_verified: bool = False
    rating: Optional[float] = None
    total_reviews: int = 0

class CategoryBase(BaseModel):
    """Base category schema."""
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    image: Optional[str] = None

class CategoryCreate(CategoryBase):
    """Category creation schema."""
    parent_id: Optional[uuid.UUID] = None
    sort_order: int = 0

class CategoryUpdate(BaseModel):
    """Category update schema."""
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

class Category(CategoryBase):
    """Category response schema."""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    level: int = 0
    sort_order: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

class CategoryWithChildren(Category):
    """Category with children schema."""
    children: List['CategoryWithChildren'] = []

class ItemBase(BaseModel):
    """Base item schema."""
    title: str
    description: str
    category_id: uuid.UUID
    price_per_day: Decimal
    deposit: Optional[Decimal] = 0
    location: Optional[str] = None
    condition: str = "good"  # Используем строку вместо Enum для простоты
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    min_rental_days: int = 1
    max_rental_days: int = 30
    terms: Optional[str] = None
    tags: List[str] = []
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if len(v.strip()) < 5:
            raise ValueError('Title must be at least 5 characters long')
        if len(v) > 200:
            raise ValueError('Title must not exceed 200 characters')
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if len(v.strip()) < 10:
            raise ValueError('Description must be at least 10 characters long')
        if len(v) > 2000:
            raise ValueError('Description must not exceed 2000 characters')
        return v.strip()
    
    @field_validator('price_per_day')
    @classmethod
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError('Price must be greater than 0')
        return v
    
    @field_validator('min_rental_days', 'max_rental_days')
    @classmethod
    def validate_rental_days(cls, v):
        if v < 1:
            raise ValueError('Rental days must be at least 1')
        return v

class ItemCreate(ItemBase):
    """Item creation schema."""
    available_from: Optional[datetime] = None
    available_to: Optional[datetime] = None

class ItemUpdate(BaseModel):
    """Item update schema."""
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    price_per_day: Optional[Decimal] = None
    deposit: Optional[Decimal] = None
    location: Optional[str] = None
    condition: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    available_from: Optional[datetime] = None
    available_to: Optional[datetime] = None
    min_rental_days: Optional[int] = None
    max_rental_days: Optional[int] = None
    terms: Optional[str] = None
    tags: Optional[List[str]] = None
    is_available: Optional[bool] = None

class ItemInDB(ItemBase):
    """Item schema for database operations."""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    owner_id: uuid.UUID
    slug: str
    status: str  # Используем строку вместо Enum
    is_featured: bool = False
    is_available: bool = True
    is_approved: bool = False
    images: List[str] = []
    documents: List[str] = []
    views_count: int = 0
    favorites_count: int = 0
    rentals_count: int = 0
    rating: Optional[float] = None
    total_reviews: int = 0
    available_from: Optional[datetime] = None
    available_to: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None

class Item(ItemInDB):
    """Public item schema."""
    model_config = ConfigDict(from_attributes=True)
    
    category: Category
    owner: UserOut  # Используем правильную схему пользователя

class ItemDetail(Item):
    """Detailed item schema."""
    model_config = ConfigDict(from_attributes=True)
    
    similar_items: Optional[List['Item']] = None

# Остальные схемы остаются без изменений...
class ItemList(BaseModel):
    """Item list response schema."""
    items: List[Item]
    total: int
    page: int
    size: int
    pages: int

class ItemSearch(BaseModel):
    """Item search parameters."""
    query: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    location: Optional[str] = None
    condition: Optional[str] = None
    available_from: Optional[datetime] = None
    available_to: Optional[datetime] = None
    sort_by: str = "created_at"
    sort_order: str = "desc"
    page: int = 1
    size: int = 20

class ReviewBase(BaseModel):
    """Base review schema."""
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None
    ratings: Dict[str, int] = {}
    
    @field_validator('rating')
    @classmethod
    def validate_rating(cls, v):
        if not 1 <= v <= 5:
            raise ValueError('Rating must be between 1 and 5')
        return v

class ReviewCreate(ReviewBase):
    """Review creation schema."""
    contract_id: Optional[uuid.UUID] = None

class Review(ReviewBase):
    """Review response schema."""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    item_id: uuid.UUID
    reviewer_id: uuid.UUID
    reviewer: UserOut
    is_approved: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

class FavoriteCreate(BaseModel):
    """Favorite creation schema."""
    item_id: uuid.UUID

class Favorite(BaseModel):
    """Favorite response schema."""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    user_id: uuid.UUID
    item_id: uuid.UUID
    item: Item
    created_at: datetime

class ItemView(BaseModel):
    """Item view schema."""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    item_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    ip_address: Optional[str] = None
    created_at: datetime

class ItemStats(BaseModel):
    """Item statistics schema."""
    model_config = ConfigDict(from_attributes=True)
    
    total_items: int = 0
    active_items: int = 0
    rented_items: int = 0
    average_price: float = 0.0
    popular_categories: List[Dict[str, Any]] = []
    popular_items: List[Item] = []

class RentalRequest(BaseModel):
    """Rental request schema."""
    item_id: uuid.UUID
    start_date: datetime
    end_date: datetime
    message: Optional[str] = None
    total_price: Decimal

# Forward reference resolution
ItemDetail.model_rebuild()
CategoryWithChildren.model_rebuild()