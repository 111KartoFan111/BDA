"""
Celery configuration for background tasks.
"""

from celery import Celery
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "rentchain",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=['app.tasks']
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_disable_rate_limits=True,
    worker_prefetch_multiplier=1,
)

# Task routing
celery_app.conf.task_routes = {
    'app.tasks.email.*': {'queue': 'email'},
    'app.tasks.analytics.*': {'queue': 'analytics'},
    'app.tasks.blockchain.*': {'queue': 'blockchain'},
}

# Periodic tasks
celery_app.conf.beat_schedule = {
    'cleanup-expired-tokens': {
        'task': 'app.tasks.auth.cleanup_expired_tokens',
        'schedule': 3600.0,  # Run every hour
    },
    'update-item-analytics': {
        'task': 'app.tasks.analytics.update_item_analytics',
        'schedule': 1800.0,  # Run every 30 minutes
    },
    'process-ml-predictions': {
        'task': 'app.tasks.ml.process_ml_predictions',
        'schedule': 7200.0,  # Run every 2 hours
    },
}