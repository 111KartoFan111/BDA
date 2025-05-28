# backend/app/services/item.py - исправленная версия

"""
Item service for managing rental items.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status, UploadFile
from datetime import datetime
import uuid
import os
import shutil
from PIL import Image
import logging

from app.models.item import Item, Category, ItemStatus, Favorite, ItemView, Review
from app.models.user import User
from app.schemas.item import (
    ItemCreate, ItemUpdate, ItemSearch, ReviewCreate, RentalRequest
)
from app.schemas.common import PaginatedResponse, PaginationMeta
from app.core.config import settings
from app.utils.exceptions import NotFoundError, ForbiddenError, BadRequestError

logger = logging.getLogger(__name__)


class ItemService:
    """Service for managing rental items."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_items(
        self, 
        search_params: ItemSearch, 
        current_user: Optional[User] = None
        ) -> PaginatedResponse:
        """
        Get items with filtering and pagination.
        """
        query = self.db.query(Item).filter(
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True,
            Item.is_available == True
        )

        # Apply filters
        if search_params.query:
            search_term = f"%{search_params.query}%"
            query = query.filter(
                or_(
                    Item.title.ilike(search_term),
                    Item.description.ilike(search_term),
                    Item.tags.contains([search_params.query])
                )
            )

        if search_params.category_id:
            query = query.filter(Item.category_id == search_params.category_id)

        if search_params.min_price is not None:
            query = query.filter(Item.price_per_day >= search_params.min_price)

        if search_params.max_price is not None:
            query = query.filter(Item.price_per_day <= search_params.max_price)

        if search_params.location:
            query = query.filter(Item.location.ilike(f"%{search_params.location}%"))

        if search_params.condition:
            query = query.filter(Item.condition == search_params.condition)

        if search_params.available_from:
            query = query.filter(
                or_(
                    Item.available_from.is_(None),
                    Item.available_from <= search_params.available_from
                )
            )

        if search_params.available_to:
            query = query.filter(
                or_(
                    Item.available_to.is_(None),
                    Item.available_to >= search_params.available_to
                )
            )

        # Apply sorting
        sort_field = getattr(Item, search_params.sort_by, Item.created_at)
        if search_params.sort_order.lower() == "asc":
            query = query.order_by(asc(sort_field))
        else:
            query = query.order_by(desc(sort_field))

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (search_params.page - 1) * search_params.size
        items = query.offset(offset).limit(search_params.size).all()

        # Преобразуем SQLAlchemy объекты в словари
        items_data = []
        for item in items:
            try:
                # Создаем данные для owner
                owner_data = {
                    "id": item.owner.id,
                    "email": item.owner.email,
                    "first_name": item.owner.first_name,
                    "last_name": item.owner.last_name,
                    "avatar": item.owner.avatar,
                    "is_verified": item.owner.is_verified,
                    "rating": float(item.owner.rating) if item.owner.rating else None,
                    "total_reviews": item.owner.total_reviews
                }
                
                # Создаем данные для category
                category_data = {
                    "id": item.category.id,
                    "name": item.category.name,
                    "slug": item.category.slug,
                    "description": item.category.description,
                    "icon": item.category.icon,
                    "image": item.category.image,
                    "parent_id": item.category.parent_id,
                    "level": item.category.level,
                    "sort_order": item.category.sort_order,
                    "is_active": item.category.is_active,
                    "created_at": item.category.created_at,
                    "updated_at": item.category.updated_at
                }
                
                # Создаем данные для item
                item_data = {
                    "id": item.id,
                    "title": item.title,
                    "description": item.description,
                    "category_id": item.category_id,
                    "owner_id": item.owner_id,
                    "price_per_day": item.price_per_day,
                    "deposit": item.deposit,
                    "location": item.location,
                    "condition": item.condition.value if hasattr(item.condition, 'value') else item.condition,
                    "brand": item.brand,
                    "model": item.model,
                    "year": item.year,
                    "min_rental_days": item.min_rental_days,
                    "max_rental_days": item.max_rental_days,
                    "terms": item.terms,
                    "tags": item.tags or [],
                    "slug": item.slug,
                    "status": item.status.value if hasattr(item.status, 'value') else item.status,
                    "is_featured": item.is_featured,
                    "is_available": item.is_available,
                    "is_approved": item.is_approved,
                    "images": item.images or [],
                    "documents": item.documents or [],
                    "views_count": item.views_count,
                    "favorites_count": item.favorites_count,
                    "rentals_count": item.rentals_count,
                    "rating": float(item.rating) if item.rating else None,
                    "total_reviews": item.total_reviews,
                    "available_from": item.available_from,
                    "available_to": item.available_to,
                    "created_at": item.created_at,
                    "updated_at": item.updated_at,
                    "published_at": item.published_at,
                    "category": category_data,
                    "owner": owner_data
                }
                
                items_data.append(item_data)
            except Exception as e:
                logger.error(f"Error processing item {item.id}: {e}")
                continue

        # Calculate pagination meta
        pages = (total + search_params.size - 1) // search_params.size
    
        return PaginatedResponse(
            items=items_data,
            meta=PaginationMeta(
                page=search_params.page,
                size=search_params.size,
                total=total,
                pages=pages,
                has_next=search_params.page < pages,
                has_prev=search_params.page > 1
            )
        )

    def get_item_by_id(
        self, 
        item_id: uuid.UUID, 
        current_user: Optional[User] = None
    ) -> Optional[Item]:
        """
        Get item by ID.
        """
        item = self.db.query(Item).filter(Item.id == item_id).first()
        
        if not item:
            return None
        
        # Check if user can view this item
        if (item.status != ItemStatus.ACTIVE or not item.is_approved) and \
           (not current_user or current_user.id != item.owner_id):
            return None
        
        return item
    
    def create_item(self, item_data: ItemCreate, owner_id: uuid.UUID) -> Item:
        """
        Create new item.
        
        ИСПРАВЛЕНО: Добавлен commit, улучшена обработка ошибок
        """
        try:
            # Проверяем, что категория существует
            category = self.db.query(Category).filter(Category.id == item_data.category_id).first()
            if not category:
                raise BadRequestError("Category not found")
            
            # Генерируем slug из заголовка
            slug = self._generate_slug(item_data.title)
            
            item = Item(
                title=item_data.title,
                description=item_data.description,
                category_id=item_data.category_id,
                owner_id=owner_id,
                price_per_day=item_data.price_per_day,
                deposit=item_data.deposit or 0,
                location=item_data.location,
                condition=item_data.condition,
                brand=item_data.brand,
                model=item_data.model,
                year=item_data.year,
                available_from=item_data.available_from,
                available_to=item_data.available_to,
                min_rental_days=item_data.min_rental_days,
                max_rental_days=item_data.max_rental_days,
                terms=item_data.terms,
                tags=item_data.tags or [],
                slug=slug,
                status=ItemStatus.DRAFT,  # Новые items создаются как черновики
                is_approved=False,  # Требуют одобрения
                is_available=True
            )
            
            self.db.add(item)
            self.db.commit()
            self.db.refresh(item)
            
            logger.info(f"Item created successfully: {item.id}")
            return item
            
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Database error creating item: {e}")
            print(f"Database error creating item: {e}")
            raise BadRequestError(f"Database error: {str(e)}")
        except Exception as e:
            self.db.rollback()
            print(f"Error creating item: {e}")
            raise BadRequestError(f"Failed to create item: {str(e)}")

    def update_item(
        self, 
        item_id: uuid.UUID, 
        item_data: ItemUpdate, 
        user_id: uuid.UUID
    ) -> Item:
        """
        Update item.
        """
        try:
            item = self.db.query(Item).filter(Item.id == item_id).first()
            
            if not item:
                raise NotFoundError("Item", str(item_id))
            
            if item.owner_id != user_id:
                raise ForbiddenError("You can only update your own items")
            
            # Update fields
            update_data = item_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                if field == "title" and value:
                    # Update slug if title changes
                    item.slug = self._generate_slug(value)
                setattr(item, field, value)
            
            item.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(item)
            
            return item
        except SQLAlchemyError as e:
            self.db.rollback()
            raise BadRequestError(f"Database error: {str(e)}")
    
    def delete_item(self, item_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """
        Delete item.
        """
        try:
            item = self.db.query(Item).filter(Item.id == item_id).first()
            
            if not item:
                raise NotFoundError("Item", str(item_id))
            
            if item.owner_id != user_id:
                raise ForbiddenError("You can only delete your own items")
            
            # Check if item has active contracts
            from app.models.contract import Contract, ContractStatus
            active_contracts = self.db.query(Contract).filter(
                Contract.item_id == item_id,
                Contract.status.in_([ContractStatus.ACTIVE, ContractStatus.PENDING])
            ).count()
            
            if active_contracts > 0:
                raise BadRequestError("Cannot delete item with active contracts")
            
            # Soft delete by changing status
            item.status = ItemStatus.ARCHIVED
            item.updated_at = datetime.utcnow()
            self.db.commit()
            
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            raise BadRequestError(f"Database error: {str(e)}")
    
    async def upload_item_images(
        self, 
        item_id: uuid.UUID, 
        files: List[UploadFile], 
        user_id: uuid.UUID
    ) -> List[str]:
        """
        Upload images for item.
        """
        try:
            item = self.db.query(Item).filter(Item.id == item_id).first()
            
            if not item:
                raise NotFoundError("Item", str(item_id))
            
            if item.owner_id != user_id:
                raise ForbiddenError("You can only upload images for your own items")
            
            if len(files) > 10:
                raise BadRequestError("Maximum 10 images allowed")
            
            uploaded_urls = []
            
            for file in files:
                # Validate file
                if not self._is_valid_image(file):
                    raise BadRequestError(f"Invalid image file: {file.filename}")
                
                # Save file
                filename = f"{uuid.uuid4()}_{file.filename}"
                file_path = os.path.join(settings.UPLOAD_DIR, "items", filename)
                
                # Create directory if not exists
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                
                # Save file
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                # Create thumbnail
                self._create_thumbnail(file_path)
                
                # Generate URL
                url = f"/uploads/items/{filename}"
                uploaded_urls.append(url)
            
            # Update item images
            if not item.images:
                item.images = []
            
            item.images.extend(uploaded_urls)
            item.updated_at = datetime.utcnow()
            self.db.commit()
            
            return uploaded_urls
        except SQLAlchemyError as e:
            self.db.rollback()
            raise BadRequestError(f"Database error: {str(e)}")
    
    def delete_item_image(
        self, 
        item_id: uuid.UUID, 
        image_url: str, 
        user_id: uuid.UUID
    ) -> bool:
        """
        Delete item image.
        """
        try:
            item = self.db.query(Item).filter(Item.id == item_id).first()
            
            if not item:
                raise NotFoundError("Item", str(item_id))
            
            if item.owner_id != user_id:
                raise ForbiddenError("You can only delete images from your own items")
            
            if not item.images or image_url not in item.images:
                raise NotFoundError("Image not found")
            
            # Remove from database
            item.images.remove(image_url)
            item.updated_at = datetime.utcnow()
            self.db.commit()
            
            # Delete file
            filename = image_url.split("/")[-1]
            file_path = os.path.join(settings.UPLOAD_DIR, "items", filename)
            
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # Delete thumbnail
            thumb_path = file_path.replace(".", "_thumb.")
            if os.path.exists(thumb_path):
                os.remove(thumb_path)
            
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            raise BadRequestError(f"Database error: {str(e)}")
    
    def get_featured_items(self, limit: int = 8) -> List[Item]:
        """
        Get featured items.
        """
        return self.db.query(Item).filter(
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True,
            Item.is_featured == True
        ).limit(limit).all()
    
    def get_similar_items(self, item_id: uuid.UUID, limit: int = 4) -> List[Item]:
        """
        Get similar items based on category and tags.
        """
        item = self.db.query(Item).filter(Item.id == item_id).first()
        
        if not item:
            return []
        
        # Get items from same category
        similar_items = self.db.query(Item).filter(
            Item.category_id == item.category_id,
            Item.id != item_id,
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True
        ).limit(limit).all()
        
        return similar_items
    
    def add_to_favorites(self, item_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """
        Add item to user favorites.
        """
        try:
            # Check if already in favorites
            existing = self.db.query(Favorite).filter(
                Favorite.item_id == item_id,
                Favorite.user_id == user_id
            ).first()
            
            if existing:
                return True
            
            # Add to favorites
            favorite = Favorite(item_id=item_id, user_id=user_id)
            self.db.add(favorite)
            
            # Update item favorites count
            item = self.db.query(Item).filter(Item.id == item_id).first()
            if item:
                item.favorites_count = (item.favorites_count or 0) + 1
            
            self.db.commit()
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            raise BadRequestError(f"Database error: {str(e)}")
    
    def remove_from_favorites(self, item_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """
        Remove item from user favorites.
        """
        try:
            favorite = self.db.query(Favorite).filter(
                Favorite.item_id == item_id,
                Favorite.user_id == user_id
            ).first()
            
            if not favorite:
                return True
            
            self.db.delete(favorite)
            
            # Update item favorites count
            item = self.db.query(Item).filter(Item.id == item_id).first()
            if item and item.favorites_count > 0:
                item.favorites_count -= 1
            
            self.db.commit()
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            raise BadRequestError(f"Database error: {str(e)}")
    
    def get_user_items(
        self, 
        user_id: uuid.UUID, 
        page: int = 1, 
        size: int = 20
    ) -> PaginatedResponse:
        """
        Get user's items.
        """
        try:
            query = self.db.query(Item).filter(Item.owner_id == user_id)
            
            total = query.count()
            offset = (page - 1) * size
            items = query.offset(offset).limit(size).all()
            
            pages = (total + size - 1) // size
            
            return PaginatedResponse(
                items=items,
                meta=PaginationMeta(
                    page=page,
                    size=size,
                    total=total,
                    pages=pages,
                    has_next=page < pages,
                    has_prev=page > 1
                )
            )
        except SQLAlchemyError as e:
            raise BadRequestError(f"Database error: {str(e)}")
    
    def get_user_favorites(
        self, 
        user_id: uuid.UUID, 
        page: int = 1, 
        size: int = 20
    ) -> PaginatedResponse:
        """
        Get user's favorite items.
        """
        try:
            query = self.db.query(Item).join(Favorite).filter(
                Favorite.user_id == user_id,
                Item.status == ItemStatus.ACTIVE,
                Item.is_approved == True
            )
            
            total = query.count()
            offset = (page - 1) * size
            items = query.offset(offset).limit(size).all()
            
            pages = (total + size - 1) // size
            
            return PaginatedResponse(
                items=items,
                meta=PaginationMeta(
                    page=page,
                    size=size,
                    total=total,
                    pages=pages,
                    has_next=page < pages,
                    has_prev=page > 1
                )
            )
        except SQLAlchemyError as e:
            raise BadRequestError(f"Database error: {str(e)}")
    
    def search_items(self, search_params: ItemSearch) -> PaginatedResponse:
        """
        Advanced search for items.
        """
        # This is a simplified version - in production you might use Elasticsearch
        return self.get_items(search_params)
    
    def add_item_view(self, item_id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> bool:
        """
        Add item view for analytics.
        """
        try:
            view = ItemView(
                item_id=item_id,
                user_id=user_id,
                created_at=datetime.utcnow()
            )
            
            self.db.add(view)
            
            # Update item views count
            item = self.db.query(Item).filter(Item.id == item_id).first()
            if item:
                item.views_count = (item.views_count or 0) + 1
            
            self.db.commit()
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error adding item view: {e}")
            return False
    
    def create_review(
        self, 
        item_id: uuid.UUID, 
        review_data: ReviewCreate, 
        reviewer_id: uuid.UUID
    ) -> Review:
        """
        Create item review.
        """
        try:
            item = self.db.query(Item).filter(Item.id == item_id).first()
            
            if not item:
                raise NotFoundError("Item", str(item_id))
            
            # Check if user has rented this item
            from app.models.contract import Contract, ContractStatus
            has_rented = self.db.query(Contract).filter(
                Contract.item_id == item_id,
                Contract.tenant_id == reviewer_id,
                Contract.status == ContractStatus.COMPLETED
            ).first()
            
            if not has_rented:
                raise BadRequestError("You can only review items you have rented")
            
            # Check if already reviewed
            existing_review = self.db.query(Review).filter(
                Review.item_id == item_id,
                Review.reviewer_id == reviewer_id
            ).first()
            
            if existing_review:
                raise BadRequestError("You have already reviewed this item")
            
            review = Review(
                item_id=item_id,
                reviewer_id=reviewer_id,
                contract_id=review_data.contract_id,
                rating=review_data.rating,
                title=review_data.title,
                comment=review_data.comment,
                ratings=review_data.ratings
            )
            
            self.db.add(review)
            
            # Update item rating
            self._update_item_rating(item_id)
            
            self.db.commit()
            self.db.refresh(review)
            
            return review
        except SQLAlchemyError as e:
            self.db.rollback()
            raise BadRequestError(f"Database error: {str(e)}")
    
    def get_item_reviews(
        self, 
        item_id: uuid.UUID, 
        page: int = 1, 
        size: int = 20
    ) -> PaginatedResponse:
        """
        Get item reviews.
        """
        try:
            query = self.db.query(Review).filter(
                Review.item_id == item_id,
                Review.is_approved == True
            )
            
            total = query.count()
            offset = (page - 1) * size
            reviews = query.offset(offset).limit(size).all()
            
            pages = (total + size - 1) // size
            
            return PaginatedResponse(
                items=reviews,
                meta=PaginationMeta(
                    page=page,
                    size=size,
                    total=total,
                    pages=pages,
                    has_next=page < pages,
                    has_prev=page > 1
                )
            )
        except SQLAlchemyError as e:
            raise BadRequestError(f"Database error: {str(e)}")
    
    def create_rental_request(
        self, 
        request_data: RentalRequest, 
        tenant_id: uuid.UUID
    ) -> bool:
        """
        Create rental request (creates a contract).
        """
        try:
            from app.services.contract import ContractService
            from app.schemas.contract import ContractCreate
            
            item = self.db.query(Item).filter(Item.id == request_data.item_id).first()
            
            if not item:
                raise NotFoundError("Item", str(request_data.item_id))
            
            if not item.is_available:
                raise BadRequestError("Item is not available for rent")
            
            if item.owner_id == tenant_id:
                raise BadRequestError("You cannot rent your own item")
            
            # Create contract
            contract_service = ContractService(self.db)
            contract_data = ContractCreate(
                item_id=request_data.item_id,
                tenant_id=tenant_id,
                start_date=request_data.start_date,
                end_date=request_data.end_date,
                total_price=request_data.total_price,
                deposit=item.deposit
            )
            
            contract_service.create_contract(contract_data, item.owner_id)
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            raise BadRequestError(f"Database error: {str(e)}")
    
    def _generate_slug(self, title: str) -> str:
        """
        Generate URL slug from title.
        """
        import re
        try:
            import unidecode
            slug = unidecode.unidecode(title.lower())
        except ImportError:
            # Fallback if unidecode is not available
            slug = title.lower()
        
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        slug = re.sub(r'[\s_-]+', '-', slug)
        slug = slug.strip('-')
        
        # Ensure uniqueness
        base_slug = slug
        counter = 1
        
        while self.db.query(Item).filter(Item.slug == slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        return slug
    
    def _is_valid_image(self, file: UploadFile) -> bool:
        """
        Validate image file.
        """
        # Check file size
        if hasattr(file, 'size') and file.size and file.size > settings.MAX_FILE_SIZE:
            return False
        
        # Check content type
        if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
            return False
        
        return True
    
    def _create_thumbnail(self, file_path: str, size: tuple = (300, 300)) -> str:
        """
        Create thumbnail for image.
        """
        try:
            with Image.open(file_path) as img:
                img.thumbnail(size, Image.Resampling.LANCZOS)
                
                # Generate thumbnail path
                path_parts = file_path.rsplit('.', 1)
                thumb_path = f"{path_parts[0]}_thumb.{path_parts[1]}"
                
                img.save(thumb_path, optimize=True, quality=85)
                return thumb_path
        except Exception as e:
            logger.error(f"Error creating thumbnail: {e}")
            return file_path
    
    def _update_item_rating(self, item_id: uuid.UUID) -> None:
        """
        Update item rating based on reviews.
        """
        try:
            # Calculate average rating
            result = self.db.query(
                func.avg(Review.rating).label('avg_rating'),
                func.count(Review.id).label('review_count')
            ).filter(
                Review.item_id == item_id,
                Review.is_approved == True
            ).first()
            
            item = self.db.query(Item).filter(Item.id == item_id).first()
            if item:
                item.rating = float(result.avg_rating) if result.avg_rating else None
                item.total_reviews = result.review_count or 0
        except Exception as e:
            logger.error(f"Error updating item rating: {e}")