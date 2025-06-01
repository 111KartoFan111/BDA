"""
Authentication endpoints.
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.utils.dependencies import get_current_user, get_auth_service
from app.services.auth import AuthService
from app.schemas.user import (
    UserCreate, UserLogin, User, Token, UserPasswordChange,
    UserPasswordReset, ForgotPassword, UserEmailVerification
)
from app.schemas.common import Response

router = APIRouter()
security = HTTPBearer()


@router.post("/register", response_model=Response[User])
async def register_user(
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service)
) -> Any:
    """
    Register new user.
    
    Args:
        user_data: User registration data
        auth_service: Authentication service
        
    Returns:
        Response with created user data
    """
    user = auth_service.create_user(user_data)
    return Response(
        data=user,
        message="User registered successfully. Please check your email for verification."
    )


@router.post("/login", response_model=Response[Token])
async def login_user(
    credentials: UserLogin,
    auth_service: AuthService = Depends(get_auth_service)

) -> Any:
    """
    User login.
    
    Args:
        credentials: Login credentials
        auth_service: Authentication service
        
    Returns:
        Response with access tokens
    """
    result = auth_service.login_user(credentials)
    return Response(
        data={
            "access_token": result["access_token"],
            "refresh_token": result["refresh_token"],
            "token_type": result["token_type"]
        },
        message="Login successful"
    )


@router.post("/logout", response_model=Response[None])
async def logout_user(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    User logout.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Response confirming logout
    """
    # In a production system, you might want to blacklist the token
    # For now, we just return a success response
    return Response(message="Logout successful")


@router.post("/refresh", response_model=Response[Token])
async def refresh_access_token(
    refresh_token: str = Body(..., embed=True),
    auth_service: AuthService = Depends(get_auth_service)
) -> Any:
    """
    Refresh access token.
    
    Args:
        refresh_token: Refresh token
        auth_service: Authentication service
        
    Returns:
        Response with new tokens
    """
    result = auth_service.refresh_token(refresh_token)
    return Response(
        data=result,
        message="Token refreshed successfully"
    )


@router.get("/me", response_model=Response[User])
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get current user information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Response with user data
    """
    return Response(data=current_user)


@router.patch("/profile", response_model=Response[User])
async def update_user_profile(
    profile_data: dict,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
) -> Any:
    """
    Update user profile.
    
    Args:
        profile_data: Profile update data
        current_user: Current authenticated user
        auth_service: Authentication service
        
    Returns:
        Response with updated user data
    """
    from app.schemas.user import UserUpdate
    update_data = UserUpdate(**profile_data)
    updated_user = auth_service.update_user(current_user.id, update_data)
    return Response(
        data=updated_user,
        message="Profile updated successfully"
    )


@router.patch("/change-password", response_model=Response[None])
async def change_user_password(
    password_data: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
) -> Any:
    """
    Change user password.
    
    Args:
        password_data: Password change data
        current_user: Current authenticated user
        auth_service: Authentication service
        
    Returns:
        Response confirming password change
    """
    auth_service.change_password(
        current_user.id,
        password_data.current_password,
        password_data.new_password
    )
    return Response(message="Password changed successfully")


@router.post("/forgot-password", response_model=Response[None])
async def forgot_password(
    request_data: ForgotPassword,
    auth_service: AuthService = Depends(get_auth_service)
) -> Any:
    """
    Request password reset.
    
    Args:
        request_data: Forgot password request data
        auth_service: Authentication service
        
    Returns:
        Response confirming email sent
    """
    auth_service.forgot_password(request_data.email)
    return Response(message="Password reset email sent if account exists")


@router.post("/reset-password", response_model=Response[None])
async def reset_password(
    reset_data: UserPasswordReset,
    auth_service: AuthService = Depends(get_auth_service)
) -> Any:
    """
    Reset password using token.
    
    Args:
        reset_data: Password reset data
        auth_service: Authentication service
        
    Returns:
        Response confirming password reset
    """
    auth_service.reset_password(reset_data.token, reset_data.new_password)
    return Response(message="Password reset successfully")


@router.post("/verify-email", response_model=Response[None])
async def verify_email(
    verification_data: UserEmailVerification,
    auth_service: AuthService = Depends(get_auth_service)
) -> Any:
    """
    Verify email address.
    
    Args:
        verification_data: Email verification data
        auth_service: Authentication service
        
    Returns:
        Response confirming email verification
    """
    auth_service.verify_email(verification_data.token)
    return Response(message="Email verified successfully")


@router.post("/resend-verification", response_model=Response[None])
async def resend_email_verification(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
) -> Any:
    """
    Resend email verification.
    
    Args:
        current_user: Current authenticated user
        auth_service: Authentication service
        
    Returns:
        Response confirming email sent
    """
    auth_service.send_email_verification(current_user.email)
    return Response(message="Verification email sent")