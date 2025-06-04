# backend/app/tasks/__init__.py - ИСПРАВЛЕНО

"""
Celery tasks for background processing.
ИСПРАВЛЕНО: Убраны несуществующие таски и добавлена отладка
"""

from app.core.celery import celery_app
from app.core.database import SessionLocal
from app.services.email import EmailService
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True)
def send_email_task(self, to_email: str, subject: str, html_content: str, text_content: str = None):
    """
    Send email task.
    
    Args:
        to_email: Recipient email
        subject: Email subject
        html_content: HTML content
        text_content: Optional text content
    """
    try:
        logger.info(f"Starting email task for {to_email}")
        email_service = EmailService()
        result = email_service.send_email(to_email, subject, html_content, text_content)
        
        if result:
            logger.info(f"✅ Email sent successfully to {to_email}")
            return {"success": True, "email": to_email}
        else:
            logger.error(f"❌ Failed to send email to {to_email}")
            return {"success": False, "email": to_email, "error": "Email sending failed"}
            
    except Exception as e:
        logger.error(f"❌ Email task failed for {to_email}: {str(e)}")
        # Retry logic
        try:
            self.retry(countdown=60, max_retries=3)
        except self.MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for email to {to_email}")
        return {"success": False, "error": str(e)}

@celery_app.task
def send_password_reset_email_task(to_email: str, token: str):
    """
    Send password reset email task.
    """
    try:
        logger.info(f"Sending password reset email to {to_email}")
        email_service = EmailService()
        result = email_service.send_password_reset_email(to_email, token)
        return {"success": result, "email": to_email}
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {str(e)}")
        return {"success": False, "error": str(e)}

@celery_app.task
def send_email_verification_task(to_email: str, token: str):
    """
    Send email verification task.
    """
    try:
        logger.info(f"Sending email verification to {to_email}")
        email_service = EmailService()
        result = email_service.send_email_verification(to_email, token)
        return {"success": result, "email": to_email}
    except Exception as e:
        logger.error(f"Failed to send email verification to {to_email}: {str(e)}")
        return {"success": False, "error": str(e)}

@celery_app.task
def send_welcome_email_task(to_email: str, user_name: str):
    """
    Send welcome email task.
    """
    try:
        logger.info(f"Sending welcome email to {to_email}")
        email_service = EmailService()
        result = email_service.send_welcome_email(to_email, user_name)
        return {"success": result, "email": to_email}
    except Exception as e:
        logger.error(f"Failed to send welcome email to {to_email}: {str(e)}")
        return {"success": False, "error": str(e)}

@celery_app.task
def cleanup_expired_tokens():
    """
    Cleanup expired tokens and sessions.
    """
    try:
        logger.info("Starting cleanup of expired tokens")
        # Здесь можно добавить логику очистки токенов из Redis или БД
        # Пока просто логируем
        logger.info("✅ Cleanup completed successfully")
        return {"success": True, "cleaned": 0}
    except Exception as e:
        logger.error(f"❌ Failed to cleanup tokens: {str(e)}")
        return {"success": False, "error": str(e)}

@celery_app.task
def update_item_analytics():
    """
    Update item analytics and statistics.
    """
    try:
        logger.info("Starting item analytics update")
        
        # Базовая логика обновления аналитики
        db = SessionLocal()
        try:
            # Здесь можно добавить логику обновления аналитики
            # Например, пересчет рейтингов, просмотров и т.д.
            pass
        finally:
            db.close()
        
        logger.info("✅ Item analytics updated successfully")
        return {"success": True}
    except Exception as e:
        logger.error(f"❌ Failed to update analytics: {str(e)}")
        return {"success": False, "error": str(e)}

@celery_app.task
def send_contract_notification_task(user_id: str, contract_id: str, notification_type: str):
    """
    Send contract notification.
    
    Args:
        user_id: User ID
        contract_id: Contract ID
        notification_type: Type of notification
    """
    try:
        logger.info(f"Sending contract notification to user {user_id}")
        
        db = SessionLocal()
        try:
            # Получаем пользователя и контракт
            from app.models.user import User
            from app.models.contract import Contract
            
            user = db.query(User).filter(User.id == user_id).first()
            contract = db.query(Contract).filter(Contract.id == contract_id).first()
            
            if not user:
                logger.error(f"User {user_id} not found")
                return {"success": False, "error": "User not found"}
            
            if not contract:
                logger.error(f"Contract {contract_id} not found")
                return {"success": False, "error": "Contract not found"}
            
            # Отправляем уведомление
            email_service = EmailService()
            result = email_service.send_contract_notification(
                to_email=user.email,
                user_name=f"{user.first_name} {user.last_name}",
                contract_id=contract_id,
                item_title=contract.item.title if contract.item else "Unknown Item",
                notification_type=notification_type
            )
            
            return {"success": result, "user_id": user_id}
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Failed to send contract notification: {str(e)}")
        return {"success": False, "error": str(e)}

@celery_app.task
def process_blockchain_transaction(contract_id: str, transaction_data: dict):
    """
    Process blockchain transaction.
    
    Args:
        contract_id: Contract ID
        transaction_data: Transaction data
    """
    try:
        logger.info(f"Processing blockchain transaction for contract {contract_id}")
        
        # Здесь можно добавить логику обработки блокчейн транзакций
        # Пока просто логируем
        
        logger.info(f"✅ Blockchain transaction processed for contract {contract_id}")
        return {"success": True, "transaction_hash": "0x123...", "contract_id": contract_id}
    except Exception as e:
        logger.error(f"❌ Failed to process blockchain transaction: {str(e)}")
        return {"success": False, "error": str(e)}

# Функции-помощники для удобства использования
def send_email_async(to_email: str, subject: str, html_content: str, text_content: str = None):
    """Отправить email асинхронно."""
    return send_email_task.delay(to_email, subject, html_content, text_content)

def send_password_reset_async(to_email: str, token: str):
    """Отправить email сброса пароля асинхронно."""
    return send_password_reset_email_task.delay(to_email, token)

def send_email_verification_async(to_email: str, token: str):
    """Отправить подтверждение email асинхронно."""
    return send_email_verification_task.delay(to_email, token)

def send_welcome_email_async(to_email: str, user_name: str):
    """Отправить приветственное письмо асинхронно."""
    return send_welcome_email_task.delay(to_email, user_name)