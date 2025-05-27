"""
Custom exception classes for the application.
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException


class CustomHTTPException(HTTPException):
    """Custom HTTP exception with additional fields."""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str = None,
        details: Dict[str, Any] = None,
        headers: Dict[str, str] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code or "GENERIC_ERROR"
        self.details = details or {}


class ValidationException(CustomHTTPException):
    """Validation error exception."""
    
    def __init__(self, detail: str, errors: Dict[str, Any] = None):
        super().__init__(
            status_code=422,
            detail=detail,
            error_code="VALIDATION_ERROR",
            details={"errors": errors or {}}
        )


class NotFoundError(CustomHTTPException):
    """Resource not found exception."""
    
    def __init__(self, resource: str, identifier: str = None):
        detail = f"{resource} not found"
        if identifier:
            detail += f" (ID: {identifier})"
        
        super().__init__(
            status_code=404,
            detail=detail,
            error_code="NOT_FOUND",
            details={"resource": resource, "identifier": identifier}
        )


class UnauthorizedError(CustomHTTPException):
    """Unauthorized access exception."""
    
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(
            status_code=401,
            detail=detail,
            error_code="UNAUTHORIZED",
            headers={"WWW-Authenticate": "Bearer"}
        )


class ForbiddenError(CustomHTTPException):
    """Forbidden access exception."""
    
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(
            status_code=403,
            detail=detail,
            error_code="FORBIDDEN"
        )


class ConflictError(CustomHTTPException):
    """Resource conflict exception."""
    
    def __init__(self, detail: str, resource: str = None):
        super().__init__(
            status_code=409,
            detail=detail,
            error_code="CONFLICT",
            details={"resource": resource}
        )


class BadRequestError(CustomHTTPException):
    """Bad request exception."""
    
    def __init__(self, detail: str, details: Dict[str, Any] = None):
        super().__init__(
            status_code=400,
            detail=detail,
            error_code="BAD_REQUEST",
            details=details or {}
        )


class InternalServerError(CustomHTTPException):
    """Internal server error exception."""
    
    def __init__(self, detail: str = "Internal server error"):
        super().__init__(
            status_code=500,
            detail=detail,
            error_code="INTERNAL_SERVER_ERROR"
        )


class ServiceUnavailableError(CustomHTTPException):
    """Service unavailable exception."""
    
    def __init__(self, service: str, detail: str = None):
        detail = detail or f"{service} service is currently unavailable"
        super().__init__(
            status_code=503,
            detail=detail,
            error_code="SERVICE_UNAVAILABLE",
            details={"service": service}
        )


class RateLimitError(CustomHTTPException):
    """Rate limit exceeded exception."""
    
    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(
            status_code=429,
            detail=detail,
            error_code="RATE_LIMIT_EXCEEDED",
            headers={"Retry-After": "60"}
        )


class FileUploadError(CustomHTTPException):
    """File upload error exception."""
    
    def __init__(self, detail: str, filename: str = None):
        super().__init__(
            status_code=400,
            detail=detail,
            error_code="FILE_UPLOAD_ERROR",
            details={"filename": filename}
        )


class BlockchainError(CustomHTTPException):
    """Blockchain operation error exception."""
    
    def __init__(self, detail: str, transaction_hash: str = None):
        super().__init__(
            status_code=500,
            detail=detail,
            error_code="BLOCKCHAIN_ERROR",
            details={"transaction_hash": transaction_hash}
        )


class PaymentError(CustomHTTPException):
    """Payment processing error exception."""
    
    def __init__(self, detail: str, payment_id: str = None):
        super().__init__(
            status_code=402,
            detail=detail,
            error_code="PAYMENT_ERROR",
            details={"payment_id": payment_id}
        )


class ExternalServiceError(CustomHTTPException):
    """External service error exception."""
    
    def __init__(self, service_name: str, detail: str = None):
        detail = detail or f"Error communicating with {service_name}"
        super().__init__(
            status_code=502,
            detail=detail,
            error_code="EXTERNAL_SERVICE_ERROR",
            details={"service": service_name}
        )


# Exception helper functions
def raise_not_found(resource: str, identifier: str = None) -> None:
    """Raise NotFoundError."""
    raise NotFoundError(resource, identifier)


def raise_unauthorized(detail: str = "Not authenticated") -> None:
    """Raise UnauthorizedError."""
    raise UnauthorizedError(detail)


def raise_forbidden(detail: str = "Not enough permissions") -> None:
    """Raise ForbiddenError."""
    raise ForbiddenError(detail)


def raise_conflict(detail: str, resource: str = None) -> None:
    """Raise ConflictError."""
    raise ConflictError(detail, resource)


def raise_bad_request(detail: str, details: Dict[str, Any] = None) -> None:
    """Raise BadRequestError."""
    raise BadRequestError(detail, details)


def raise_validation_error(detail: str, errors: Dict[str, Any] = None) -> None:
    """Raise ValidationException."""
    raise ValidationException(detail, errors)