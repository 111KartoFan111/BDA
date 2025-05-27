from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from fastapi import HTTPException, status
from datetime import datetime, timedelta
import uuid

from app.models.contract import (
    Contract, ContractStatus, ContractMessage, Payment, PaymentStatus,
    Dispute, DisputeStatus, ContractHistory
)
from app.models.item import Item
from app.models.user import User
from app.schemas.contract import (
    ContractCreate, ContractUpdate, ContractMessageCreate,
    PaymentCreate, DisputeCreate, DisputeUpdate
)
from app.schemas.common import PaginatedResponse, PaginationMeta
from app.utils.exceptions import NotFoundError, ForbiddenError, BadRequestError
from app.services.notification import NotificationService


class ContractService:
    """Service for managing rental contracts."""
    
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    def create_contract(
        self, 
        contract_data: ContractCreate, 
        owner_id: uuid.UUID
    ) -> Contract:
        """
        Create new rental contract.
        
        Args:
            contract_data: Contract creation data
            owner_id: Item owner ID
            
        Returns:
            Created contract
        """
        # Validate item exists and is available
        item = self.db.query(Item).filter(Item.id == contract_data.item_id).first()
        if not item:
            raise NotFoundError("Item", str(contract_data.item_id))
        
        if not item.is_available:
            raise BadRequestError("Item is not available for rent")
        
        # Validate dates
        if contract_data.start_date >= contract_data.end_date:
            raise BadRequestError("End date must be after start date")
        
        if contract_data.start_date < datetime.utcnow():
            raise BadRequestError("Start date cannot be in the past")
        
        # Check for conflicting contracts
        conflicting = self.db.query(Contract).filter(
            Contract.item_id == contract_data.item_id,
            Contract.status.in_([ContractStatus.ACTIVE, ContractStatus.SIGNED]),
            or_(
                and_(
                    Contract.start_date <= contract_data.start_date,
                    Contract.end_date >= contract_data.start_date
                ),
                and_(
                    Contract.start_date <= contract_data.end_date,
                    Contract.end_date >= contract_data.end_date
                ),
                and_(
                    Contract.start_date >= contract_data.start_date,
                    Contract.end_date <= contract_data.end_date
                )
            )
        ).first()
        
        if conflicting:
            raise BadRequestError("Item is already rented for the selected period")
        
        contract = Contract(
            tenant_id=contract_data.tenant_id,
            owner_id=owner_id,
            item_id=contract_data.item_id,
            start_date=contract_data.start_date,
            end_date=contract_data.end_date,
            total_price=contract_data.total_price,
            deposit=contract_data.deposit,
            terms=contract_data.terms,
            special_conditions=contract_data.special_conditions,
            status=ContractStatus.PENDING
        )
        
        self.db.add(contract)
        self.db.commit()
        self.db.refresh(contract)
        
        # Create history entry
        self._add_history_entry(
            contract.id,
            "contract_created",
            "Contract created and awaiting signatures"
        )
        
        # Send notifications
        self._send_contract_notifications(contract, "created")
        
        return contract
    
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
        
        # Calculate pagination meta_info
        pages = (total + size - 1) // size
        
        return PaginatedResponse(
            items=contracts,
            meta=PaginationMeta(
                page=page,
                size=size,
                total=total,
                pages=pages,
                has_next=page < pages,
                has_prev=page > 1
            )
        )
    
    def sign_contract(
        self, 
        contract_id: uuid.UUID, 
        user_id: uuid.UUID, 
        signature: str
    ) -> Contract:
        """
        Sign contract.
        
        Args:
            contract_id: Contract ID
            user_id: User ID
            signature: Digital signature
            
        Returns:
            Updated contract
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
        self._send_contract_notifications(contract, "signed")
        
        return contract
    
    def activate_contract(
        self, 
        contract_id: uuid.UUID, 
        contract_address: str, 
        transaction_hash: str
    ) -> Contract:
        """
        Activate contract after blockchain deployment.
        
        Args:
            contract_id: Contract ID
            contract_address: Smart contract address
            transaction_hash: Deployment transaction hash
            
        Returns:
            Updated contract
        """
        contract = self.db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        if contract.status != ContractStatus.SIGNED:
            raise BadRequestError("Contract must be signed before activation")
        
        contract.status = ContractStatus.ACTIVE
        contract.contract_address = contract_address
        contract.transaction_hash = transaction_hash
        contract.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        # Add history entry
        self._add_history_entry(
            contract_id, 
            "contract_activated", 
            f"Contract deployed to blockchain: {contract_address}"
        )
        
        # Send notifications
        self._send_contract_notifications(contract, "activated")
        
        return contract
    
    def complete_contract(
        self, 
        contract_id: uuid.UUID, 
        user_id: uuid.UUID
    ) -> Contract:
        """
        Complete rental contract.
        
        Args:
            contract_id: Contract ID
            user_id: User ID
            
        Returns:
            Updated contract
        """
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        if contract.status != ContractStatus.ACTIVE:
            raise BadRequestError("Only active contracts can be completed")
        
        contract.status = ContractStatus.COMPLETED
        contract.completed_at = datetime.utcnow()
        contract.completed_by = user_id
        contract.updated_at = datetime.utcnow()
        
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
        self._send_contract_notifications(contract, "completed")
        
        return contract
    
    def cancel_contract(
        self, 
        contract_id: uuid.UUID, 
        user_id: uuid.UUID, 
        reason: str = ""
    ) -> Contract:
        """
        Cancel rental contract.
        
        Args:
            contract_id: Contract ID
            user_id: User ID
            reason: Cancellation reason
            
        Returns:
            Updated contract
        """
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        if contract.status not in [ContractStatus.PENDING, ContractStatus.SIGNED, ContractStatus.ACTIVE]:
            raise BadRequestError("Contract cannot be cancelled in current status")
        
        contract.status = ContractStatus.CANCELLED
        contract.cancelled_at = datetime.utcnow()
        contract.cancelled_by = user_id
        contract.cancellation_reason = reason
        contract.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        # Add history entry
        self._add_history_entry(
            contract_id, 
            "contract_cancelled", 
            f"Contract cancelled: {reason}" if reason else "Contract cancelled"
        )
        
        # Send notifications
        self._send_contract_notifications(contract, "cancelled")
        
        return contract
    
    def create_dispute(
        self, 
        contract_id: uuid.UUID, 
        dispute_data: DisputeCreate, 
        complainant_id: uuid.UUID
    ) -> Dispute:
        """
        Create dispute for contract.
        
        Args:
            contract_id: Contract ID
            dispute_data: Dispute data
            complainant_id: Complainant user ID
            
        Returns:
            Created dispute
        """
        contract = self.get_contract_by_id(contract_id, complainant_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        if contract.status != ContractStatus.ACTIVE:
            raise BadRequestError("Disputes can only be created for active contracts")
        
        # Check if dispute already exists
        existing_dispute = self.db.query(Dispute).filter(
            Dispute.contract_id == contract_id,
            Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.INVESTIGATING])
        ).first()
        
        if existing_dispute:
            raise BadRequestError("An active dispute already exists for this contract")
        
        dispute = Dispute(
            contract_id=contract_id,
            complainant_id=complainant_id,
            reason=dispute_data.reason,
            description=dispute_data.description,
            evidence=dispute_data.evidence,
            status=DisputeStatus.OPEN
        )
        
        self.db.add(dispute)
        
        # Update contract status
        contract.status = ContractStatus.DISPUTED
        contract.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(dispute)
        
        # Add history entry
        self._add_history_entry(
            contract_id, 
            "dispute_created", 
            f"Dispute created: {dispute_data.reason}"
        )
        
        # Send notifications
        self._send_contract_notifications(contract, "disputed")
        
        return dispute
    
    def get_contract_messages(
        self, 
        contract_id: uuid.UUID, 
        user_id: uuid.UUID,
        page: int = 1,
        size: int = 50
    ) -> PaginatedResponse:
        """
        Get contract messages.
        
        Args:
            contract_id: Contract ID
            user_id: User ID
            page: Page number
            size: Page size
            
        Returns:
            Paginated messages
        """
        # Verify access to contract
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        query = self.db.query(ContractMessage).filter(
            ContractMessage.contract_id == contract_id
        ).order_by(ContractMessage.created_at)
        
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
        sender_id: uuid.UUID
    ) -> ContractMessage:
        """
        Add message to contract.
        
        Args:
            contract_id: Contract ID
            message_data: Message data
            sender_id: Sender user ID
            
        Returns:
            Created message
        """
        # Verify access to contract
        contract = self.get_contract_by_id(contract_id, sender_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        message = ContractMessage(
            contract_id=contract_id,
            sender_id=sender_id,
            message=message_data.message,
            message_type=message_data.message_type,
            attachments=message_data.attachments
        )
        
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        
        # Send notification to other party
        other_party = contract.owner_id if sender_id == contract.tenant_id else contract.tenant_id
        self.notification_service.create_notification(
            user_id=other_party,
            title="New Contract Message",
            message=f"You have a new message regarding contract for {contract.item.title}",
            type="contract_message",
            action_url=f"/contracts/{contract_id}"
        )
        
        return message
    
    def get_contract_history(
        self, 
        contract_id: uuid.UUID, 
        user_id: uuid.UUID
    ) -> List[ContractHistory]:
        """
        Get contract history.
        
        Args:
            contract_id: Contract ID
            user_id: User ID
            
        Returns:
            List of history entries
        """
        # Verify access to contract
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        return self.db.query(ContractHistory).filter(
            ContractHistory.contract_id == contract_id
        ).order_by(ContractHistory.created_at).all()
    
    def extend_contract(
        self, 
        contract_id: uuid.UUID, 
        new_end_date: datetime, 
        additional_price: float,
        user_id: uuid.UUID
    ) -> Contract:
        """
        Extend contract duration.
        
        Args:
            contract_id: Contract ID
            new_end_date: New end date
            additional_price: Additional price for extension
            user_id: User ID
            
        Returns:
            Updated contract
        """
        contract = self.get_contract_by_id(contract_id, user_id)
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        if contract.status != ContractStatus.ACTIVE:
            raise BadRequestError("Only active contracts can be extended")
        
        if new_end_date <= contract.end_date:
            raise BadRequestError("New end date must be after current end date")
        
        # Store original end date
        if not contract.original_end_date:
            contract.original_end_date = contract.end_date
        
        contract.end_date = new_end_date
        contract.total_price += additional_price
        contract.extension_count += 1
        contract.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        # Add history entry
        self._add_history_entry(
            contract_id, 
            "contract_extended", 
            f"Contract extended until {new_end_date.strftime('%Y-%m-%d')}"
        )
        
        return contract
    
    def get_contract_stats(self, user_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        """
        Get contract statistics.
        
        Args:
            user_id: Optional user ID for user-specific stats
            
        Returns:
            Contract statistics
        """
        query = self.db.query(Contract)
        
        if user_id:
            query = query.filter(
                or_(Contract.owner_id == user_id, Contract.tenant_id == user_id)
            )
        
        total_contracts = query.count()
        
        # Status distribution
        status_distribution = {}
        for status in ContractStatus:
            count = query.filter(Contract.status == status).count()
            status_distribution[status.value] = count
        
        # Calculate totals by status
        active_contracts = status_distribution.get(ContractStatus.ACTIVE.value, 0)
        completed_contracts = status_distribution.get(ContractStatus.COMPLETED.value, 0)
        cancelled_contracts = status_distribution.get(ContractStatus.CANCELLED.value, 0)
        disputed_contracts = status_distribution.get(ContractStatus.DISPUTED.value, 0)
        
        # Calculate total volume
        total_volume_result = query.filter(
            Contract.status.in_([ContractStatus.COMPLETED, ContractStatus.ACTIVE])
        ).with_entities(func.sum(Contract.total_price)).scalar()
        
        total_volume = float(total_volume_result) if total_volume_result else 0.0
        
        # Calculate average contract value
        avg_value = total_volume / max(completed_contracts + active_contracts, 1)
        
        return {
            "total_contracts": total_contracts,
            "active_contracts": active_contracts,
            "completed_contracts": completed_contracts,
            "cancelled_contracts": cancelled_contracts,
            "disputed_contracts": disputed_contracts,
            "total_volume": total_volume,
            "average_contract_value": avg_value,
            "status_distribution": status_distribution
        }
    
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
            new_value=new_value
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
        notifications = {
            "created": {
                "tenant": {
                    "title": "Rental Request Sent",
                    "message": f"Your rental request for {contract.item.title} has been sent to the owner."
                },
                "owner": {
                    "title": "New Rental Request",
                    "message": f"You have a new rental request for {contract.item.title}."
                }
            },
            "signed": {
                "tenant": {
                    "title": "Contract Signed",
                    "message": f"Contract for {contract.item.title} has been signed."
                },
                "owner": {
                    "title": "Contract Signed",
                    "message": f"Contract for {contract.item.title} has been signed."
                }
            },
            "activated": {
                "tenant": {
                    "title": "Contract Activated",
                    "message": f"Your rental contract for {contract.item.title} is now active."
                },
                "owner": {
                    "title": "Contract Activated",
                    "message": f"Rental contract for {contract.item.title} is now active."
                }
            },
            "completed": {
                "tenant": {
                    "title": "Rental Completed",
                    "message": f"Your rental of {contract.item.title} has been completed."
                },
                "owner": {
                    "title": "Rental Completed",
                    "message": f"Rental of {contract.item.title} has been completed."
                }
            },
            "cancelled": {
                "tenant": {
                    "title": "Contract Cancelled",
                    "message": f"Contract for {contract.item.title} has been cancelled."
                },
                "owner": {
                    "title": "Contract Cancelled",
                    "message": f"Contract for {contract.item.title} has been cancelled."
                }
            },
            "disputed": {
                "tenant": {
                    "title": "Dispute Created",
                    "message": f"A dispute has been created for {contract.item.title}."
                },
                "owner": {
                    "title": "Dispute Created",
                    "message": f"A dispute has been created for {contract.item.title}."
                }
            }
        }
        
        if event_type in notifications:
            # Send to tenant
            if contract.tenant_id and "tenant" in notifications[event_type]:
                self.notification_service.create_notification(
                    user_id=contract.tenant_id,
                    title=notifications[event_type]["tenant"]["title"],
                    message=notifications[event_type]["tenant"]["message"],
                    type="contract_update",
                    action_url=f"/contracts/{contract.id}"
                )
            
            # Send to owner
            if contract.owner_id and "owner" in notifications[event_type]:
                self.notification_service.create_notification(
                    user_id=contract.owner_id,
                    title=notifications[event_type]["owner"]["title"],
                    message=notifications[event_type]["owner"]["message"],
                    type="contract_update",
                    action_url=f"/contracts/{contract.id}"
                )