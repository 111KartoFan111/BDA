# backend/app/services/email.py - ИСПРАВЛЕНО

"""
Email service for sending emails.
ИСПРАВЛЕНО: Добавлена отладка и правильные импорты
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from jinja2 import Environment, FileSystemLoader
import os
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails."""
    
    def __init__(self):
        # Используем правильные настройки из .env
        self.smtp_server = getattr(settings, 'SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_username = getattr(settings, 'SMTP_USERNAME', None)
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
        self.smtp_tls = getattr(settings, 'SMTP_TLS', True)
        self.smtp_ssl = getattr(settings, 'SMTP_SSL', False)
        self.email_from = getattr(settings, 'EMAIL_FROM', self.smtp_username)
        self.email_from_name = getattr(settings, 'EMAIL_FROM_NAME', 'RentChain')
        
        # Логируем конфигурацию (без пароля)
        logger.info(f"Email config: server={self.smtp_server}, port={self.smtp_port}, from={self.email_from}")
        
        # Setup Jinja2 environment for email templates
        template_dir = os.path.join(os.path.dirname(__file__), "..", "templates", "emails")
        os.makedirs(template_dir, exist_ok=True)  # Создаем директорию если не существует
        
        try:
            self.jinja_env = Environment(loader=FileSystemLoader(template_dir))
        except Exception as e:
            logger.warning(f"Could not load email templates: {e}")
            self.jinja_env = None
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send email.
        
        Args:
            to_email: Recipient email
            subject: Email subject
            html_content: HTML content
            text_content: Optional text content
            
        Returns:
            True if sent successfully
        """
        try:
            logger.info(f"Attempting to send email to {to_email} with subject: {subject}")
            
            # Проверяем конфигурацию
            if not self.smtp_username or not self.smtp_password:
                logger.error("SMTP username or password not configured")
                return False
            
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.email_from_name} <{self.email_from}>"
            msg["To"] = to_email
            
            # Add text content
            if text_content:
                text_part = MIMEText(text_content, "plain")
                msg.attach(text_part)
            
            # Add HTML content
            html_part = MIMEText(html_content, "html")
            msg.attach(html_part)
            
            # Send email
            logger.info(f"Connecting to SMTP server {self.smtp_server}:{self.smtp_port}")
            
            if self.smtp_ssl:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                if self.smtp_tls:
                    logger.info("Starting TLS")
                    server.starttls()
            
            if self.smtp_username and self.smtp_password:
                logger.info(f"Logging in with username: {self.smtp_username}")
                server.login(self.smtp_username, self.smtp_password)
            
            logger.info("Sending message")
            server.send_message(msg)
            server.quit()
            
            logger.info(f"✅ Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error sending email to {to_email}: {e}")
            print(f"Email error: {e}")  # Также выводим в консоль для отладки
            return False
    
    def _get_default_template(self, title: str, content: str) -> str:
        """Получить базовый HTML шаблон если Jinja2 не работает."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
                <h1 style="color: #333; text-align: center;">{settings.PROJECT_NAME}</h1>
                <div style="margin: 20px 0;">
                    {content}
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px; text-align: center;">
                    This email was sent by {settings.PROJECT_NAME}
                </p>
            </div>
        </body>
        </html>
        """
    
    def send_welcome_email(self, to_email: str, user_name: str) -> bool:
        """
        Send welcome email to new user.
        """
        try:
            if self.jinja_env:
                try:
                    template = self.jinja_env.get_template("welcome.html")
                    html_content = template.render(
                        user_name=user_name,
                        app_name=settings.PROJECT_NAME
                    )
                except:
                    # Fallback to default template
                    html_content = self._get_default_template(
                        f"Welcome to {settings.PROJECT_NAME}!",
                        f"<p>Hello {user_name}!</p><p>Welcome to {settings.PROJECT_NAME}. We're excited to have you on board!</p>"
                    )
            else:
                html_content = self._get_default_template(
                    f"Welcome to {settings.PROJECT_NAME}!",
                    f"<p>Hello {user_name}!</p><p>Welcome to {settings.PROJECT_NAME}. We're excited to have you on board!</p>"
                )
            
            return self.send_email(
                to_email=to_email,
                subject=f"Welcome to {settings.PROJECT_NAME}!",
                html_content=html_content
            )
        except Exception as e:
            logger.error(f"Error sending welcome email: {e}")
            return False
    
    def send_email_verification(self, to_email: str, token: str) -> bool:
        """
        Send email verification.
        """
        try:
            verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
            
            if self.jinja_env:
                try:
                    template = self.jinja_env.get_template("email_verification.html")
                    html_content = template.render(
                        verification_url=verification_url,
                        app_name=settings.PROJECT_NAME
                    )
                except:
                    # Fallback to default template
                    html_content = self._get_default_template(
                        "Verify your email address",
                        f"""
                        <p>Please verify your email address by clicking the link below:</p>
                        <p><a href="{verification_url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
                        <p>Or copy this link: {verification_url}</p>
                        """
                    )
            else:
                html_content = self._get_default_template(
                    "Verify your email address",
                    f"""
                    <p>Please verify your email address by clicking the link below:</p>
                    <p><a href="{verification_url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
                    <p>Or copy this link: {verification_url}</p>
                    """
                )
            
            return self.send_email(
                to_email=to_email,
                subject="Verify your email address",
                html_content=html_content
            )
        except Exception as e:
            logger.error(f"Error sending email verification: {e}")
            return False
    
    def send_password_reset_email(self, to_email: str, token: str) -> bool:
        """
        Send password reset email.
        """
        try:
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            
            if self.jinja_env:
                try:
                    template = self.jinja_env.get_template("password_reset.html")
                    html_content = template.render(
                        reset_url=reset_url,
                        app_name=settings.PROJECT_NAME
                    )
                except:
                    # Fallback to default template
                    html_content = self._get_default_template(
                        "Password Reset Request",
                        f"""
                        <p>You requested a password reset. Click the link below to reset your password:</p>
                        <p><a href="{reset_url}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
                        <p>Or copy this link: {reset_url}</p>
                        <p>If you didn't request this, please ignore this email.</p>
                        """
                    )
            else:
                html_content = self._get_default_template(
                    "Password Reset Request",
                    f"""
                    <p>You requested a password reset. Click the link below to reset your password:</p>
                    <p><a href="{reset_url}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
                    <p>Or copy this link: {reset_url}</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    """
                )
            
            return self.send_email(
                to_email=to_email,
                subject="Password Reset Request",
                html_content=html_content
            )
        except Exception as e:
            logger.error(f"Error sending password reset email: {e}")
            return False
    
    def send_contract_notification(
        self,
        to_email: str,
        user_name: str,
        contract_id: str,
        item_title: str,
        notification_type: str
    ) -> bool:
        """
        Send contract notification email.
        """
        try:
            contract_url = f"{settings.FRONTEND_URL}/contracts/{contract_id}"
            
            subjects = {
                "created": "New Rental Request",
                "signed": "Contract Signed",
                "activated": "Rental Contract Activated",
                "completed": "Rental Completed",
                "cancelled": "Contract Cancelled",
                "disputed": "Dispute Created"
            }
            
            subject = subjects.get(notification_type, "Contract Update")
            
            html_content = self._get_default_template(
                subject,
                f"""
                <p>Hello {user_name},</p>
                <p>Your rental contract for <strong>{item_title}</strong> has been {notification_type}.</p>
                <p><a href="{contract_url}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Contract</a></p>
                """
            )
            
            return self.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content
            )
        except Exception as e:
            logger.error(f"Error sending contract notification: {e}")
            return False