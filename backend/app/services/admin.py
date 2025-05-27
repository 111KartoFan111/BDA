"""
Admin service for administrative operations.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, text
from datetime import datetime, timedelta
import uuid
import csv
import json
import os
from io import StringIO

from app.models.user import User, UserStatus, UserRole
from app.models.item import Item, ItemStatus
from app.models.contract import Contract, ContractStatus, Dispute, DisputeStatus
from app.models.notification import Notification, NotificationType
from app.schemas.common import PaginatedResponse, PaginationMeta
from app.utils.exceptions import NotFoundError, ForbiddenError, BadRequestError
from app.core.database import redis_client
from app.services.email import EmailService


class AdminService:
    """Service for administrative operations."""
    
    def __init__(self, db: Session):
        self.db = db
        self.email_service = EmailService()
    
    def get_dashboard_overview(self) -> Dict[str, Any]:
        """
        Get admin dashboard overview with key metrics.
        
        Returns:
            Dashboard overview data
        """
        # Current totals
        total_users = self.db.query(User).count()
        total_items = self.db.query(Item).count()
        total_contracts = self.db.query(Contract).count()
        
        # Active counts
        active_users = self.db.query(User).filter(User.status == UserStatus.ACTIVE).count()
        active_items = self.db.query(Item).filter(
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True
        ).count()
        active_contracts = self.db.query(Contract).filter(
            Contract.status == ContractStatus.ACTIVE
        ).count()
        
        # Pending approvals
        pending_items = self.db.query(Item).filter(Item.is_approved == False).count()
        pending_disputes = self.db.query(Dispute).filter(
            Dispute.status == DisputeStatus.OPEN
        ).count()
        
        # Revenue (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_revenue = self.db.query(func.sum(Contract.total_price)).filter(
            Contract.status == ContractStatus.COMPLETED,
            Contract.completed_at >= thirty_days_ago
        ).scalar() or 0
        
        # Growth metrics (compare with previous month)
        sixty_days_ago = datetime.utcnow() - timedelta(days=60)
        
        prev_month_users = self.db.query(User).filter(
            User.created_at >= sixty_days_ago,
            User.created_at < thirty_days_ago
        ).count()
        
        curr_month_users = self.db.query(User).filter(
            User.created_at >= thirty_days_ago
        ).count()
        
        user_growth = ((curr_month_users - prev_month_users) / max(prev_month_users, 1)) * 100
        
        return {
            "totals": {
                "users": total_users,
                "items": total_items,
                "contracts": total_contracts
            },
            "active": {
                "users": active_users,
                "items": active_items,
                "contracts": active_contracts
            },
            "pending": {
                "items": pending_items,
                "disputes": pending_disputes
            },
            "revenue": {
                "last_30_days": float(recent_revenue),
                "currency": "ETH"
            },
            "growth": {
                "user_growth_percent": user_growth,
                "period": "30d"
            }
        }
    
    def get_users_admin(
        self,
        page: int = 1,
        size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        role: Optional[UserRole] = None
    ) -> PaginatedResponse:
        """
        Get users with admin details.
        
        Args:
            page: Page number
            size: Page size
            search: Search query
            status: User status filter
            role: User role filter
            
        Returns:
            Paginated users with admin details
        """
        query = self.db.query(User)
        
        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        if status:
            query = query.filter(User.status == status)
        
        if role:
            query = query.filter(User.role == role)
        
        # Order by creation date
        query = query.order_by(desc(User.created_at))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * size
        users = query.offset(offset).limit(size).all()
        
        # Enrich with admin details
        enriched_users = []
        for user in users:
            # Get user stats
            items_count = self.db.query(Item).filter(Item.owner_id == user.id).count()
            contracts_count = self.db.query(Contract).filter(
                or_(Contract.owner_id == user.id, Contract.tenant_id == user.id)
            ).count()
            
            user_data = {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "status": user.status.value,
                "role": user.role.value,
                "is_verified": user.is_verified,
                "is_email_verified": user.is_email_verified,
                "created_at": user.created_at,
                "last_login": user.last_login,
                "items_count": items_count,
                "contracts_count": contracts_count,
                "total_earnings": float(user.total_earnings) if user.total_earnings else 0.0
            }
            enriched_users.append(user_data)
        
        # Calculate pagination meta
        pages = (total + size - 1) // size
        
        return PaginatedResponse(
            items=enriched_users,
            meta=PaginationMeta(
                page=page,
                size=size,
                total=total,
                pages=pages,
                has_next=page < pages,
                has_prev=page > 1
            )
        )
    
    def update_user_role(self, user_id: uuid.UUID, role: UserRole) -> Dict[str, Any]:
        """
        Update user role.
        
        Args:
            user_id: User ID
            role: New role
            
        Returns:
            Updated user data
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User", str(user_id))
        
        old_role = user.role
        user.role = role
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(user)
        
        # Send notification to user
        self._create_notification(
            user_id,
            "Role Updated",
            f"Your role has been changed from {old_role.value} to {role.value}",
            NotificationType.INFO
        )
        
        return {
            "id": user.id,
            "email": user.email,
            "role": user.role.value,
            "updated_at": user.updated_at
        }
    
    def verify_user(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """
        Verify user account.
        
        Args:
            user_id: User ID
            
        Returns:
            Updated user data
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User", str(user_id))
        
        user.is_verified = True
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(user)
        
        # Send notification
        self._create_notification(
            user_id,
            "Account Verified",
            "Your account has been verified by administrators",
            NotificationType.SUCCESS
        )
        
        return {
            "id": user.id,
            "email": user.email,
            "is_verified": user.is_verified,
            "verified_at": user.updated_at
        }
    
    def suspend_user(
        self, 
        user_id: uuid.UUID, 
        reason: str, 
        duration_days: Optional[int] = None
    ) -> None:
        """
        Suspend user account.
        
        Args:
            user_id: User ID
            reason: Suspension reason
            duration_days: Optional suspension duration
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User", str(user_id))
        
        if user.role == UserRole.ADMIN:
            raise ForbiddenError("Cannot suspend admin user")
        
        user.status = UserStatus.SUSPENDED
        user.updated_at = datetime.utcnow()
        
        # Store suspension details
        if not user.settings:
            user.settings = {}
        
        user.settings.update({
            "suspension_reason": reason,
            "suspended_at": datetime.utcnow().isoformat(),
            "suspension_duration_days": duration_days
        })
        
        self.db.commit()
        
        # Send notification
        message = f"Your account has been suspended. Reason: {reason}"
        if duration_days:
            message += f" Duration: {duration_days} days"
        
        self._create_notification(
            user_id,
            "Account Suspended",
            message,
            NotificationType.WARNING
        )
    
    def get_pending_items(self, page: int = 1, size: int = 20) -> PaginatedResponse:
        """
        Get items pending approval.
        
        Args:
            page: Page number
            size: Page size
            
        Returns:
            Paginated pending items
        """
        query = self.db.query(Item).filter(
            Item.is_approved == False,
            Item.status != ItemStatus.ARCHIVED
        ).order_by(desc(Item.created_at))
        
        total = query.count()
        offset = (page - 1) * size
        items = query.offset(offset).limit(size).all()
        
        # Enrich with owner info
        enriched_items = []
        for item in items:
            item_data = {
                "id": item.id,
                "title": item.title,
                "description": item.description,
                "price_per_day": float(item.price_per_day),
                "condition": item.condition.value,
                "location": item.location,
                "images": item.images,
                "created_at": item.created_at,
                "owner": {
                    "id": item.owner.id,
                    "name": f"{item.owner.first_name} {item.owner.last_name}",
                    "email": item.owner.email
                }
            }
            enriched_items.append(item_data)
        
        pages = (total + size - 1) // size
        
        return PaginatedResponse(
            items=enriched_items,
            meta=PaginationMeta(
                page=page,
                size=size,
                total=total,
                pages=pages,
                has_next=page < pages,
                has_prev=page > 1
            )
        )
    
    def approve_item(self, item_id: uuid.UUID, admin_id: uuid.UUID) -> Dict[str, Any]:
        """
        Approve item for listing.
        
        Args:
            item_id: Item ID
            admin_id: Admin user ID
            
        Returns:
            Updated item data
        """
        item = self.db.query(Item).filter(Item.id == item_id).first()
        if not item:
            raise NotFoundError("Item", str(item_id))
        
        item.is_approved = True
        item.approved_at = datetime.utcnow()
        item.approved_by = admin_id
        item.status = ItemStatus.ACTIVE
        item.published_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(item)
        
        # Notify owner
        self._create_notification(
            item.owner_id,
            "Item Approved",
            f"Your item '{item.title}' has been approved and is now live",
            NotificationType.SUCCESS
        )
        
        return {
            "id": item.id,
            "title": item.title,
            "is_approved": item.is_approved,
            "approved_at": item.approved_at
        }
    
    def reject_item(self, item_id: uuid.UUID, reason: str, admin_id: uuid.UUID) -> Dict[str, Any]:
        """
        Reject item listing.
        
        Args:
            item_id: Item ID
            reason: Rejection reason
            admin_id: Admin user ID
            
        Returns:
            Updated item data
        """
        item = self.db.query(Item).filter(Item.id == item_id).first()
        if not item:
            raise NotFoundError("Item", str(item_id))
        
        item.rejection_reason = reason
        item.approved_by = admin_id
        item.status = ItemStatus.SUSPENDED
        
        self.db.commit()
        self.db.refresh(item)
        
        # Notify owner
        self._create_notification(
            item.owner_id,
            "Item Rejected",
            f"Your item '{item.title}' was rejected. Reason: {reason}",
            NotificationType.ERROR
        )
        
        return {
            "id": item.id,
            "title": item.title,
            "is_approved": item.is_approved,
            "rejection_reason": item.rejection_reason
        }
    
    def get_disputes(
        self, 
        page: int = 1, 
        size: int = 20, 
        status: Optional[str] = None
    ) -> PaginatedResponse:
        """
        Get contract disputes.
        
        Args:
            page: Page number
            size: Page size
            status: Dispute status filter
            
        Returns:
            Paginated disputes
        """
        query = self.db.query(Dispute).order_by(desc(Dispute.created_at))
        
        if status:
            query = query.filter(Dispute.status == status)
        
        total = query.count()
        offset = (page - 1) * size
        disputes = query.offset(offset).limit(size).all()
        
        # Enrich with contract and user info
        enriched_disputes = []
        for dispute in disputes:
            dispute_data = {
                "id": dispute.id,
                "contract_id": dispute.contract_id,
                "reason": dispute.reason,
                "description": dispute.description,
                "status": dispute.status.value,
                "priority": dispute.priority,
                "created_at": dispute.created_at,
                "complainant": {
                    "id": dispute.complainant.id,
                    "name": f"{dispute.complainant.first_name} {dispute.complainant.last_name}",
                    "email": dispute.complainant.email
                },
                "contract": {
                    "id": dispute.contract.id,
                    "item_title": dispute.contract.item.title,
                    "total_price": float(dispute.contract.total_price)
                }
            }
            enriched_disputes.append(dispute_data)
        
        pages = (total + size - 1) // size
        
        return PaginatedResponse(
            items=enriched_disputes,
            meta=PaginationMeta(
                page=page,
                size=size,
                total=total,
                pages=pages,
                has_next=page < pages,
                has_prev=page > 1
            )
        )
    
    def resolve_dispute(
        self,
        dispute_id: uuid.UUID,
        resolution: str,
        admin_id: uuid.UUID,
        compensation_amount: Optional[float] = None,
        compensation_recipient: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        Resolve contract dispute.
        
        Args:
            dispute_id: Dispute ID
            resolution: Resolution description
            compensation_amount: Optional compensation amount
            compensation_recipient: Optional compensation recipient
            admin_id: Admin user ID
            
        Returns:
            Updated dispute data
        """
        dispute = self.db.query(Dispute).filter(Dispute.id == dispute_id).first()
        if not dispute:
            raise NotFoundError("Dispute", str(dispute_id))
        
        dispute.status = DisputeStatus.RESOLVED
        dispute.resolution = resolution
        dispute.resolution_date = datetime.utcnow()
        dispute.assigned_to = admin_id
        
        if compensation_amount:
            dispute.compensation_amount = compensation_amount
            dispute.compensation_recipient = compensation_recipient
        
        self.db.commit()
        self.db.refresh(dispute)
        
        # Notify involved parties
        contract = dispute.contract
        parties = [contract.tenant_id, contract.owner_id]
        
        for party_id in parties:
            self._create_notification(
                party_id,
                "Dispute Resolved",
                f"Dispute for contract has been resolved: {resolution}",
                NotificationType.INFO
            )
        
        return {
            "id": dispute.id,
            "status": dispute.status.value,
            "resolution": dispute.resolution,
            "resolved_at": dispute.resolution_date
        }
    
    def get_activity_report(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """
        Get platform activity report.
        
        Args:
            start_date: Report start date
            end_date: Report end date
            
        Returns:
            Activity report data
        """
        # User registrations
        new_users = self.db.query(User).filter(
            User.created_at >= start_date,
            User.created_at <= end_date
        ).count()
        
        # New items
        new_items = self.db.query(Item).filter(
            Item.created_at >= start_date,
            Item.created_at <= end_date
        ).count()
        
        # New contracts
        new_contracts = self.db.query(Contract).filter(
            Contract.created_at >= start_date,
            Contract.created_at <= end_date
        ).count()
        
        # Completed contracts
        completed_contracts = self.db.query(Contract).filter(
            Contract.completed_at >= start_date,
            Contract.completed_at <= end_date,
            Contract.status == ContractStatus.COMPLETED
        ).count()
        
        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "activity": {
                "new_users": new_users,
                "new_items": new_items,
                "new_contracts": new_contracts,
                "completed_contracts": completed_contracts
            }
        }
    
    def get_financial_report(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """
        Get financial report.
        
        Args:
            start_date: Report start date
            end_date: Report end date
            
        Returns:
            Financial report data
        """
        # Total revenue from completed contracts
        completed_contracts = self.db.query(Contract).filter(
            Contract.completed_at >= start_date,
            Contract.completed_at <= end_date,
            Contract.status == ContractStatus.COMPLETED
        ).all()
        
        total_revenue = sum(float(c.total_price) for c in completed_contracts)
        total_deposits = sum(float(c.deposit) for c in completed_contracts if c.deposit)
        
        # Average contract value
        avg_contract_value = total_revenue / len(completed_contracts) if completed_contracts else 0
        
        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "financial": {
                "total_revenue": total_revenue,
                "total_deposits": total_deposits,
                "contracts_count": len(completed_contracts),
                "average_contract_value": avg_contract_value,
                "currency": "ETH"
            }
        }
    
    def get_system_health(self) -> Dict[str, Any]:
        """
        Get system health status.
        
        Returns:
            System health data
        """
        # Database health
        try:
            self.db.execute(text("SELECT 1"))
            db_status = "healthy"
        except:
            db_status = "unhealthy"
        
        # Redis health
        try:
            redis_client.ping()
            redis_status = "healthy"
        except:
            redis_status = "unhealthy"
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": db_status,
                "redis": redis_status
            },
            "overall_status": "healthy" if all([db_status == "healthy", redis_status == "healthy"]) else "degraded"
        }
    
    def get_system_logs(self, level: str = "ERROR", limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get system logs (mock implementation).
        
        Args:
            level: Log level
            limit: Number of logs
            
        Returns:
            System logs
        """
        # This would integrate with your logging system
        # For now, return mock data
        logs = []
        for i in range(min(limit, 10)):
            logs.append({
                "timestamp": (datetime.utcnow() - timedelta(hours=i)).isoformat(),
                "level": level,
                "message": f"Sample {level} log message {i}",
                "source": "backend.api",
                "details": {}
            })
        
        return logs
    
    def create_announcement(
        self,
        title: str,
        content: str,
        admin_id: uuid.UUID,
        priority: str = "normal",
        expires_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Create platform announcement.
        
        Args:
            title: Announcement title
            content: Announcement content
            priority: Priority level
            expires_at: Optional expiration date
            admin_id: Admin user ID
            
        Returns:
            Created announcement data
        """
        # Get all active users for notification
        active_users = self.db.query(User).filter(User.status == UserStatus.ACTIVE).all()
        
        # Create notifications for all users
        for user in active_users:
            self._create_notification(
                user.id,
                title,
                content,
                NotificationType.INFO if priority == "normal" else NotificationType.WARNING
            )
        
        return {
            "title": title,
            "content": content,
            "priority": priority,
            "recipients_count": len(active_users),
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": expires_at.isoformat() if expires_at else None
        }
    
    def get_platform_settings(self) -> Dict[str, Any]:
        """
        Get platform settings (mock implementation).
        
        Returns:
            Platform settings
        """
        # This would come from a settings table or config
        return {
            "maintenance_mode": False,
            "registration_enabled": True,
            "email_verification_required": True,
            "auto_approve_items": False,
            "max_file_size_mb": 10,
            "supported_currencies": ["ETH", "USD"],
            "platform_fee_percent": 2.5,
            "min_rental_duration_hours": 24,
            "max_rental_duration_days": 365
        }
    
    def update_platform_settings(self, settings_data: Dict[str, Any], admin_id: uuid.UUID) -> Dict[str, Any]:
        """
        Update platform settings.
        
        Args:
            settings_data: New settings data
            admin_id: Admin user ID
            
        Returns:
            Updated settings
        """
        # This would update settings in database/config
        # For now, just return the input data
        updated_settings = {
            **self.get_platform_settings(),
            **settings_data,
            "updated_by": admin_id,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        return updated_settings
    
    def create_database_backup(self) -> Dict[str, Any]:
        """
        Create database backup (mock implementation).
        
        Returns:
            Backup creation result
        """
        # This would trigger actual backup process
        backup_id = str(uuid.uuid4())
        return {
            "backup_id": backup_id,
            "status": "initiated",
            "created_at": datetime.utcnow().isoformat(),
            "estimated_completion": (datetime.utcnow() + timedelta(minutes=30)).isoformat()
        }
    
    def export_users_data(self, format: str = "csv") -> str:
        """
        Export users data.
        
        Args:
            format: Export format (csv, json)
            
        Returns:
            File URL or path
        """
        users = self.db.query(User).all()
        
        if format == "csv":
            return self._export_users_csv(users)
        elif format == "json":
            return self._export_users_json(users)
        else:
            raise BadRequestError("Unsupported export format")
    
    def export_analytics_data(
        self, 
        start_date: datetime, 
        end_date: datetime, 
        format: str = "csv"
    ) -> str:
        """
        Export analytics data.
        
        Args:
            start_date: Start date
            end_date: End date
            format: Export format
            
        Returns:
            File URL or path
        """
        # Get analytics data
        contracts = self.db.query(Contract).filter(
            Contract.created_at >= start_date,
            Contract.created_at <= end_date
        ).all()
        
        if format == "csv":
            return self._export_analytics_csv(contracts, start_date, end_date)
        elif format == "json":
            return self._export_analytics_json(contracts, start_date, end_date)
        else:
            raise BadRequestError("Unsupported export format")
    
    def send_bulk_email(
        self, 
        subject: str, 
        content: str, 
        admin_id: uuid.UUID,
        user_filter: Dict[str, Any] = {}
    ) -> Dict[str, Any]:
        """
        Send bulk email to users.
        
        Args:
            subject: Email subject
            content: Email content
            user_filter: User filter criteria
            admin_id: Admin user ID
            
        Returns:
            Bulk email result
        """
        # Build user query based on filter
        query = self.db.query(User).filter(User.status == UserStatus.ACTIVE)
        
        if user_filter.get("role"):
            query = query.filter(User.role == user_filter["role"])
        
        if user_filter.get("verified_only"):
            query = query.filter(User.is_verified == True)
        
        users = query.all()
        
        # Queue emails (in production, use Celery)
        email_count = 0
        for user in users:
            try:
                # This would be queued as a background task
                self.email_service.send_email(user.email, subject, content)
                email_count += 1
            except Exception as e:
                print(f"Failed to queue email for {user.email}: {e}")
        
        return {
            "queued_emails": email_count,
            "total_recipients": len(users),
            "created_at": datetime.utcnow().isoformat()
        }
    
    def toggle_maintenance_mode(self, enabled: bool, message: Optional[str] = None) -> None:
        """
        Toggle maintenance mode.
        
        Args:
            enabled: Whether to enable maintenance mode
            message: Optional maintenance message
        """
        # This would update maintenance mode setting
        # For now, just store in Redis
        try:
            redis_client.set("maintenance_mode", "true" if enabled else "false")
            if message:
                redis_client.set("maintenance_message", message)
            else:
                redis_client.delete("maintenance_message")
        except Exception as e:
            print(f"Failed to update maintenance mode: {e}")
    
    def clear_cache(self, cache_type: str = "all") -> None:
        """
        Clear application cache.
        
        Args:
            cache_type: Type of cache to clear
        """
        try:
            if cache_type in ["all", "redis"]:
                # Clear Redis cache
                redis_client.flushdb()
            
            # Add other cache clearing logic here
            
        except Exception as e:
            print(f"Failed to clear cache: {e}")
    
    def _create_notification(
        self, 
        user_id: uuid.UUID, 
        title: str, 
        message: str, 
        type: NotificationType
    ) -> None:
        """
        Create notification for user.
        
        Args:
            user_id: User ID
            title: Notification title
            message: Notification message
            type: Notification type
        """
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type
        )
        
        self.db.add(notification)
        self.db.commit()
    
    def _export_users_csv(self, users: List[User]) -> str:
        """
        Export users to CSV format.
        
        Args:
            users: List of users
            
        Returns:
            CSV file path or URL
        """
        # Create CSV content
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'ID', 'Email', 'First Name', 'Last Name', 'Status', 'Role',
            'Verified', 'Created At', 'Last Login', 'Total Earnings'
        ])
        
        # Write data
        for user in users:
            writer.writerow([
                str(user.id),
                user.email,
                user.first_name,
                user.last_name,
                user.status.value,
                user.role.value,
                user.is_verified,
                user.created_at.isoformat() if user.created_at else '',
                user.last_login.isoformat() if user.last_login else '',
                float(user.total_earnings) if user.total_earnings else 0.0
            ])
        
        # Save to file (in production, upload to cloud storage)
        filename = f"users_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        file_path = os.path.join("exports", filename)
        os.makedirs("exports", exist_ok=True)
        
        with open(file_path, 'w', newline='') as f:
            f.write(output.getvalue())
        
        return f"/exports/{filename}"
    
    def _export_users_json(self, users: List[User]) -> str:
        """
        Export users to JSON format.
        
        Args:
            users: List of users
            
        Returns:
            JSON file path or URL
        """
        users_data = []
        for user in users:
            users_data.append({
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "status": user.status.value,
                "role": user.role.value,
                "is_verified": user.is_verified,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "total_earnings": float(user.total_earnings) if user.total_earnings else 0.0
            })
        
        # Save to file
        filename = f"users_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        file_path = os.path.join("exports", filename)
        os.makedirs("exports", exist_ok=True)
        
        with open(file_path, 'w') as f:
            json.dump(users_data, f, indent=2)
        
        return f"/exports/{filename}"
    
    def _export_analytics_csv(
        self, 
        contracts: List[Contract], 
        start_date: datetime, 
        end_date: datetime
    ) -> str:
        """
        Export analytics to CSV format.
        
        Args:
            contracts: List of contracts
            start_date: Start date
            end_date: End date
            
        Returns:
            CSV file path or URL
        """
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Contract ID', 'Item Title', 'Owner Email', 'Tenant Email',
            'Start Date', 'End Date', 'Total Price', 'Status', 'Created At', 'Completed At'
        ])
        
        # Write data
        for contract in contracts:
            writer.writerow([
                str(contract.id),
                contract.item.title if contract.item else '',
                contract.owner.email if contract.owner else '',
                contract.tenant.email if contract.tenant else '',
                contract.start_date.isoformat() if contract.start_date else '',
                contract.end_date.isoformat() if contract.end_date else '',
                float(contract.total_price),
                contract.status.value,
                contract.created_at.isoformat() if contract.created_at else '',
                contract.completed_at.isoformat() if contract.completed_at else ''
            ])
        
        # Save to file
        filename = f"analytics_export_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.csv"
        file_path = os.path.join("exports", filename)
        os.makedirs("exports", exist_ok=True)
        
        with open(file_path, 'w', newline='') as f:
            f.write(output.getvalue())
        
        return f"/exports/{filename}"
    
    def _export_analytics_json(
        self, 
        contracts: List[Contract], 
        start_date: datetime, 
        end_date: datetime
    ) -> str:
        """
        Export analytics to JSON format.
        
        Args:
            contracts: List of contracts
            start_date: Start date
            end_date: End date
            
        Returns:
            JSON file path or URL
        """
        analytics_data = {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "contracts": []
        }
        
        for contract in contracts:
            analytics_data["contracts"].append({
                "id": str(contract.id),
                "item_title": contract.item.title if contract.item else None,
                "owner_email": contract.owner.email if contract.owner else None,
                "tenant_email": contract.tenant.email if contract.tenant else None,
                "start_date": contract.start_date.isoformat() if contract.start_date else None,
                "end_date": contract.end_date.isoformat() if contract.end_date else None,
                "total_price": float(contract.total_price),
                "status": contract.status.value,
                "created_at": contract.created_at.isoformat() if contract.created_at else None,
                "completed_at": contract.completed_at.isoformat() if contract.completed_at else None
            })
        
        # Save to file
        filename = f"analytics_export_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.json"
        file_path = os.path.join("exports", filename)
        os.makedirs("exports", exist_ok=True)
        
        with open(file_path, 'w') as f:
            json.dump(analytics_data, f, indent=2)
        
        return f"/exports/{filename}"