# backend/app/core/celery.py - ИСПРАВЛЕНО

"""
Celery configuration for background tasks.
ИСПРАВЛЕНО: Убраны несуществующие таски из beat_schedule
"""

from celery import Celery
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "rentchain",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=['app.tasks']  # Только базовый модуль tasks
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
    task_acks_late=True,  # Подтверждать задачи только после выполнения
    worker_max_tasks_per_child=1000,  # Перезапускать воркер после 1000 задач
)

# Task routing
celery_app.conf.task_routes = {
    'app.tasks.send_email_task': {'queue': 'email'},
    'app.tasks.send_password_reset_email_task': {'queue': 'email'},
    'app.tasks.send_email_verification_task': {'queue': 'email'},
    'app.tasks.send_welcome_email_task': {'queue': 'email'},
    'app.tasks.send_contract_notification_task': {'queue': 'email'},
    'app.tasks.update_item_analytics': {'queue': 'analytics'},
    'app.tasks.process_blockchain_transaction': {'queue': 'blockchain'},
}

# Periodic tasks - ИСПРАВЛЕНО: убраны несуществующие таски
celery_app.conf.beat_schedule = {
    'cleanup-expired-tokens': {
        'task': 'app.tasks.cleanup_expired_tokens',
        'schedule': 3600.0,  # Run every hour
    },
    'update-item-analytics': {
        'task': 'app.tasks.update_item_analytics',
        'schedule': 1800.0,  # Run every 30 minutes
    },
}

# Настройки для разработки
if settings.DEBUG:
    celery_app.conf.update(
        task_always_eager=False,  # Выполнять задачи асинхронно даже в debug режиме
        task_eager_propagates=True,
    )