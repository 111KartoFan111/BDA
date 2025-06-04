# backend/test_email.py - Скрипт для тестирования отправки email

"""
Скрипт для тестирования отправки email.
Запускать из корня backend: python test_email.py
"""

import sys
import os

# Добавляем путь к приложению
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.email import EmailService
from app.core.config import settings
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_email_service():
    """Тестирование EmailService."""
    
    print("🧪 Тестирование Email Service")
    print("=" * 50)
    
    # Проверяем конфигурацию
    print(f"SMTP Server: {settings.SMTP_SERVER}")
    print(f"SMTP Port: {settings.SMTP_PORT}")
    print(f"SMTP Username: {settings.SMTP_USERNAME}")
    print(f"Email From: {settings.EMAIL_FROM}")
    print(f"TLS: {settings.SMTP_TLS}")
    print("-" * 50)
    
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        print("❌ SMTP credentials not configured in .env file")
        print("Please set SMTP_USERNAME and SMTP_PASSWORD")
        return False
    
    # Создаем сервис
    email_service = EmailService()
    
    # Тестовый email
    test_email = input("Enter test email address: ").strip()
    if not test_email:
        test_email = settings.SMTP_USERNAME  # Используем собственный email для теста
    
    print(f"Sending test email to: {test_email}")
    
    # Тест 1: Простой email
    print("\n📧 Test 1: Simple email")
    result1 = email_service.send_email(
        to_email=test_email,
        subject="RentChain Test Email",
        html_content="<h1>Hello!</h1><p>This is a test email from RentChain.</p>",
        text_content="Hello! This is a test email from RentChain."
    )
    print(f"Result: {'✅ SUCCESS' if result1 else '❌ FAILED'}")
    
    # Тест 2: Welcome email
    print("\n👋 Test 2: Welcome email")
    result2 = email_service.send_welcome_email(
        to_email=test_email,
        user_name="Test User"
    )
    print(f"Result: {'✅ SUCCESS' if result2 else '❌ FAILED'}")
    
    # Тест 3: Password reset email
    print("\n🔐 Test 3: Password reset email")
    test_token = "test_token_12345"
    result3 = email_service.send_password_reset_email(
        to_email=test_email,
        token=test_token
    )
    print(f"Result: {'✅ SUCCESS' if result3 else '❌ FAILED'}")
    
    # Тест 4: Email verification
    print("\n✉️ Test 4: Email verification")
    result4 = email_service.send_email_verification(
        to_email=test_email,
        token=test_token
    )
    print(f"Result: {'✅ SUCCESS' if result4 else '❌ FAILED'}")
    
    # Общий результат
    print("\n" + "=" * 50)
    total_success = sum([result1, result2, result3, result4])
    print(f"Total tests passed: {total_success}/4")
    
    if total_success == 4:
        print("🎉 All email tests passed!")
        return True
    else:
        print(f"⚠️ {4 - total_success} tests failed. Check your SMTP configuration.")
        return False

def test_celery_tasks():
    """Тестирование Celery tasks."""
    
    print("\n🔄 Тестирование Celery Tasks")
    print("=" * 50)
    
    try:
        from app.tasks import (
            send_email_task, 
            send_password_reset_email_task,
            send_email_verification_task,
            send_welcome_email_task
        )
        
        test_email = input("Enter test email for Celery tasks: ").strip()
        if not test_email:
            test_email = settings.SMTP_USERNAME
        
        print(f"Queueing Celery tasks for: {test_email}")
        
        # Тест Celery task
        print("\n📨 Testing Celery email task")
        task = send_email_task.delay(
            to_email=test_email,
            subject="Celery Test Email",
            html_content="<h1>Celery Test</h1><p>This email was sent via Celery task queue.</p>"
        )
        
        print(f"Task ID: {task.id}")
        print("Task queued successfully!")
        
        # Проверяем статус задачи
        print("Waiting for task result...")
        try:
            result = task.get(timeout=30)  # Ждем 30 секунд
            print(f"Task result: {result}")
            if result.get('success'):
                print("✅ Celery email task completed successfully!")
            else:
                print(f"❌ Celery email task failed: {result.get('error')}")
        except Exception as e:
            print(f"⚠️ Could not get task result: {e}")
            print("This might mean Celery worker is not running.")
        
    except ImportError as e:
        print(f"❌ Could not import Celery tasks: {e}")
        return False
    except Exception as e:
        print(f"❌ Error testing Celery: {e}")
        return False
    
    return True

def main():
    """Главная функция тестирования."""
    
    print("🚀 RentChain Email Testing Script")
    print("=" * 50)
    
    # Проверяем настройки
    if not settings.SECRET_KEY:
        print("❌ Settings not loaded properly")
        return
    
    # Тестируем email service
    email_success = test_email_service()
    
    # Тестируем Celery (опционально)
    test_celery = input("\nTest Celery tasks? (y/n): ").strip().lower()
    if test_celery in ['y', 'yes']:
        test_celery_tasks()
    
    print("\n" + "=" * 50)
    print("📋 Testing completed!")
    
    if not email_success:
        print("\n💡 Troubleshooting tips:")
        print("1. Check your .env file has correct SMTP settings")
        print("2. Make sure SMTP_PASSWORD is an app password (for Gmail)")
        print("3. Enable 2FA and create app password for Gmail")
        print("4. Check if your firewall blocks SMTP connections")

if __name__ == "__main__":
    main()