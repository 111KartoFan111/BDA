"""
Categories endpoints.
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.utils.dependencies import get_current_admin_user
from app.services.category import CategoryService
from app.schemas.item import (
    CategoryCreate, CategoryUpdate, Category, CategoryWithChildren
)
from app.schemas.common import Response

router = APIRouter()


def get_category_service(db: Session = Depends(get_db)) -> CategoryService:
    """Get category service dependency."""
    from app.services.category import CategoryService
    return CategoryService(db)


@router.get("", response_model=Response[List[CategoryWithChildren]])
async def get_categories(
    include_inactive: bool = Query(False, description="Include inactive categories"),
    category_service: CategoryService = Depends(get_category_service)
) -> Any:
    """
    Get all categories with hierarchy.
    """
    categories = category_service.get_categories_tree(include_inactive)
    return Response(data=categories)


@router.get("/flat", response_model=Response[List[Category]])
async def get_categories_flat(
    include_inactive: bool = Query(False, description="Include inactive categories"),
    category_service: CategoryService = Depends(get_category_service)
) -> Any:
    """
    Get all categories as flat list.
    """
    categories = category_service.get_categories_flat(include_inactive)
    return Response(data=categories)


@router.get("/{category_id}", response_model=Response[CategoryWithChildren])
async def get_category(
    category_id: uuid.UUID,
    category_service: CategoryService = Depends(get_category_service)
) -> Any:
    """
    Get category by ID with children.
    """
    category = category_service.get_category_with_children(category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return Response(data=category)


@router.post("", response_model=Response[Category])
async def create_category(
    category_data: CategoryCreate,
    category_service: CategoryService = Depends(get_category_service),
    current_user = Depends(get_current_admin_user)
) -> Any:
    """
    Create new category (admin only).
    """
    category = category_service.create_category(category_data)
    return Response(
        data=category,
        message="Category created successfully"
    )


@router.patch("/{category_id}", response_model=Response[Category])
async def update_category(
    category_id: uuid.UUID,
    category_data: CategoryUpdate,
    category_service: CategoryService = Depends(get_category_service),
    current_user = Depends(get_current_admin_user)
) -> Any:
    """
    Update category (admin only).
    """
    category = category_service.update_category(category_id, category_data)
    return Response(
        data=category,
        message="Category updated successfully"
    )


@router.delete("/{category_id}", response_model=Response[None])
async def delete_category(
    category_id: uuid.UUID,
    category_service: CategoryService = Depends(get_category_service),
    current_user = Depends(get_current_admin_user)
) -> Any:
    """
    Delete category (admin only).
    """
    category_service.delete_category(category_id)
    return Response(message="Category deleted successfully")


@router.get("/{category_id}/stats", response_model=Response[dict])
async def get_category_stats(
    category_id: uuid.UUID,
    category_service: CategoryService = Depends(get_category_service)
) -> Any:
    """
    Get category statistics.
    """
    stats = category_service.get_category_stats(category_id)
    return Response(data=stats)