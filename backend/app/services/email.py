"""
Email service for sending emails.
"""

import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from typing import List, Optional
from jinja2 import Environment, FileSystemLoader
import os

from app.core.config import settings


class EmailService:
    """Service for sending emails."""
    
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_tls = settings.SMTP_TLS
        self.smtp_ssl = settings.SMTP_SSL
        self.email_from = settings.EMAIL_FROM
        self.email_from_name = settings.EMAIL_FROM_NAME
        
        # Setup Jinja2 environment for email templates
        template_dir = os.path.join(os.path.dirname(__file__), "..", "templates", "emails")
        self.jinja_env = Environment(loader=FileSystemLoader(template_dir))
    
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
            # Create message
            msg = MimeMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.email_from_name} <{self.email_from}>"
            msg["To"] = to_email
            
            # Add text content
            if text_content:
                text_part = MimeText(text_content, "plain")
                msg.attach(text_part)
            
            # Add HTML content
            html_part = MimeText(html_content, "html")
            msg.attach(html_part)
            
            # Send email
            if self.smtp_ssl:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                if self.smtp_tls:
                    server.starttls()
            
            if self.smtp_username and self.smtp_password:
                server.login(self.smtp_username, self.smtp_password)
            
            server.send_message(msg)
            server.quit()
            
            return True
            
        except Exception as e:
            print(f"Error sending email: {e}")
            return False
    
    def send_welcome_email(self, to_email: str, user_name: str) -> bool:
        """
        Send welcome email to new user.
        
        Args:
            to_email: User email
            user_name: User name
            
        Returns:
            True if sent successfully
        """
        try:
            template = self.jinja_env.get_template("welcome.html")
            html_content = template.render(
                user_name=user_name,
                app_name=settings.PROJECT_NAME
            )
            
            return self.send_email(
                to_email=to_email,
                subject=f"Welcome to {settings.PROJECT_NAME}!",
                html_content=html_content
            )
        except Exception as e:
            print(f"Error sending welcome email: {e}")
            return False
    
    def send_email_verification(self, to_email: str, token: str) -> bool:
        """
        Send email verification.
        
        Args:
            to_email: User email
            token: Verification token
            
        Returns:
            True if sent successfully
        """
        try:
            verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
            
            template = self.jinja_env.get_template("email_verification.html")
            html_content = template.render(
                verification_url=verification_url,
                app_name=settings.PROJECT_NAME
            )
            
            return self.send_email(
                to_email=to_email,
                subject="Verify your email address",
                html_content=html_content
            )
        except Exception as e:
            print(f"Error sending email verification: {e}")
            return False
    
    def send_password_reset_email(self, to_email: str, token: str) -> bool:
        """
        Send password reset email.
        
        Args:
            to_email: User email
            token: Reset token
            
        Returns:
            True if sent successfully
        """
        try:
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            
            template = self.jinja_env.get_template("password_reset.html")
            html_content = template.render(
                reset_url=reset_url,
                app_name=settings.PROJECT_NAME
            )
            
            return self.send_email(
                to_email=to_email,
                subject="Password Reset Request",
                html_content=html_content
            )
        except Exception as e:
            print(f"Error sending password reset email: {e}")
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
        
        Args:
            to_email: User email
            user_name: User name
            contract_id: Contract ID
            item_title: Item title
            notification_type: Notification type
            
        Returns:
            True if sent successfully
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
            
            template = self.jinja_env.get_template("contract_notification.html")
            html_content = template.render(
                user_name=user_name,
                item_title=item_title,
                contract_url=contract_url,
                notification_type=notification_type,
                app_name=settings.PROJECT_NAME
            )
            
            subject = subjects.get(notification_type, "Contract Update")
            
            return self.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content
            )
        except Exception as e:
            print(f"Error sending contract notification: {e}")
            return False