# backend/app/api/v1/endpoints/wallet.py
"""
Новый эндпоинт для работы с кошельками пользователей
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import uuid

from app.core.database import get_db
from app.utils.dependencies import get_current_user
from app.services.wallet import WalletService
from app.schemas.common import Response
from app.models.user import User

router = APIRouter()


class WalletUpdateRequest(BaseModel):
    """Запрос на обновление адреса кошелька."""
    wallet_address: str = Field(..., pattern=r"^0x[a-fA-F0-9]{40}$", description="Ethereum адрес кошелька")


class WalletResponse(BaseModel):
    """Ответ с информацией о кошельке."""
    wallet_address: str
    updated_at: str
    user_id: str


def get_wallet_service(db: Session = Depends(get_db)) -> WalletService:
    """Get wallet service dependency."""
    return WalletService(db)


@router.patch("/connect", response_model=Response[WalletResponse])
async def connect_wallet(
    wallet_data: WalletUpdateRequest,
    current_user: User = Depends(get_current_user),
    wallet_service: WalletService = Depends(get_wallet_service)
) -> Any:
    """
    Подключить кошелек к аккаунту пользователя.
    
    Args:
        wallet_data: Данные кошелька
        current_user: Текущий пользователь
        wallet_service: Сервис для работы с кошельками
        
    Returns:
        Response с информацией об обновленном кошельке
    """
    try:
        result = wallet_service.connect_wallet(
            user_id=current_user.id,
            wallet_address=wallet_data.wallet_address
        )
        
        return Response(
            data=result,
            message="Кошелек успешно подключен"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка подключения кошелька: {str(e)}"
        )


@router.delete("/disconnect", response_model=Response[None])
async def disconnect_wallet(
    current_user: User = Depends(get_current_user),
    wallet_service: WalletService = Depends(get_wallet_service)
) -> Any:
    """
    Отключить кошелек от аккаунта пользователя.
    
    Args:
        current_user: Текущий пользователь
        wallet_service: Сервис для работы с кошельками
        
    Returns:
        Response с подтверждением отключения
    """
    try:
        wallet_service.disconnect_wallet(current_user.id)
        
        return Response(
            message="Кошелек успешно отключен"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка отключения кошелька: {str(e)}"
        )


@router.get("/info", response_model=Response[WalletResponse])
async def get_wallet_info(
    current_user: User = Depends(get_current_user),
    wallet_service: WalletService = Depends(get_wallet_service)
) -> Any:
    """
    Получить информацию о подключенном кошельке.
    
    Args:
        current_user: Текущий пользователь
        wallet_service: Сервис для работы с кошельками
        
    Returns:
        Response с информацией о кошельке
    """
    try:
        wallet_info = wallet_service.get_wallet_info(current_user.id)
        
        if not wallet_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кошелек не подключен"
            )
        
        return Response(
            data=wallet_info,
            message="Информация о кошельке получена"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения информации о кошельке: {str(e)}"
        )


@router.post("/verify", response_model=Response[dict])
async def verify_wallet_ownership(
    signature: str,
    current_user: User = Depends(get_current_user),
    wallet_service: WalletService = Depends(get_wallet_service)
) -> Any:
    """
    Верифицировать владение кошельком через подпись.
    
    Args:
        signature: Подпись сообщения
        current_user: Текущий пользователь
        wallet_service: Сервис для работы с кошельками
        
    Returns:
        Response с результатом верификации
    """
    try:
        is_verified = wallet_service.verify_wallet_ownership(
            user_id=current_user.id,
            signature=signature
        )
        
        return Response(
            data={
                "verified": is_verified,
                "wallet_address": current_user.wallet_address
            },
            message="Верификация кошелька завершена"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка верификации кошелька: {str(e)}"
        )