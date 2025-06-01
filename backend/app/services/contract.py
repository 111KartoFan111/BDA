"""
Полный исправленный ContractService с правильной сериализацией данных.
Заменяет backend/app/services/contract.py
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from fastapi import HTTPException, status
from datetime import datetime, timedelta
import uuid
import pytz

from app.models.contract import (
    Contract, ContractStatus, ContractMessage, Payment, PaymentStatus,
    Dispute, DisputeStatus, ContractHistory
)
from app.models.item import Item
from app.models.user import User
from app.schemas.contract import (
    ContractCreate, ContractUpdate, ContractMessageCreate,
    PaymentCreate, DisputeCreate, DisputeUpdate, UserMinimal, ItemMinimal
)
from app.schemas.common import PaginatedResponse, PaginationMeta
from app.utils.exceptions import NotFoundError, ForbiddenError, BadRequestError
from app.services.notification import NotificationService


class ContractService:
    """Service for managing rental contracts."""
    
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    def _ensure_timezone_aware(self, dt: datetime) -> datetime:
        """
        Убедиться, что datetime объект timezone-aware.
        Если timezone отсутствует, считаем что это UTC.
        """
        if dt.tzinfo is None:
            # Если timezone не указан, считаем что это UTC
            return pytz.UTC.localize(dt)
        return dt
    
    def _get_current_utc_time(self) -> datetime:
        """Получить текущее время в UTC с timezone."""
        return datetime.now(pytz.UTC)
    
    def _contract_to_dict(self, contract: Contract) -> Dict[str, Any]:
        """
        Преобразовать объект Contract в словарь для API ответа.
        
        Args:
            contract: SQLAlchemy объект контракта
            
        Returns:
            Словарь с данными контракта
        """
        # Базовые данные контракта
        contract_data = {
            "id": contract.id,
            "tenant_id": contract.tenant_id,
            "owner_id": contract.owner_id,
            "item_id": contract.item_id,
            "start_date": contract.start_date,
            "end_date": contract.end_date,
            "total_price": contract.total_price,
            "deposit": contract.deposit,
            "currency": contract.currency,
            "terms": contract.terms,
            "special_conditions": contract.special_conditions,
            "status": contract.status,
            "tenant_signature": contract.tenant_signature,
            "owner_signature": contract.owner_signature,
            "tenant_signed_at": contract.tenant_signed_at,
            "owner_signed_at": contract.owner_signed_at,
            "contract_address": contract.contract_address,
            "transaction_hash": contract.transaction_hash,
            "block_number": contract.block_number,
            "payment_status": contract.payment_status,
            "paid_amount": contract.paid_amount,
            "deposit_paid": contract.deposit_paid,
            "completed_at": contract.completed_at,
            "cancelled_at": contract.cancelled_at,
            "cancellation_reason": contract.cancellation_reason,
            "extension_count": contract.extension_count,
            "meta_info": contract.meta_info or {},
            "created_at": contract.created_at,
            "updated_at": contract.updated_at
        }
        
        # Добавляем данные арендатора
        if hasattr(contract, 'tenant') and contract.tenant:
            contract_data["tenant"] = {
                "id": contract.tenant.id,
                "email": contract.tenant.email,
                "first_name": contract.tenant.first_name,
                "last_name": contract.tenant.last_name,
                "avatar": contract.tenant.avatar,
                "is_verified": contract.tenant.is_verified,
                "rating": float(contract.tenant.rating) if contract.tenant.rating else None,
                "total_reviews": contract.tenant.total_reviews
            }
        else:
            # Загружаем арендатора отдельно
            tenant = self.db.query(User).filter(User.id == contract.tenant_id).first()
            if tenant:
                contract_data["tenant"] = {
                    "id": tenant.id,
                    "email": tenant.email,
                    "first_name": tenant.first_name,
                    "last_name": tenant.last_name,
                    "avatar": tenant.avatar,
                    "is_verified": tenant.is_verified,
                    "rating": float(tenant.rating) if tenant.rating else None,
                    "total_reviews": tenant.total_reviews
                }
        
        # Добавляем данные владельца
        if hasattr(contract, 'owner') and contract.owner:
            contract_data["owner"] = {
                "id": contract.owner.id,
                "email": contract.owner.email,
                "first_name": contract.owner.first_name,
                "last_name": contract.owner.last_name,
                "avatar": contract.owner.avatar,
                "is_verified": contract.owner.is_verified,
                "rating": float(contract.owner.rating) if contract.owner.rating else None,
                "total_reviews": contract.owner.total_reviews
            }
        else:
            # Загружаем владельца отдельно
            owner = self.db.query(User).filter(User.id == contract.owner_id).first()
            if owner:
                contract_data["owner"] = {
                    "id": owner.id,
                    "email": owner.email,
                    "first_name": owner.first_name,
                    "last_name": owner.last_name,
                    "avatar": owner.avatar,
                    "is_verified": owner.is_verified,
                    "rating": float(owner.rating) if owner.rating else None,
                    "total_reviews": owner.total_reviews
                }
        
        # Добавляем данные товара
        if hasattr(contract, 'item') and contract.item:
            contract_data["item"] = {
                "id": contract.item.id,
                "title": contract.item.title,
                "description": contract.item.description,
                "price_per_day": contract.item.price_per_day,
                "condition": contract.item.condition.value if hasattr(contract.item.condition, 'value') else str(contract.item.condition),
                "location": contract.item.location,
                "images": contract.item.images or []
            }
        else:
            # Загружаем товар отдельно
            item = self.db.query(Item).filter(Item.id == contract.item_id).first()
            if item:
                contract_data["item"] = {
                    "id": item.id,
                    "title": item.title,
                    "description": item.description,
                    "price_per_day": item.price_per_day,
                    "condition": item.condition.value if hasattr(item.condition, 'value') else str(item.condition),
                    "location": item.location,
                    "images": item.images or []
                }
        
        return contract_data
    
    def create_contract(
        self, 
        contract_data: ContractCreate, 
        owner_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Create new rental contract.
        ИСПРАВЛЕНО: Возвращает словарь вместо объекта SQLAlchemy
        
        Args:
            contract_data: Contract creation data
            owner_id: Owner user ID
            
        Returns:
            Dictionary with contract data
        """
        # Validate item exists and is available
        item = self.db.query(Item).filter(Item.id == contract_data.item_id).first()
        if not item:
            raise NotFoundError("Item", str(contract_data.item_id))
        
        if not item.is_available:
            raise BadRequestError("Item is not available for rent")
        
        # Проверяем, что item принадлежит owner_id
        if item.owner_id != owner_id:
            raise BadRequestError("You can only create contracts for your own items")
        
        # Определяем tenant_id
        tenant_id = None
        
        # Если указан tenant_email, находим пользователя
        if contract_data.tenant_email:
            from app.services.user import UserService
            user_service = UserService(self.db)
            tenant_user = user_service.get_user_by_email(contract_data.tenant_email)
            if not tenant_user:
                raise BadRequestError(f"User with email {contract_data.tenant_email} not found")
            tenant_id = tenant_user.id
        elif contract_data.tenant_id:
            # Проверяем, что пользователь существует
            tenant_user = self.db.query(User).filter(User.id == contract_data.tenant_id).first()
            if not tenant_user:
                raise BadRequestError(f"User with ID {contract_data.tenant_id} not found")
            tenant_id = contract_data.tenant_id
        else:
            raise BadRequestError("Either tenant_id or tenant_email must be provided")
        
        # Проверяем, что арендатор не является владельцем
        if tenant_id == owner_id:
            raise BadRequestError("You cannot create a contract with yourself")
        
        # Убираем timezone из дат для корректного сравнения
        start_date = contract_data.start_date.replace(tzinfo=None) if contract_data.start_date.tzinfo else contract_data.start_date
        end_date = contract_data.end_date.replace(tzinfo=None) if contract_data.end_date.tzinfo else contract_data.end_date
        current_time = datetime.utcnow()
        
        # Validate dates
        if start_date >= end_date:
            raise BadRequestError("End date must be after start date")
        
        if start_date < current_time:
            raise BadRequestError("Start date cannot be in the past")
        
        # Check for conflicting contracts
        conflicting = self.db.query(Contract).filter(
            Contract.item_id == contract_data.item_id,
            Contract.status.in_([ContractStatus.ACTIVE, ContractStatus.SIGNED]),
            or_(
                and_(
                    Contract.start_date <= start_date,
                    Contract.end_date >= start_date
                ),
                and_(
                    Contract.start_date <= end_date,
                    Contract.end_date >= end_date
                ),
                and_(
                    Contract.start_date >= start_date,
                    Contract.end_date <= end_date
                )
            )
        ).first()
        
        if conflicting:
            raise BadRequestError("Item is already rented for the selected period")
        
        contract = Contract(
            tenant_id=tenant_id,
            owner_id=owner_id,
            item_id=contract_data.item_id,
            start_date=start_date,
            end_date=end_date,
            total_price=contract_data.total_price,
            deposit=contract_data.deposit,
            terms=contract_data.terms,
            special_conditions=contract_data.special_conditions,
            status=ContractStatus.PENDING
        )
        
        self.db.add(contract)
        self.db.commit()
        self.db.refresh(contract)
        
        # Загружаем связанные объекты
        try:
            contract = self.db.query(Contract).options(
                joinedload(Contract.tenant),
                joinedload(Contract.owner),
                joinedload(Contract.item)
            ).filter(Contract.id == contract.id).first()
        except Exception as e:
            # Если joinedload не работает, продолжаем без него
            print(f"Warning: joinedload failed: {e}")
        
        # Create history entry
        self._add_history_entry(
            contract.id,
            "contract_created",
            "Contract created and awaiting signatures"
        )
        
        # Send notifications
        try:
            self._send_contract_notifications(contract, "created")
        except Exception as e:
            print(f"Warning: Failed to send notifications: {e}")
        
        # Возвращаем словарь вместо объекта SQLAlchemy
        return self._contract_to_dict(contract)
    
    def get_contract_by_id(
        self, 
        contract_id: uuid.UUID, 
        user_id: uuid.UUID
    ) -> Optional[Contract]:
        """
        Get contract by ID with access control.
        
        Args:
            contract_id: Contract ID
            user_id: User ID
            
        Returns:
            Contract or None
        """
        contract = self.db.query(Contract).filter(Contract.id == contract_id).first()
        
        if not contract:
            return None
        
        # Check access permissions
        if contract.tenant_id != user_id and contract.owner_id != user_id:
            # Check if user is admin/moderator
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user or not user.is_moderator:
                return None
        
        return contract
    
    def get_user_contracts(
        self,
        user_id: uuid.UUID,
        status: Optional[ContractStatus] = None,
        contract_type: Optional[str] = None,  # 'owner', 'tenant', or None for all
        page: int = 1,
        size: int = 20
    ) -> PaginatedResponse:
        """
        Get user's contracts with filtering.
        
        Args:
            user_id: User ID
            status: Optional status filter
            contract_type: Optional type filter
            page: Page number
            size: Page size
            
        Returns:
            Paginated contracts
        """
        query = self.db.query(Contract)
        
        # Filter by user involvement
        if contract_type == "owner":
            query = query.filter(Contract.owner_id == user_id)
        elif contract_type == "tenant":
            query = query.filter(Contract.tenant_id == user_id)
        else:
            query = query.filter(
                or_(Contract.owner_id == user_id, Contract.tenant_id == user_id)
            )
        
        # Filter by status
        if status:
            query = query.filter(Contract.status == status)
        
        # Order by creation date (newest first)
        query = query.order_by(desc(Contract.created_at))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * size
        contracts = query.offset(offset).limit(size).all()
        
        # Convert contracts to dictionaries
        contracts_data = [self._contract_to_dict(contract) for contract in contracts]
        
        # Calculate pagination meta_info
        pages = (total + size - 1) // size
        
        return PaginatedResponse(
            items=contracts_data,
            meta=PaginationMeta(
                page=page,
                size=size,
                total=total,
                pages=pages,
                has_next=page < pages,
                has_prev=page > 1
            )
        )
    
    def update_contract(
        self, 
        contract_id: uuid.UUID, 
        contract_data: ContractUpdate, 
        user_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Update contract (limited fields).
        """
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        # Only allow updates if contract is in PENDING or DRAFT status
        if contract.status not in [ContractStatus.PENDING]:
            raise BadRequestError("Contract cannot be updated in current status")
        
        # Update fields
        update_data = contract_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(contract, field, value)
        
        contract.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(contract)
        
        return self._contract_to_dict(contract)
    
    def sign_contract(
        self, 
        contract_id: uuid.UUID, 
        user_id: uuid.UUID, 
        signature: str
    ) -> Dict[str, Any]:
        """
        Sign contract.
        ИСПРАВЛЕНО: Возвращает словарь
        
        Args:
            contract_id: Contract ID
            user_id: User ID
            signature: Digital signature
            
        Returns:
            Updated contract data
        """
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        if contract.status != ContractStatus.PENDING:
            raise BadRequestError("Contract is not in pending status")
        
        now = datetime.utcnow()
        
        if contract.tenant_id == user_id:
            if contract.tenant_signature:
                raise BadRequestError("Contract already signed by tenant")
            contract.tenant_signature = signature
            contract.tenant_signed_at = now
            action = "signed by tenant"
        elif contract.owner_id == user_id:
            if contract.owner_signature:
                raise BadRequestError("Contract already signed by owner")
            contract.owner_signature = signature
            contract.owner_signed_at = now
            action = "signed by owner"
        else:
            raise ForbiddenError("You are not authorized to sign this contract")
        
        # Check if both parties have signed
        if contract.tenant_signature and contract.owner_signature:
            contract.status = ContractStatus.SIGNED
            action = "fully signed and ready for activation"
        
        contract.updated_at = now
        self.db.commit()
        
        # Add history entry
        self._add_history_entry(contract_id, "contract_signed", f"Contract {action}")
        
        # Send notifications
        try:
            self._send_contract_notifications(contract, "signed")
        except Exception as e:
            print(f"Warning: Failed to send notifications: {e}")
        
        return self._contract_to_dict(contract)
    
    def complete_contract(
        self, 
        contract_id: uuid.UUID, 
        user_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Complete rental contract.
        ИСПРАВЛЕНО: Возвращает словарь
        
        Args:
            contract_id: Contract ID
            user_id: User ID
            
        Returns:
            Updated contract data
        """
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        if contract.status != ContractStatus.ACTIVE:
            raise BadRequestError("Only active contracts can be completed")
        
        now = datetime.utcnow()
        
        contract.status = ContractStatus.COMPLETED
        contract.completed_at = now
        contract.completed_by = user_id
        contract.updated_at = now
        
        self.db.commit()
        
        # Update item availability
        item = self.db.query(Item).filter(Item.id == contract.item_id).first()
        if item:
            item.rentals_count = (item.rentals_count or 0) + 1
        
        # Add history entry
        self._add_history_entry(
            contract_id, 
            "contract_completed", 
            "Rental period completed successfully"
        )
        
        # Send notifications
        try:
            self._send_contract_notifications(contract, "completed")
        except Exception as e:
            print(f"Warning: Failed to send notifications: {e}")
        
        return self._contract_to_dict(contract)
    
    def cancel_contract(
        self, 
        contract_id: uuid.UUID, 
        user_id: uuid.UUID, 
        reason: str = ""
    ) -> Dict[str, Any]:
        """
        Cancel rental contract.
        ИСПРАВЛЕНО: Возвращает словарь
        
        Args:
            contract_id: Contract ID
            user_id: User ID
            reason: Cancellation reason
            
        Returns:
            Updated contract data
        """
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        if contract.status not in [ContractStatus.PENDING, ContractStatus.SIGNED, ContractStatus.ACTIVE]:
            raise BadRequestError("Contract cannot be cancelled in current status")
        
        now = datetime.utcnow()
        
        contract.status = ContractStatus.CANCELLED
        contract.cancelled_at = now
        contract.cancelled_by = user_id
        contract.cancellation_reason = reason
        contract.updated_at = now
        
        self.db.commit()
        
        # Add history entry
        self._add_history_entry(
            contract_id, 
            "contract_cancelled", 
            f"Contract cancelled: {reason}" if reason else "Contract cancelled"
        )
        
        # Send notifications
        try:
            self._send_contract_notifications(contract, "cancelled")
        except Exception as e:
            print(f"Warning: Failed to send notifications: {e}")
        
        return self._contract_to_dict(contract)
    
    def extend_contract(
        self, 
        contract_id: uuid.UUID, 
        new_end_date: datetime,
        additional_price: float,
        user_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Extend contract duration.
        """
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        if contract.status not in [ContractStatus.ACTIVE, ContractStatus.SIGNED]:
            raise BadRequestError("Contract cannot be extended in current status")
        
        # Validate new end date
        if new_end_date <= contract.end_date:
            raise BadRequestError("New end date must be after current end date")
        
        # Store original end date if not already stored
        if not contract.original_end_date:
            contract.original_end_date = contract.end_date
        
        contract.end_date = new_end_date
        contract.total_price += additional_price
        contract.extension_count = (contract.extension_count or 0) + 1
        contract.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        # Add history entry
        self._add_history_entry(
            contract_id,
            "contract_extended",
            f"Contract extended until {new_end_date.strftime('%Y-%m-%d')}"
        )
        
        return self._contract_to_dict(contract)
    
    def get_contract_messages(
        self, 
        contract_id: uuid.UUID, 
        user_id: uuid.UUID,
        page: int = 1,
        size: int = 50
    ) -> PaginatedResponse:
        """
        Get contract messages.
        """
        # Verify access to contract
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        query = self.db.query(ContractMessage).filter(
            ContractMessage.contract_id == contract_id
        ).order_by(desc(ContractMessage.created_at))
        
        total = query.count()
        offset = (page - 1) * size
        messages = query.offset(offset).limit(size).all()
        
        pages = (total + size - 1) // size
        
        return PaginatedResponse(
            items=messages,
            meta=PaginationMeta(
                page=page,
                size=size,
                total=total,
                pages=pages,
                has_next=page < pages,
                has_prev=page > 1
            )
        )
    
    def add_contract_message(
        self, 
        contract_id: uuid.UUID, 
        message_data: ContractMessageCreate,
        user_id: uuid.UUID
    ) -> ContractMessage:
        """
        Add message to contract chat.
        """
        # Verify access to contract
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        message = ContractMessage(
            contract_id=contract_id,
            sender_id=user_id,
            message=message_data.message,
            message_type=message_data.message_type,
            attachments=message_data.attachments
        )
        
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        
        return message
    
    def get_contract_history(self, contract_id: uuid.UUID, user_id: uuid.UUID) -> List[Dict]:
        """
        Get contract history.
        """
        # Verify access to contract
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        history = self.db.query(ContractHistory).filter(
            ContractHistory.contract_id == contract_id
        ).order_by(desc(ContractHistory.created_at)).all()
        
        return [
            {
                "id": entry.id,
                "event_type": entry.event_type,
                "description": entry.description,
                "created_at": entry.created_at,
                "user_id": entry.user_id
            }
            for entry in history
        ]
    
    def create_dispute(
        self, 
        contract_id: uuid.UUID, 
        dispute_data: DisputeCreate,
        user_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Create dispute for contract.
        """
        # Verify access to contract
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        if contract.status not in [ContractStatus.ACTIVE, ContractStatus.COMPLETED]:
            raise BadRequestError("Disputes can only be created for active or completed contracts")
        
        dispute = Dispute(
            contract_id=contract_id,
            complainant_id=user_id,
            reason=dispute_data.reason,
            description=dispute_data.description,
            evidence=dispute_data.evidence
        )
        
        self.db.add(dispute)
        
        # Update contract status
        contract.status = ContractStatus.DISPUTED
        
        self.db.commit()
        self.db.refresh(dispute)
        
        # Add history entry
        self._add_history_entry(
            contract_id,
            "dispute_created",
            f"Dispute created: {dispute_data.reason}"
        )
        
        return {
            "id": dispute.id,
            "contract_id": dispute.contract_id,
            "reason": dispute.reason,
            "description": dispute.description,
            "status": dispute.status,
            "created_at": dispute.created_at
        }
    
    def get_contract_stats(self, user_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        """
        Get contract statistics.
        """
        query = self.db.query(Contract)
        
        if user_id:
            query = query.filter(
                or_(Contract.owner_id == user_id, Contract.tenant_id == user_id)
            )
        
        contracts = query.all()
        
        stats = {
            "total_contracts": len(contracts),
            "active_contracts": len([c for c in contracts if c.status == ContractStatus.ACTIVE]),
            "completed_contracts": len([c for c in contracts if c.status == ContractStatus.COMPLETED]),
            "cancelled_contracts": len([c for c in contracts if c.status == ContractStatus.CANCELLED]),
            "disputed_contracts": len([c for c in contracts if c.status == ContractStatus.DISPUTED]),
            "total_volume": sum(float(c.total_price) for c in contracts if c.status == ContractStatus.COMPLETED),
            "average_contract_value": 0.0,
            "status_distribution": {}
        }
        
        if stats["completed_contracts"] > 0:
            stats["average_contract_value"] = stats["total_volume"] / stats["completed_contracts"]
        
        # Status distribution
        for contract in contracts:
            status_name = contract.status.value
            stats["status_distribution"][status_name] = stats["status_distribution"].get(status_name, 0) + 1
        
        return stats
    
    def get_all_contracts(
        self,
        status: Optional[ContractStatus] = None,
        page: int = 1,
        size: int = 20
    ) -> PaginatedResponse:
        """
        Get all contracts (admin only).
        """
        query = self.db.query(Contract)
        
        if status:
            query = query.filter(Contract.status == status)
        
        query = query.order_by(desc(Contract.created_at))
        
        total = query.count()
        offset = (page - 1) * size
        contracts = query.offset(offset).limit(size).all()
        
        contracts_data = [self._contract_to_dict(contract) for contract in contracts]
        
        pages = (total + size - 1) // size
        
        return PaginatedResponse(
            items=contracts_data,
            meta=PaginationMeta(
                page=page,
                size=size,
                total=total,
                pages=pages,
                has_next=page < pages,
                has_prev=page > 1
            )
        )
    
    def _add_history_entry(
        self, 
        contract_id: uuid.UUID, 
        event_type: str, 
        description: str,
        user_id: Optional[uuid.UUID] = None,
        old_value: Optional[Dict] = None,
        new_value: Optional[Dict] = None
    ) -> None:
        """
        Add entry to contract history.
        
        Args:
            contract_id: Contract ID
            event_type: Event type
            description: Event description
            user_id: Optional user ID
            old_value: Optional old value
            new_value: Optional new value
        """
        history_entry = ContractHistory(
            contract_id=contract_id,
            user_id=user_id,
            event_type=event_type,
            description=description,
            old_value=old_value,
            new_value=new_value,
            created_at=datetime.utcnow()
        )
        
        self.db.add(history_entry)

    def _send_contract_notifications(
        self, 
        contract: Contract, 
        event_type: str
    ) -> None:
        """
        Send notifications for contract events.
        
        Args:
            contract: Contract object
            event_type: Event type
        """
        from app.models.notification import NotificationType
        
        notifications = {
            "created": {
                "tenant": {
                    "title": "Rental Request Sent",
                    "message": f"Your rental request for item has been sent to the owner.",
                    "type": NotificationType.RENTAL_REQUEST
                },
                "owner": {
                    "title": "New Rental Request",
                    "message": f"You have a new rental request for your item.",
                    "type": NotificationType.RENTAL_REQUEST
                }
            },
            "signed": {
                "tenant": {
                    "title": "Contract Signed",
                    "message": f"Contract has been signed.",
                    "type": NotificationType.CONTRACT_SIGNED
                },
                "owner": {
                    "title": "Contract Signed",
                    "message": f"Contract has been signed.",
                    "type": NotificationType.CONTRACT_SIGNED
                }
            },
            "activated": {
                "tenant": {
                    "title": "Contract Activated",
                    "message": f"Your rental contract is now active.",
                    "type": NotificationType.CONTRACT_ACTIVATED
                },
                "owner": {
                    "title": "Contract Activated",
                    "message": f"Rental contract is now active.",
                    "type": NotificationType.CONTRACT_ACTIVATED
                }
            },
            "completed": {
                "tenant": {
                    "title": "Rental Completed",
                    "message": f"Your rental has been completed.",
                    "type": NotificationType.CONTRACT_COMPLETED
                },
                "owner": {
                    "title": "Rental Completed",
                    "message": f"Rental has been completed.",
                    "type": NotificationType.CONTRACT_COMPLETED
                }
            },
            "cancelled": {
                "tenant": {
                    "title": "Contract Cancelled",
                    "message": f"Contract has been cancelled.",
                    "type": NotificationType.CONTRACT_CANCELLED
                },
                "owner": {
                    "title": "Contract Cancelled",
                    "message": f"Contract has been cancelled.",
                    "type": NotificationType.CONTRACT_CANCELLED
                }
            },
            "disputed": {
                "tenant": {
                    "title": "Dispute Created",
                    "message": f"A dispute has been created.",
                    "type": NotificationType.DISPUTE_CREATED
                },
                "owner": {
                    "title": "Dispute Created",
                    "message": f"A dispute has been created.",
                    "type": NotificationType.DISPUTE_CREATED
                }
            }
        }
        
        try:
            if event_type in notifications:
                # Send to tenant
                if contract.tenant_id and "tenant" in notifications[event_type]:
                    notification_data = notifications[event_type]["tenant"]
                    self.notification_service.create_notification(
                        user_id=contract.tenant_id,
                        title=notification_data["title"],
                        message=notification_data["message"],
                        type=notification_data["type"].value,
                        action_url=f"/contracts/{contract.id}"
                    )
                
                # Send to owner
                if contract.owner_id and "owner" in notifications[event_type]:
                    notification_data = notifications[event_type]["owner"]
                    self.notification_service.create_notification(
                        user_id=contract.owner_id,
                        title=notification_data["title"],
                        message=notification_data["message"],
                        type=notification_data["type"].value,
                        action_url=f"/contracts/{contract.id}"
                    )
        except Exception as e:
            # Don't fail the main operation if notifications fail
            print(f"Warning: Failed to send notifications: {e}")
            pass