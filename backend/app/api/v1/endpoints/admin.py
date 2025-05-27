"""
Admin endpoints.
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.core.database import get_db
from app.utils.dependencies import get_current_admin_user
from app.services.admin import AdminService
from app.schemas.common import Response, PaginatedResponse
from app.models.user import User, UserRole

router = APIRouter()


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    """Get admin service dependency."""
    from app.services.admin import AdminService
    return AdminService(db)


@router.get("/dashboard", response_model=Response[dict])
async def get_admin_dashboard(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get admin dashboard with key metrics.
    """
    dashboard_data = admin_service.get_dashboard_overview()
    return Response(data=dashboard_data)


@router.get("/users", response_model=PaginatedResponse[dict])
async def get_users_admin(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    search: Optional[str] = Query(None, description="Search query"),
    status: Optional[str] = Query(None, description="User status filter"),
    role: Optional[UserRole] = Query(None, description="User role filter"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get users with admin details.
    """
    result = admin_service.get_users_admin(page, size, search, status, role)
    return result


@router.patch("/users/{user_id}/role", response_model=Response[dict])
async def update_user_role(
    user_id: uuid.UUID,
    role: UserRole,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Update user role.
    """
    user = admin_service.update_user_role(user_id, role)
    return Response(
        data=user,
        message=f"User role updated to {role.value}"
    )


@router.patch("/users/{user_id}/verify", response_model=Response[dict])
async def verify_user_admin(
    user_id: uuid.UUID,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Verify user account.
    """
    user = admin_service.verify_user(user_id)
    return Response(
        data=user,
        message="User verified successfully"
    )


@router.patch("/users/{user_id}/suspend", response_model=Response[None])
async def suspend_user_admin(
    user_id: uuid.UUID,
    reason: str,
    duration_days: Optional[int] = None,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Suspend user account.
    """
    admin_service.suspend_user(user_id, reason, duration_days)
    return Response(message="User suspended successfully")


@router.get("/items/pending", response_model=PaginatedResponse[dict])
async def get_pending_items(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get items pending approval.
    """
    result = admin_service.get_pending_items(page, size)
    return result


@router.patch("/items/{item_id}/approve", response_model=Response[dict])
async def approve_item(
    item_id: uuid.UUID,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Approve item for listing.
    """
    item = admin_service.approve_item(item_id, current_user.id)
    return Response(
        data=item,
        message="Item approved successfully"
    )


@router.patch("/items/{item_id}/reject", response_model=Response[dict])
async def reject_item(
    item_id: uuid.UUID,
    reason: str,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Reject item listing.
    """
    item = admin_service.reject_item(item_id, reason, current_user.id)
    return Response(
        data=item,
        message="Item rejected"
    )


@router.get("/contracts/disputes", response_model=PaginatedResponse[dict])
async def get_disputes(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    status: Optional[str] = Query(None, description="Dispute status filter"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get contract disputes.
    """
    result = admin_service.get_disputes(page, size, status)
    return result


@router.patch("/contracts/disputes/{dispute_id}/resolve", response_model=Response[dict])
async def resolve_dispute(
    dispute_id: uuid.UUID,
    resolution: str,
    compensation_amount: Optional[float] = None,
    compensation_recipient: Optional[uuid.UUID] = None,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Resolve contract dispute.
    """
    dispute = admin_service.resolve_dispute(
        dispute_id, resolution, compensation_amount, 
        compensation_recipient, current_user.id
    )
    return Response(
        data=dispute,
        message="Dispute resolved successfully"
    )


@router.get("/reports/activity", response_model=Response[dict])
async def get_activity_report(
    start_date: datetime,
    end_date: datetime,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get platform activity report.
    """
    report = admin_service.get_activity_report(start_date, end_date)
    return Response(data=report)


@router.get("/reports/financial", response_model=Response[dict])
async def get_financial_report(
    start_date: datetime,
    end_date: datetime,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get financial report.
    """
    report = admin_service.get_financial_report(start_date, end_date)
    return Response(data=report)


@router.get("/system/health", response_model=Response[dict])
async def get_system_health(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get system health status.
    """
    health = admin_service.get_system_health()
    return Response(data=health)


@router.get("/system/logs", response_model=Response[List[dict]])
async def get_system_logs(
    level: str = Query("ERROR", description="Log level"),
    limit: int = Query(100, ge=1, le=1000, description="Number of logs"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get system logs.
    """
    logs = admin_service.get_system_logs(level, limit)
    return Response(data=logs)


@router.post("/announcements", response_model=Response[dict])
async def create_announcement(
    title: str,
    content: str,
    priority: str = "normal",
    expires_at: Optional[datetime] = None,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Create platform announcement.
    """
    announcement = admin_service.create_announcement(
        title, content, current_user.id, priority, expires_at
    )
    return Response(
        data=announcement,
        message="Announcement created successfully"
    )


@router.get("/settings", response_model=Response[dict])
async def get_platform_settings(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get platform settings.
    """
    settings = admin_service.get_platform_settings()
    return Response(data=settings)


@router.patch("/settings", response_model=Response[dict])
async def update_platform_settings(
    settings_data: dict,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Update platform settings.
    """
    settings = admin_service.update_platform_settings(settings_data, current_user.id)
    return Response(
        data=settings,
        message="Settings updated successfully"
    )


@router.post("/backup/database", response_model=Response[dict])
async def backup_database(
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Create database backup.
    """
    result = admin_service.create_database_backup()
    return Response(
        data=result,
        message="Database backup initiated"
    )


@router.get("/export/users", response_model=Response[str])
async def export_users_data(
    format: str = Query("csv", description="Export format: csv, json"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Export users data.
    """
    file_url = admin_service.export_users_data(format)
    return Response(
        data=file_url,
        message="Users data exported successfully"
    )


@router.get("/export/analytics", response_model=Response[str])
async def export_analytics_data(
    start_date: datetime,
    end_date: datetime,
    format: str = Query("csv", description="Export format: csv, json"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Export analytics data.
    """
    file_url = admin_service.export_analytics_data(start_date, end_date, format)
    return Response(
        data=file_url,
        message="Analytics data exported successfully"
    )


@router.post("/bulk/email", response_model=Response[dict])
async def send_bulk_email(
    subject: str,
    content: str,
    user_filter: dict = {},
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Send bulk email to users.
    """
    result = admin_service.send_bulk_email(subject, content, current_user.id, user_filter)
    return Response(
        data=result,
        message="Bulk email queued successfully"
    )


@router.post("/maintenance/mode", response_model=Response[None])
async def toggle_maintenance_mode(
    enabled: bool,
    message: Optional[str] = None,
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Toggle maintenance mode.
    """
    admin_service.toggle_maintenance_mode(enabled, message)
    return Response(
        message=f"Maintenance mode {'enabled' if enabled else 'disabled'}"
    )


@router.delete("/cache/clear", response_model=Response[None])
async def clear_cache(
    cache_type: str = Query("all", description="Cache type: all, redis, memory"),
    admin_service: AdminService = Depends(get_admin_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Clear application cache.
    """
    admin_service.clear_cache(cache_type)
    return Response(message="Cache cleared successfully")