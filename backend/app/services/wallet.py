# backend/app/services/wallet.py
"""
Сервис для работы с кошельками пользователей
"""

from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import logging
import re

from app.models.user import User
from app.utils.exceptions import BadRequestError, NotFoundError

logger = logging.getLogger(__name__)


class WalletService:
    """Сервис для работы с кошельками пользователей."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def connect_wallet(self, user_id: uuid.UUID, wallet_address: str) -> Dict[str, Any]:
        """
        Подключить кошелек к пользователю.
        
        Args:
            user_id: ID пользователя
            wallet_address: Адрес кошелька
            
        Returns:
            Информация об обновленном кошельке
            
        Raises:
            BadRequestError: Если адрес кошелька некорректен или уже используется
            NotFoundError: Если пользователь не найден
        """
        # Валидация адреса кошелька
        if not self._is_valid_ethereum_address(wallet_address):
            raise BadRequestError("Некорректный адрес Ethereum кошелька")
        
        # Нормализация адреса (приведение к checksum формату)
        normalized_address = self._normalize_address(wallet_address)
        
        # Поиск пользователя
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User", str(user_id))
        
        # Проверка, что адрес не используется другим пользователем
        existing_user = self.db.query(User).filter(
            User.wallet_address == normalized_address,
            User.id != user_id
        ).first()
        
        if existing_user:
            raise BadRequestError("Этот адрес кошелька уже используется другим пользователем")
        
        # Обновляем адрес кошелька
        old_address = user.wallet_address
        user.wallet_address = normalized_address
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(user)
        
        # Логируем изменение
        logger.info(
            f"Wallet connected for user {user_id}: "
            f"old={old_address}, new={normalized_address}"
        )
        
        # Создаем запись в истории (если есть соответствующая модель)
        self._log_wallet_activity(
            user_id=user_id,
            action="connect",
            wallet_address=normalized_address,
            old_address=old_address
        )
        
        return {
            "wallet_address": normalized_address,
            "updated_at": user.updated_at.isoformat(),
            "user_id": str(user_id)
        }
    
    def disconnect_wallet(self, user_id: uuid.UUID) -> bool:
        """
        Отключить кошелек от пользователя.
        
        Args:
            user_id: ID пользователя
            
        Returns:
            True если кошелек успешно отключен
            
        Raises:
            NotFoundError: Если пользователь не найден
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User", str(user_id))
        
        old_address = user.wallet_address
        
        if not old_address:
            logger.info(f"No wallet to disconnect for user {user_id}")
            return True
        
        # Удаляем адрес кошелька
        user.wallet_address = None
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        # Логируем изменение
        logger.info(f"Wallet disconnected for user {user_id}: {old_address}")
        
        # Создаем запись в истории
        self._log_wallet_activity(
            user_id=user_id,
            action="disconnect",
            old_address=old_address
        )
        
        return True
    
    def get_wallet_info(self, user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """
        Получить информацию о кошельке пользователя.
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Информация о кошельке или None если кошелек не подключен
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.wallet_address:
            return None
        
        return {
            "wallet_address": user.wallet_address,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            "user_id": str(user_id)
        }
    
    def verify_wallet_ownership(self, user_id: uuid.UUID, signature: str) -> bool:
        """
        Верифицировать владение кошельком через подпись.
        
        Args:
            user_id: ID пользователя
            signature: Подпись сообщения
            
        Returns:
            True если подпись верна
            
        Note:
            В реальном приложении здесь должна быть проверка подписи
            с помощью web3 или аналогичной библиотеки
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.wallet_address:
            return False
        
        # TODO: Реализовать реальную проверку подписи
        # Для примера возвращаем True если подпись не пустая
        is_valid = bool(signature and len(signature) > 10)
        
        # Логируем попытку верификации
        logger.info(
            f"Wallet verification for user {user_id}: "
            f"address={user.wallet_address}, valid={is_valid}"
        )
        
        if is_valid:
            self._log_wallet_activity(
                user_id=user_id,
                action="verify",
                wallet_address=user.wallet_address
            )
        
        return is_valid
    
    def get_user_by_wallet(self, wallet_address: str) -> Optional[User]:
        """
        Найти пользователя по адресу кошелька.
        
        Args:
            wallet_address: Адрес кошелька
            
        Returns:
            Пользователь или None если не найден
        """
        if not self._is_valid_ethereum_address(wallet_address):
            return None
        
        normalized_address = self._normalize_address(wallet_address)
        
        return self.db.query(User).filter(
            User.wallet_address == normalized_address
        ).first()
    
    def update_wallet_address(self, user_id: uuid.UUID, new_address: str) -> Dict[str, Any]:
        """
        Обновить адрес кошелька пользователя.
        
        Args:
            user_id: ID пользователя
            new_address: Новый адрес кошелька
            
        Returns:
            Информация об обновленном кошельке
        """
        return self.connect_wallet(user_id, new_address)
    
    def _is_valid_ethereum_address(self, address: str) -> bool:
        """
        Проверить валидность Ethereum адреса.
        
        Args:
            address: Адрес для проверки
            
        Returns:
            True если адрес валиден
        """
        if not address:
            return False
        
        # Проверка формата: начинается с 0x и содержит 40 hex символов
        pattern = r'^0x[a-fA-F0-9]{40}$'
        return bool(re.match(pattern, address))
    
    def _normalize_address(self, address: str) -> str:
        """
        Нормализовать адрес Ethereum (привести к нижнему регистру).
        
        Args:
            address: Исходный адрес
            
        Returns:
            Нормализованный адрес
        """
        if not address:
            return address
        
        # Приводим к нижнему регистру для единообразия
        normalized = address.lower()
        
        # В реальном приложении можно использовать web3.py для checksum
        # from web3 import Web3
        # return Web3.toChecksumAddress(address)
        
        return normalized
    
    def _log_wallet_activity(
        self, 
        user_id: uuid.UUID, 
        action: str,
        wallet_address: Optional[str] = None,
        old_address: Optional[str] = None
    ) -> None:
        """
        Логировать активность с кошельком.
        
        Args:
            user_id: ID пользователя
            action: Действие (connect, disconnect, verify)
            wallet_address: Адрес кошелька
            old_address: Предыдущий адрес кошелька
        """
        # В реальном приложении здесь можно создавать записи в таблице audit_logs
        # или использовать другую систему логирования активности
        
        log_data = {
            "user_id": str(user_id),
            "action": action,
            "wallet_address": wallet_address,
            "old_address": old_address,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Wallet activity logged: {log_data}")
        
        # TODO: Сохранить в таблицу audit_logs если она существует
        # audit_log = AuditLog(
        #     user_id=user_id,
        #     action=f"wallet_{action}",
        #     resource_type="wallet",
        #     details=log_data
        # )
        # self.db.add(audit_log)
        # self.db.commit()
    
    def check_wallet_conflicts(self, wallet_address: str, exclude_user_id: Optional[uuid.UUID] = None) -> bool:
        """
        Проверить есть ли конфликты с адресом кошелька.
        
        Args:
            wallet_address: Адрес для проверки
            exclude_user_id: ID пользователя для исключения из проверки
            
        Returns:
            True если есть конфликт
        """
        if not self._is_valid_ethereum_address(wallet_address):
            return False
        
        normalized_address = self._normalize_address(wallet_address)
        
        query = self.db.query(User).filter(User.wallet_address == normalized_address)
        
        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)
        
        existing_user = query.first()
        return existing_user is not None
    
    def get_users_with_wallets(self, page: int = 1, size: int = 20) -> Dict[str, Any]:
        """
        Получить список пользователей с подключенными кошельками.
        
        Args:
            page: Номер страницы
            size: Размер страницы
            
        Returns:
            Пагинированный список пользователей с кошельками
        """
        offset = (page - 1) * size
        
        query = self.db.query(User).filter(User.wallet_address.isnot(None))
        
        total = query.count()
        users = query.offset(offset).limit(size).all()
        
        return {
            "users": [
                {
                    "id": str(user.id),
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "wallet_address": user.wallet_address,
                    "updated_at": user.updated_at.isoformat() if user.updated_at else None
                }
                for user in users
            ],
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size
        }