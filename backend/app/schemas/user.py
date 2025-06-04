"""
User schemas for request/response validation.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from datetime import datetime
import uuid
from uuid import UUID

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
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    
    @field_validator('first_name', 'last_name')
    @classmethod
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
    wallet_address: Optional[str] = None  # НОВОЕ ПОЛЕ
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_names(cls, v):
        if v is not None and len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip() if v else None

    @field_validator('wallet_address')
    @classmethod
    def validate_wallet_address(cls, v):
        if v is not None:
            import re
            if not re.match(r'^0x[a-fA-F0-9]{40}$', v):
                raise ValueError('Invalid Ethereum wallet address format')
        return v


class UserInDB(UserBase):
    """User schema for database operations."""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    role: UserRole
    status: UserStatus
    is_email_verified: bool
    is_phone_verified: bool
    is_verified: bool
    wallet_address: Optional[str] = None  # НОВОЕ ПОЛЕ
    avatar: Optional[str] = None
    rating: Optional[float] = None
    total_reviews: int = 0
    completed_deals: int = 0
    total_earnings: float = 0.0
    settings: Dict[str, Any] = {}
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


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
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class UserPasswordReset(BaseModel):
    """Password reset schema."""
    token: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
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
    model_config = ConfigDict(from_attributes=True)
    
    total_items: int = 0
    active_items: int = 0
    total_contracts: int = 0
    active_contracts: int = 0
    completed_contracts: int = 0
    total_earnings: float = 0.0
    average_rating: Optional[float] = None
    total_reviews: int = 0


class UserNotificationSettings(BaseModel):
    """User notification settings schema."""
    model_config = ConfigDict(from_attributes=True)
    
    email_notifications: bool = True
    push_notifications: bool = True
    rental_requests: bool = True
    contract_updates: bool = True
    payment_notifications: bool = True
    marketing_emails: bool = False


class UserPrivacySettings(BaseModel):
    """User privacy settings schema."""
    model_config = ConfigDict(from_attributes=True)
    
    profile_visibility: str = "public"  # public, private, friends
    show_email: bool = False
    show_phone: bool = False
    show_location: bool = True
    allow_messages: bool = True

class UserOut(BaseModel):
    id: UUID
    email: EmailStr

    class Config:
        orm_mode = True
