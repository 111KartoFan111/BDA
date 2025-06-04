# backend/app/services/auth.py - ИСПРАВЛЕНО для использования Celery

"""
Authentication service for user management.
ИСПРАВЛЕНО: Добавлено использование Celery для отправки email
"""

from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta
import uuid
import logging

from app.core.security import (
    verify_password, get_password_hash, create_access_token, 
    create_refresh_token, verify_token, generate_password_reset_token,
    verify_password_reset_token, generate_email_verification_token,
    verify_email_verification_token
)
from app.models.user import User, UserStatus, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserLogin
from app.core.config import settings

logger = logging.getLogger(__name__)


class AuthService:
    """Authentication service class."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """
        Authenticate user with email and password.
        
        Args:
            email: User email
            password: User password
            
        Returns:
            User object if authentication successful, None otherwise
        """
        user = self.get_user_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        if user.status != UserStatus.ACTIVE:
            return None
        return user
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email.
        
        Args:
            email: User email
            
        Returns:
            User object or None
        """
        return self.db.query(User).filter(User.email == email).first()
    
    def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """
        Get user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User object or None
        """
        return self.db.query(User).filter(User.id == user_id).first()
    
    def create_user(self, user_data: UserCreate) -> User:
        """
        Create new user.
        
        Args:
            user_data: User creation data
            
        Returns:
            Created user object
        """
        # Check if user already exists
        if self.get_user_by_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create user
        user = User(
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            bio=user_data.bio,
            location=user_data.location,
            website=user_data.website,
            password_hash=get_password_hash(user_data.password),
            status=UserStatus.ACTIVE,
            role=UserRole.USER
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # Send email verification using Celery
        try:
            self.send_email_verification(user.email)
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
            # Не прерываем регистрацию из-за проблем с email
        
        # Send welcome email using Celery
        try:
            self.send_welcome_email(user.email, f"{user.first_name} {user.last_name}")
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")
        
        return user
    
    def update_user(self, user_id: uuid.UUID, user_data: UserUpdate) -> User:
        """
        Update user information.
        
        Args:
            user_id: User ID
            user_data: User update data
            
        Returns:
            Updated user object
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update fields
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def login_user(self, credentials: UserLogin) -> Dict[str, Any]:
        """
        Login user and generate tokens.
        
        Args:
            credentials: Login credentials
            
        Returns:
            Token information
        """
        user = self.authenticate_user(credentials.email, credentials.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Update last login
        user.last_login = datetime.utcnow()
        self.db.commit()
        
        # Generate tokens
        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Refresh token
            
        Returns:
            New token information
        """
        user_id = verify_token(refresh_token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        user = self.get_user_by_id(uuid.UUID(user_id))
        if not user or user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Generate new tokens
        access_token = create_access_token(subject=str(user.id))
        new_refresh_token = create_refresh_token(subject=str(user.id))
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    
    def change_password(
        self, 
        user_id: uuid.UUID, 
        current_password: str, 
        new_password: str
    ) -> bool:
        """
        Change user password.
        
        Args:
            user_id: User ID
            current_password: Current password
            new_password: New password
            
        Returns:
            True if successful
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not verify_password(current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        user.password_hash = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def forgot_password(self, email: str) -> bool:
        """
        Send password reset email.
        
        Args:
            email: User email
            
        Returns:
            True if email sent (always returns True for security)
        """
        user = self.get_user_by_email(email)
        if user and user.status == UserStatus.ACTIVE:
            token = generate_password_reset_token(email)
            
            try:
                # Используем Celery для отправки email
                from app.tasks import send_password_reset_async
                task = send_password_reset_async(email, token)
                logger.info(f"Password reset email task queued: {task.id}")
            except Exception as e:
                logger.error(f"Failed to queue password reset email: {e}")
                # Fallback - отправляем синхронно
                try:
                    from app.services.email import EmailService
                    email_service = EmailService()
                    email_service.send_password_reset_email(email, token)
                except Exception as e2:
                    logger.error(f"Failed to send password reset email synchronously: {e2}")
        
        # Always return True for security (don't reveal if email exists)
        return True
    
    def reset_password(self, token: str, new_password: str) -> bool:
        """
        Reset password using token.
        
        Args:
            token: Password reset token
            new_password: New password
            
        Returns:
            True if successful
        """
        email = verify_password_reset_token(token)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired token"
            )
        
        user = self.get_user_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.password_hash = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def send_email_verification(self, email: str) -> bool:
        """
        Send email verification.
        
        Args:
            email: User email
            
        Returns:
            True if email sent
        """
        user = self.get_user_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already verified"
            )
        
        token = generate_email_verification_token(email)
        
        try:
            # Используем Celery для отправки email
            from app.tasks import send_email_verification_async
            task = send_email_verification_async(email, token)
            logger.info(f"Email verification task queued: {task.id}")
        except Exception as e:
            logger.error(f"Failed to queue email verification: {e}")
            # Fallback - отправляем синхронно
            try:
                from app.services.email import EmailService
                email_service = EmailService()
                email_service.send_email_verification(email, token)
            except Exception as e2:
                logger.error(f"Failed to send email verification synchronously: {e2}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to send verification email"
                )
        
        return True
    
    def send_welcome_email(self, email: str, user_name: str) -> bool:
        """
        Send welcome email.
        
        Args:
            email: User email
            user_name: User name
            
        Returns:
            True if email sent
        """
        try:
            # Используем Celery для отправки email
            from app.tasks import send_welcome_email_async
            task = send_welcome_email_async(email, user_name)
            logger.info(f"Welcome email task queued: {task.id}")
            return True
        except Exception as e:
            logger.error(f"Failed to queue welcome email: {e}")
            # Fallback - отправляем синхронно
            try:
                from app.services.email import EmailService
                email_service = EmailService()
                return email_service.send_welcome_email(email, user_name)
            except Exception as e2:
                logger.error(f"Failed to send welcome email synchronously: {e2}")
                return False
    
    def verify_email(self, token: str) -> bool:
        """
        Verify email using token.
        
        Args:
            token: Email verification token
            
        Returns:
            True if successful
        """
        email = verify_email_verification_token(token)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired token"
            )
        
        user = self.get_user_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.is_email_verified = True
        user.email_verified_at = datetime.utcnow()
        user.updated_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def deactivate_user(self, user_id: uuid.UUID, reason: str = "") -> bool:
        """
        Deactivate user account.
        
        Args:
            user_id: User ID
            reason: Deactivation reason
            
        Returns:
            True if successful
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.status = UserStatus.INACTIVE
        user.updated_at = datetime.utcnow()
        
        # Store deactivation reason in settings
        if not user.settings:
            user.settings = {}
        user.settings["deactivation_reason"] = reason
        user.settings["deactivated_at"] = datetime.utcnow().isoformat()
        
        self.db.commit()
        
        return True
    
    def reactivate_user(self, user_id: uuid.UUID) -> bool:
        """
        Reactivate user account.
        
        Args:
            user_id: User ID
            
        Returns:
            True if successful
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.status = UserStatus.ACTIVE
        user.updated_at = datetime.utcnow()
        
        # Remove deactivation info from settings
        if user.settings:
            user.settings.pop("deactivation_reason", None)
            user.settings.pop("deactivated_at", None)
        
        self.db.commit()
        
        return True
    
    def update_user_role(self, user_id: uuid.UUID, role: UserRole) -> User:
        """
        Update user role (admin only).
        
        Args:
            user_id: User ID
            role: New role
            
        Returns:
            Updated user object
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.role = role
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def verify_user_platform(self, user_id: uuid.UUID) -> User:
        """
        Verify user on platform (admin only).
        
        Args:
            user_id: User ID
            
        Returns:
            Updated user object
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.is_verified = True
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def get_current_user_from_token(self, token: str) -> Optional[User]:
        """
        Get current user from JWT token.
        
        Args:
            token: JWT token
            
        Returns:
            User object or None
        """
        user_id = verify_token(token)
        if not user_id:
            return None
        
        return self.get_user_by_id(uuid.UUID(user_id))