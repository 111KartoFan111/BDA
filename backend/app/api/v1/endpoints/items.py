"""
Items endpoints.
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.utils.dependencies import get_current_user, get_optional_current_user
from app.services.item import ItemService
from app.schemas.item import (
    ItemCreate, ItemUpdate, Item, ItemDetail, ItemList, ItemSearch,
    ReviewCreate, Review, FavoriteCreate, Favorite, RentalRequest
)
from app.schemas.common import Response, PaginatedResponse
from app.models.user import User

router = APIRouter()


def get_item_service(db: Session = Depends(get_db)) -> ItemService:
    """Get item service dependency."""
    return ItemService(db)


@router.get("", response_model=PaginatedResponse[Item])
async def get_items(
    query: Optional[str] = Query(None, description="Search query"),
    category_id: Optional[uuid.UUID] = Query(None, description="Category filter"),
    min_price: Optional[float] = Query(None, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, description="Maximum price filter"),
    location: Optional[str] = Query(None, description="Location filter"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    item_service: ItemService = Depends(get_item_service),
    current_user: Optional[User] = Depends(get_optional_current_user)
) -> Any:
    """
    Get items with filtering and pagination.
    
    Args:
        query: Search query
        category_id: Category filter
        min_price: Minimum price filter
        max_price: Maximum price filter
        location: Location filter
        sort_by: Sort field
        sort_order: Sort order (asc/desc)
        page: Page number
        size: Page size
        item_service: Item service
        current_user: Optional current user
        
    Returns:
        Paginated list of items
    """
    search_params = ItemSearch(
        query=query,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        location=location,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        size=size
    )
    
    result = item_service.get_items(search_params, current_user)
    return result


@router.get("/featured", response_model=Response[List[Item]])
async def get_featured_items(
    limit: int = Query(8, ge=1, le=50, description="Number of items to return"),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Get featured items.
    
    Args:
        limit: Number of items to return
        item_service: Item service
        
    Returns:
        List of featured items
    """
    items = item_service.get_featured_items(limit)
    return Response(data=items)


