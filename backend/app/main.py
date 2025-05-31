"""
Main FastAPI application for RentChain backend.
ИСПРАВЛЕН CORS для работы с браузером.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import time
import logging

from app.core.config import settings
from app.core.database import engine
from app.models.base import Base
from app.api.v1.api import api_router
from app.utils.exceptions import (
    CustomHTTPException,
    ValidationException,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description=settings.DESCRIPTION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

if settings.DEBUG:
    logger.info("🚨 Development mode: Enabling permissive CORS")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # В разработке разрешаем всё
        allow_credentials=False,  # Важно: False когда allow_origins=["*"]
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Process-Time"],
        max_age=86400,
    )
    logger.info("✅ CORS configured for development (allow all origins)")
else:
    # Production CORS - только разрешённые origins
    origins = []
    if settings.BACKEND_CORS_ORIGINS:
        if isinstance(settings.BACKEND_CORS_ORIGINS, str):
            origins = [origins.strip() for origins in settings.BACKEND_CORS_ORIGINS.split(",")]
        else:
            origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Accept",
            "Accept-Language", 
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-Process-Time",
            "Origin"
        ],
        expose_headers=["X-Process-Time"],
        max_age=86400,
    )
    logger.info(f"✅ CORS configured for production with origins: {origins}")

# Trusted host middleware - только для production
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "*.yourdomain.com"]
    )

# Custom middleware for request timing
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Middleware для логирования запросов
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    
    # Логируем заголовки для отладки CORS
    if request.method == "OPTIONS":
        logger.info(f"OPTIONS request headers: {dict(request.headers)}")
        origin = request.headers.get("origin")
        logger.info(f"Origin: {origin}")
        
        # Проверяем, разрешён ли этот origin
        if settings.DEBUG:
            logger.info("✅ Development mode: All origins allowed")
        else:
            allowed_origins = []
            if settings.BACKEND_CORS_ORIGINS:
                if isinstance(settings.BACKEND_CORS_ORIGINS, str):
                    allowed_origins = [o.strip() for o in settings.BACKEND_CORS_ORIGINS.split(",")]
                else:
                    allowed_origins = [str(o) for o in settings.BACKEND_CORS_ORIGINS]
            
            if origin in allowed_origins:
                logger.info(f"✅ Origin {origin} is allowed")
            else:
                logger.warning(f"❌ Origin {origin} is NOT in allowed list: {allowed_origins}")
    
    response = await call_next(request)
    
    logger.info(f"Response: {response.status_code}")
    return response

# Exception handlers
@app.exception_handler(CustomHTTPException)
async def custom_http_exception_handler(request: Request, exc: CustomHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "message": exc.detail,
            "details": exc.details
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP_ERROR",
            "message": exc.detail
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Convert validation errors to serializable format
    errors = []
    for error in exc.errors():
        error_dict = {
            "type": error.get("type", ""),
            "loc": list(error.get("loc", [])),
            "msg": str(error.get("msg", "")),
            "input": str(error.get("input", "")) if error.get("input") is not None else None
        }
        errors.append(error_dict)
    
    return JSONResponse(
        status_code=422,
        content={
            "error": "VALIDATION_ERROR",
            "message": "Validation failed",
            "details": errors
        }
    )

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    logger.error(f"ValueError: {exc}", exc_info=True)
    return JSONResponse(
        status_code=400,
        content={
            "error": "VALUE_ERROR",
            "message": str(exc)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "Internal server error occurred"
        }
    )

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.PROJECT_VERSION,
        "environment": settings.ENVIRONMENT,
        "cors_enabled": True,
        "debug_mode": settings.DEBUG
    }

# CORS Test endpoint - для отладки
@app.get("/cors-test")
async def cors_test():
    """Endpoint для тестирования CORS."""
    return {
        "message": "CORS working!",
        "timestamp": time.time(),
        "debug": settings.DEBUG
    }

# Explicit OPTIONS handler - УБИРАЕМ, FastAPI CORS middleware сам обрабатывает
# @app.options("/api/v1/{path:path}")  # УДАЛЕНО

# API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Application startup event."""
    logger.info(f"🚀 Starting {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    
    if settings.DEBUG:
        logger.info("🚨 DEVELOPMENT MODE: CORS allows all origins")
    else:
        logger.info(f"CORS origins: {settings.BACKEND_CORS_ORIGINS}")
    
    # Create database tables
    if settings.DEBUG:
        # In production, use Alembic migrations instead
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event."""
    logger.info("Shutting down application")

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "version": settings.PROJECT_VERSION,
        "docs": "/docs",
        "health": "/health",
        "cors_test": "/cors-test"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )