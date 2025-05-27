"""
User schemas for request/response validation.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
import uuid

from app.models.user import UserRole, UserStatus


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None


class UserCreate(UserBase):
    """User creation schema."""
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    
    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()


class UserUpdate(BaseModel):
    """User update schema."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    
    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        if v is not None and len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip() if v else None


class UserInDB(UserBase):
    """User schema for database operations."""
    id: uuid.UUID
    role: UserRole
    status: UserStatus
    is_email_verified: bool
    is_phone_verified: bool
    is_verified: bool
    wallet_address: Optional[str] = None
    avatar: Optional[str] = None
    rating: Optional[float] = None
    total_reviews: int = 0
    completed_deals: int = 0
    total_earnings: float = 0.0
    settings: Dict[str, Any] = {}
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class User(UserInDB):
    """Public user schema."""
    pass


class UserProfile(User):
    """Extended user profile schema."""
    items_count: Optional[int] = 0
    active_contracts: Optional[int] = 0
    followers_count: Optional[int] = 0
    following_count: Optional[int] = 0


class UserLogin(BaseModel):
    """User login schema."""
    email: EmailStr
    password: str


class UserPasswordChange(BaseModel):
    """Password change schema."""
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class UserPasswordReset(BaseModel):
    """Password reset schema."""
    token: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class UserEmailVerification(BaseModel):
    """Email verification schema."""
    token: str


class ForgotPassword(BaseModel):
    """Forgot password schema."""
    email: EmailStr


class Token(BaseModel):
    """Token response schema."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token data schema."""
    user_id: Optional[str] = None


class UserStats(BaseModel):
    """User statistics schema."""
    total_items: int = 0
    active_items: int = 0
    total_contracts: int = 0
    active_contracts: int = 0
    completed_contracts: int = 0
    total_earnings: float = 0.0
    average_rating: Optional[float] = None
    total_reviews: int = 0
    
    class Config:
        orm_mode = True


class UserNotificationSettings(BaseModel):
    """User notification settings schema."""
    email_notifications: bool = True
    push_notifications: bool = True
    rental_requests: bool = True
    contract_updates: bool = True
    payment_notifications: bool = True
    marketing_emails: bool = False
    
    class Config:
        orm_mode = True


class UserPrivacySettings(BaseModel):
    """User privacy settings schema."""
    profile_visibility: str = "public"  # public, private, friends
    show_email: bool = False
    show_phone: bool = False
    show_location: bool = True
    allow_messages: bool = True
    
    class Config:
        orm_mode = True