@router.get("/search", response_model=PaginatedResponse[Item])
async def search_items(
    q: str = Query(..., description="Search query"),
    category_id: Optional[uuid.UUID] = Query(None, description="Category filter"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    location: Optional[str] = Query(None, description="Location"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Search items.
    
    Args:
        q: Search query
        category_id: Category filter
        min_price: Minimum price
        max_price: Maximum price
        location: Location
        page: Page number
        size: Page size
        item_service: Item service
        
    Returns:
        Search results
    """
    search_params = ItemSearch(
        query=q,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        location=location,
        page=page,
        size=size
    )
    
    result = item_service.search_items(search_params)
    return result


@router.get("/my", response_model=PaginatedResponse[Item])
async def get_my_items(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Get current user's items.
    
    Args:
        page: Page number
        size: Page size
        current_user: Current authenticated user
        item_service: Item service
        
    Returns:
        User's items
    """
    result = item_service.get_user_items(current_user.id, page, size)
    return result


@router.get("/favorites", response_model=PaginatedResponse[Item])
async def get_favorite_items(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Get user's favorite items.
    
    Args:
        page: Page number
        size: Page size
        current_user: Current authenticated user
        item_service: Item service
        
    Returns:
        User's favorite items
    """
    result = item_service.get_user_favorites(current_user.id, page, size)
    return result


@router.get("/{item_id}", response_model=Response[ItemDetail])
async def get_item(
    item_id: uuid.UUID,
    item_service: ItemService = Depends(get_item_service),
    current_user: Optional[User] = Depends(get_optional_current_user)
) -> Any:
    """
    Get item by ID.
    
    Args:
        item_id: Item ID
        item_service: Item service
        current_user: Optional current user
        
    Returns:
        Item details
    """
    item = item_service.get_item_by_id(item_id, current_user)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    return Response(data=item)


@router.post("", response_model=Response[Item])
async def create_item(
    item_data: ItemCreate,
    current_user: User = Depends(get_current_user),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Create new item.
    
    Args:
        item_data: Item creation data
        current_user: Current authenticated user
        item_service: Item service
        
    Returns:
        Created item
    """
    item = item_service.create_item(item_data, current_user.id)
    return Response(
        data=item,
        message="Item created successfully"
    )


@router.patch("/{item_id}", response_model=Response[Item])
async def update_item(
    item_id: uuid.UUID,
    item_data: ItemUpdate,
    current_user: User = Depends(get_current_user),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Update item.
    
    Args:
        item_id: Item ID
        item_data: Item update data
        current_user: Current authenticated user
        item_service: Item service
        
    Returns:
        Updated item
    """
    item = item_service.update_item(item_id, item_data, current_user.id)
    return Response(
        data=item,
        message="Item updated successfully"
    )


@router.delete("/{item_id}", response_model=Response[None])
async def delete_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Delete item.
    
    Args:
        item_id: Item ID
        current_user: Current authenticated user
        item_service: Item service
        
    Returns:
        Confirmation response
    """
    item_service.delete_item(item_id, current_user.id)
    return Response(message="Item deleted successfully")


@router.post("/{item_id}/images", response_model=Response[List[str]])
async def upload_item_images(
    item_id: uuid.UUID,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Upload images for item.
    
    Args:
        item_id: Item ID
        files: Image files
        current_user: Current authenticated user
        item_service: Item service
        
    Returns:
        List of uploaded image URLs
    """
    image_urls = await item_service.upload_item_images(item_id, files, current_user.id)
    return Response(
        data=image_urls,
        message="Images uploaded successfully"
    )


@router.delete("/{item_id}/images/{image_id}", response_model=Response[None])
async def delete_item_image(
    item_id: uuid.UUID,
    image_id: str,
    current_user: User = Depends(get_current_user),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Delete item image.
    
    Args:
        item_id: Item ID
        image_id: Image ID or URL
        current_user: Current authenticated user
        item_service: Item service
        
    Returns:
        Confirmation response
    """
    item_service.delete_item_image(item_id, image_id, current_user.id)
    return Response(message="Image deleted successfully")


@router.get("/{item_id}/similar", response_model=Response[List[Item]])
async def get_similar_items(
    item_id: uuid.UUID,
    limit: int = Query(4, ge=1, le=20, description="Number of similar items"),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Get similar items.
    
    Args:
        item_id: Item ID
        limit: Number of similar items to return
        item_service: Item service
        
    Returns:
        List of similar items
    """
    items = item_service.get_similar_items(item_id, limit)
    return Response(data=items)


@router.post("/{item_id}/favorite", response_model=Response[None])
async def add_to_favorites(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Add item to favorites.
    
    Args:
        item_id: Item ID
        current_user: Current authenticated user
        item_service: Item service
        
    Returns:
        Confirmation response
    """
    item_service.add_to_favorites(item_id, current_user.id)
    return Response(message="Item added to favorites")


@router.delete("/{item_id}/favorite", response_model=Response[None])
async def remove_from_favorites(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Remove item from favorites.
    
    Args:
        item_id: Item ID
        current_user: Current authenticated user
        item_service: Item service
        
    Returns:
        Confirmation response
    """
    item_service.remove_from_favorites(item_id, current_user.id)
    return Response(message="Item removed from favorites")


@router.post("/{item_id}/rental-request", response_model=Response[None])
async def create_rental_request(
    item_id: uuid.UUID,
    request_data: RentalRequest,
    current_user: User = Depends(get_current_user),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Create rental request for item.
    
    Args:
        item_id: Item ID
        request_data: Rental request data
        current_user: Current authenticated user
        item_service: Item service
        
    Returns:
        Confirmation response
    """
    item_service.create_rental_request(request_data, current_user.id)
    return Response(message="Rental request created successfully")


@router.get("/{item_id}/reviews", response_model=PaginatedResponse[Review])
async def get_item_reviews(
    item_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Get item reviews.
    
    Args:
        item_id: Item ID
        page: Page number
        size: Page size
        item_service: Item service
        
    Returns:
        Item reviews
    """
    result = item_service.get_item_reviews(item_id, page, size)
    return result


@router.post("/{item_id}/reviews", response_model=Response[Review])
async def create_item_review(
    item_id: uuid.UUID,
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    item_service: ItemService = Depends(get_item_service)
) -> Any:
    """
    Create item review.
    
    Args:
        item_id: Item ID
        review_data: Review data
        current_user: Current authenticated user
        item_service: Item service
        
    Returns:
        Created review
    """
    review = item_service.create_review(item_id, review_data, current_user.id)
    return Response(
        data=review,
        message="Review created successfully"
    )


@router.post("/{item_id}/view", response_model=Response[None])
async def add_item_view(
    item_id: uuid.UUID,
    item_service: ItemService = Depends(get_item_service),
    current_user: Optional[User] = Depends(get_optional_current_user)
) -> Any:
    """
    Add item view (for analytics).
    
    Args:
        item_id: Item ID
        item_service: Item service
        current_user: Optional current user
        
    Returns:
        Confirmation response
    """
    user_id = current_user.id if current_user else None
    item_service.add_item_view(item_id, user_id)
    return Response(message="View recorded")