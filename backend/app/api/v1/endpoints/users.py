"""
Users endpoints.
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.utils.dependencies import get_current_user, get_current_admin_user
from app.services.user import UserService
from app.schemas.user import User, UserUpdate, UserStats, UserProfile
from app.schemas.common import Response, PaginatedResponse

router = APIRouter()


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    """Get user service dependency."""
    from app.services.user import UserService
    return UserService(db)


@router.get("/me", response_model=Response[UserProfile])
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
) -> Any:
    """
    Get current user profile with extended information.
    """
    profile = user_service.get_user_profile(current_user.id)
    return Response(data=profile)


@router.patch("/me", response_model=Response[User])
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
) -> Any:
    """
    Update current user profile.
    """
    updated_user = user_service.update_user(current_user.id, user_data)
    return Response(
        data=updated_user,
        message="Profile updated successfully"
    )


@router.get("/me/stats", response_model=Response[UserStats])
async def get_current_user_stats(
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
) -> Any:
    """
    Get current user statistics.
    """
    stats = user_service.get_user_stats(current_user.id)
    return Response(data=stats)


@router.get("/{user_id}", response_model=Response[UserProfile])
async def get_user_by_id(
    user_id: uuid.UUID,
    user_service: UserService = Depends(get_user_service)
) -> Any:
    """
    Get user profile by ID (public information only).
    """
    profile = user_service.get_public_user_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return Response(data=profile)


@router.get("/{user_id}/stats", response_model=Response[UserStats])
async def get_user_stats(
    user_id: uuid.UUID,
    user_service: UserService = Depends(get_user_service)
) -> Any:
    """
    Get user statistics (public).
    """
    stats = user_service.get_user_stats(user_id)
    return Response(data=stats)


@router.get("", response_model=PaginatedResponse[User])
async def get_users(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    search: Optional[str] = Query(None, description="Search query"),
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get users list (admin only).
    """
    result = user_service.get_users(page, size, search)
    return result


@router.patch("/{user_id}/verify", response_model=Response[User])
async def verify_user(
    user_id: uuid.UUID,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Verify user (admin only).
    """
    user = user_service.verify_user(user_id)
    return Response(
        data=user,
        message="User verified successfully"
    )


@router.patch("/{user_id}/suspend", response_model=Response[None])
async def suspend_user(
    user_id: uuid.UUID,
    reason: str,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Suspend user (admin only).
    """
    user_service.suspend_user(user_id, reason)
    return Response(message="User suspended successfully")


@router.patch("/{user_id}/unsuspend", response_model=Response[None])
async def unsuspend_user(
    user_id: uuid.UUID,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Unsuspend user (admin only).
    """
    user_service.unsuspend_user(user_id)
    return Response(message="User unsuspended successfully")