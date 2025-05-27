"""
Common schemas used across the application.
"""

from typing import Optional, Generic, TypeVar, List, Dict, Any
from pydantic import BaseModel, ConfigDict

DataT = TypeVar('DataT')


class ResponseBase(BaseModel):
    """Base response schema."""
    success: bool = True
    message: Optional[str] = None


class Response(BaseModel, Generic[DataT]):
    """Generic response schema."""
    success: bool = True
    message: Optional[str] = None
    data: Optional[DataT] = None


class ErrorResponse(ResponseBase):
    """Error response schema."""
    success: bool = False
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class PaginationMeta(BaseModel):
    """Pagination metadata schema."""
    page: int
    size: int
    total: int
    pages: int
    has_next: bool
    has_prev: bool


class PaginatedResponse(BaseModel, Generic[DataT]):
    """Paginated response schema."""
    items: List[DataT]
    meta: PaginationMeta


class FileUpload(BaseModel):
    """File upload response schema."""
    filename: str
    url: str
    size: int
    content_type: str


class HealthCheck(BaseModel):
    """Health check response schema."""
    status: str
    version: str
    environment: str
    timestamp: str
    database: str
    redis: str


class SearchFilters(BaseModel):
    """Common search filters."""
    query: Optional[str] = None
    sort_by: str = "created_at"
    sort_order: str = "desc"
    page: int = 1
    size: int = 20
    
    model_config = ConfigDict(extra="allow")  # Allow additional filter fields


class DateRange(BaseModel):
    """Date range filter."""
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class Location(BaseModel):
    """Location schema."""
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    country: Optional[str] = None


class ContactInfo(BaseModel):
    """Contact information schema."""
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    social_links: Dict[str, str] = {}


class Notification(BaseModel):
    """Notification schema."""
    id: str
    title: str
    message: str
    type: str = "info"
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    is_read: bool = False
    created_at: str


class SystemSettings(BaseModel):
    """System settings schema."""
    key: str
    value: Any
    description: Optional[str] = None
    type: str = "string"
    is_public: bool = False


class AuditLog(BaseModel):
    """Audit log schema."""
    id: str
    user_id: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: str


class APIKey(BaseModel):
    """API key schema."""
    id: str
    name: str
    key: str
    permissions: List[str] = []
    is_active: bool = True
    expires_at: Optional[str] = None
    created_at: str


class BackupInfo(BaseModel):
    """Backup information schema."""
    filename: str
    size: int
    created_at: str
    type: str = "full"
    status: str = "completed"


class QueueJob(BaseModel):
    """Queue job schema."""
    id: str
    name: str
    status: str
    progress: int = 0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None