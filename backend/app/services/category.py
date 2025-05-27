"""
Category service for managing item categories.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from fastapi import HTTPException, status
from datetime import datetime
import uuid

from app.models.item import Category, Item, ItemStatus
from app.schemas.item import CategoryCreate, CategoryUpdate, CategoryWithChildren
from app.utils.exceptions import NotFoundError, BadRequestError


class CategoryService:
    """Service for managing categories."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_category_by_id(self, category_id: uuid.UUID) -> Optional[Category]:
        """
        Get category by ID.
        
        Args:
            category_id: Category ID
            
        Returns:
            Category or None
        """
        return self.db.query(Category).filter(Category.id == category_id).first()
    
    def get_categories_tree(self, include_inactive: bool = False) -> List[CategoryWithChildren]:
        """
        Get categories organized as a tree structure.
        
        Args:
            include_inactive: Whether to include inactive categories
            
        Returns:
            List of root categories with children
        """
        # Get all categories
        query = self.db.query(Category)
        if not include_inactive:
            query = query.filter(Category.is_active == True)
        
        categories = query.order_by(Category.sort_order, Category.name).all()
        
        # Build tree structure
        category_dict = {cat.id: cat for cat in categories}
        root_categories = []
        
        for category in categories:
            if category.parent_id is None:
                # Root category
                cat_with_children = self._build_category_tree(category, category_dict)
                root_categories.append(cat_with_children)
        
        return root_categories
    
    def get_categories_flat(self, include_inactive: bool = False) -> List[Category]:
        """
        Get all categories as a flat list.
        
        Args:
            include_inactive: Whether to include inactive categories
            
        Returns:
            List of categories
        """
        query = self.db.query(Category)
        if not include_inactive:
            query = query.filter(Category.is_active == True)
        
        return query.order_by(Category.sort_order, Category.name).all()
    
    def get_category_with_children(self, category_id: uuid.UUID) -> Optional[CategoryWithChildren]:
        """
        Get category with its children.
        
        Args:
            category_id: Category ID
            
        Returns:
            Category with children or None
        """
        category = self.get_category_by_id(category_id)
        if not category:
            return None
        
        # Get all categories to build tree
        all_categories = self.db.query(Category).filter(Category.is_active == True).all()
        category_dict = {cat.id: cat for cat in all_categories}
        
        return self._build_category_tree(category, category_dict)
    
    def create_category(self, category_data: CategoryCreate) -> Category:
        """
        Create new category.
        
        Args:
            category_data: Category creation data
            
        Returns:
            Created category
        """
        # Check if slug is unique
        existing = self.db.query(Category).filter(Category.slug == category_data.slug).first()
        if existing:
            raise BadRequestError("Category with this slug already exists")
        
        # Validate parent if specified
        if category_data.parent_id:
            parent = self.get_category_by_id(category_data.parent_id)
            if not parent:
                raise NotFoundError("Parent category", str(category_data.parent_id))
            level = parent.level + 1
        else:
            level = 0
        
        category = Category(
            name=category_data.name,
            slug=category_data.slug,
            description=category_data.description,
            icon=category_data.icon,
            image=category_data.image,
            parent_id=category_data.parent_id,
            level=level,
            sort_order=category_data.sort_order
        )
        
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def update_category(self, category_id: uuid.UUID, category_data: CategoryUpdate) -> Category:
        """
        Update category.
        
        Args:
            category_id: Category ID
            category_data: Category update data
            
        Returns:
            Updated category
        """
        category = self.get_category_by_id(category_id)
        if not category:
            raise NotFoundError("Category", str(category_id))
        
        # Update fields
        update_data = category_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)
        
        category.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def delete_category(self, category_id: uuid.UUID) -> bool:
        """
        Delete category (soft delete).
        
        Args:
            category_id: Category ID
            
        Returns:
            True if deleted
        """
        category = self.get_category_by_id(category_id)
        if not category:
            raise NotFoundError("Category", str(category_id))
        
        # Check if category has items
        items_count = self.db.query(Item).filter(
            Item.category_id == category_id,
            Item.status != ItemStatus.ARCHIVED
        ).count()
        
        if items_count > 0:
            raise BadRequestError("Cannot delete category with active items")
        
        # Check if category has children
        children_count = self.db.query(Category).filter(
            Category.parent_id == category_id,
            Category.is_active == True
        ).count()
        
        if children_count > 0:
            raise BadRequestError("Cannot delete category with active subcategories")
        
        # Soft delete
        category.is_active = False
        category.updated_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def get_category_stats(self, category_id: uuid.UUID) -> Dict[str, Any]:
        """
        Get category statistics.
        
        Args:
            category_id: Category ID
            
        Returns:
            Category statistics
        """
        category = self.get_category_by_id(category_id)
        if not category:
            raise NotFoundError("Category", str(category_id))
        
        # Get all child category IDs (including self)
        child_ids = self._get_all_child_ids(category_id)
        child_ids.append(category_id)
        
        # Count items in this category and subcategories
        total_items = self.db.query(Item).filter(
            Item.category_id.in_(child_ids)
        ).count()
        
        active_items = self.db.query(Item).filter(
            Item.category_id.in_(child_ids),
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True
        ).count()
        
        # Average price
        avg_price_result = self.db.query(func.avg(Item.price_per_day)).filter(
            Item.category_id.in_(child_ids),
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True
        ).scalar()
        
        avg_price = float(avg_price_result) if avg_price_result else 0.0
        
        # Most popular items
        popular_items = self.db.query(Item).filter(
            Item.category_id.in_(child_ids),
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True
        ).order_by(desc(Item.views_count)).limit(5).all()
        
        return {
            "category_id": category_id,
            "category_name": category.name,
            "total_items": total_items,
            "active_items": active_items,
            "average_price": avg_price,
            "popular_items": [
                {
                    "id": item.id,
                    "title": item.title,
                    "price_per_day": float(item.price_per_day),
                    "views_count": item.views_count
                }
                for item in popular_items
            ]
        }
    
    def get_popular_categories(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get most popular categories by item count.
        
        Args:
            limit: Number of categories to return
            
        Returns:
            List of popular categories
        """
        # Query to get categories with item counts
        result = self.db.query(
            Category,
            func.count(Item.id).label('item_count')
        ).outerjoin(
            Item, and_(
                Item.category_id == Category.id,
                Item.status == ItemStatus.ACTIVE,
                Item.is_approved == True
            )
        ).filter(
            Category.is_active == True
        ).group_by(Category.id).order_by(
            desc(func.count(Item.id))
        ).limit(limit).all()
        
        return [
            {
                "id": category.id,
                "name": category.name,
                "slug": category.slug,
                "icon": category.icon,
                "item_count": item_count
            }
            for category, item_count in result
        ]
    
    def search_categories(self, query: str) -> List[Category]:
        """
        Search categories by name or description.
        
        Args:
            query: Search query
            
        Returns:
            List of matching categories
        """
        search_term = f"%{query}%"
        return self.db.query(Category).filter(
            Category.is_active == True,
            or_(
                Category.name.ilike(search_term),
                Category.description.ilike(search_term)
            )
        ).order_by(Category.name).all()
    
    def get_category_breadcrumbs(self, category_id: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Get category breadcrumbs (path from root to current category).
        
        Args:
            category_id: Category ID
            
        Returns:
            List of breadcrumb categories
        """
        breadcrumbs = []
        current_category = self.get_category_by_id(category_id)
        
        while current_category:
            breadcrumbs.insert(0, {
                "id": current_category.id,
                "name": current_category.name,
                "slug": current_category.slug
            })
            
            if current_category.parent_id:
                current_category = self.get_category_by_id(current_category.parent_id)
            else:
                current_category = None
        
        return breadcrumbs
    
    def move_category(self, category_id: uuid.UUID, new_parent_id: Optional[uuid.UUID]) -> Category:
        """
        Move category to a new parent.
        
        Args:
            category_id: Category ID to move
            new_parent_id: New parent category ID (None for root)
            
        Returns:
            Updated category
        """
        category = self.get_category_by_id(category_id)
        if not category:
            raise NotFoundError("Category", str(category_id))
        
        # Validate new parent
        if new_parent_id:
            new_parent = self.get_category_by_id(new_parent_id)
            if not new_parent:
                raise NotFoundError("Parent category", str(new_parent_id))
            
            # Check for circular reference
            if self._would_create_cycle(category_id, new_parent_id):
                raise BadRequestError("Cannot move category: would create circular reference")
            
            new_level = new_parent.level + 1
        else:
            new_level = 0
        
        # Update category
        category.parent_id = new_parent_id
        category.level = new_level
        category.updated_at = datetime.utcnow()
        
        # Update levels of all children recursively
        self._update_children_levels(category)
        
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def reorder_categories(self, category_orders: List[Dict[str, Any]]) -> bool:
        """
        Reorder categories by updating sort_order.
        
        Args:
            category_orders: List of {"id": uuid, "sort_order": int}
            
        Returns:
            True if successful
        """
        try:
            for order_data in category_orders:
                category = self.get_category_by_id(order_data["id"])
                if category:
                    category.sort_order = order_data["sort_order"]
                    category.updated_at = datetime.utcnow()
            
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise BadRequestError(f"Failed to reorder categories: {str(e)}")
    
    def _build_category_tree(self, category: Category, category_dict: Dict[uuid.UUID, Category]) -> CategoryWithChildren:
        """
        Build category tree recursively.
        
        Args:
            category: Current category
            category_dict: Dictionary of all categories
            
        Returns:
            Category with children
        """
        # Find children
        children = []
        for cat_id, cat in category_dict.items():
            if cat.parent_id == category.id:
                child_with_children = self._build_category_tree(cat, category_dict)
                children.append(child_with_children)
        
        # Sort children
        children.sort(key=lambda x: (x.sort_order, x.name))
        
        return CategoryWithChildren(
            **category.__dict__,
            children=children
        )
    
    def _get_all_child_ids(self, category_id: uuid.UUID) -> List[uuid.UUID]:
        """
        Get all child category IDs recursively.
        
        Args:
            category_id: Parent category ID
            
        Returns:
            List of child category IDs
        """
        child_ids = []
        direct_children = self.db.query(Category).filter(
            Category.parent_id == category_id,
            Category.is_active == True
        ).all()
        
        for child in direct_children:
            child_ids.append(child.id)
            # Recursively get grandchildren
            grandchild_ids = self._get_all_child_ids(child.id)
            child_ids.extend(grandchild_ids)
        
        return child_ids
    
    def _would_create_cycle(self, category_id: uuid.UUID, new_parent_id: uuid.UUID) -> bool:
        """
        Check if moving category would create a circular reference.
        
        Args:
            category_id: Category to move
            new_parent_id: Proposed new parent
            
        Returns:
            True if would create cycle
        """
        # Check if new_parent_id is a descendant of category_id
        child_ids = self._get_all_child_ids(category_id)
        return new_parent_id in child_ids
    
    def _update_children_levels(self, category: Category) -> None:
        """
        Update levels of all children recursively.
        
        Args:
            category: Parent category
        """
        children = self.db.query(Category).filter(Category.parent_id == category.id).all()
        
        for child in children:
            child.level = category.level + 1
            child.updated_at = datetime.utcnow()
            
            # Recursively update grandchildren
            self._update_children_levels(child)