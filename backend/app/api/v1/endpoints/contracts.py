"""
Обновленные эндпоинты для работы с реальными смарт-контрактами.
Заменяет backend/app/api/v1/endpoints/contracts.py
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.utils.dependencies import get_current_user, get_current_admin_user
from app.services.contract import ContractService
from app.services.user import UserService
from app.services.blockchain import RealBlockchainService  # Используем новый сервис
from app.schemas.contract import (
    ContractCreate, ContractUpdate, Contract, ContractDetail,
    ContractMessageCreate, ContractMessage, DisputeCreate, DisputeUpdate,
    ContractSignature, ContractExtension, ContractStats
)
from app.schemas.common import Response, PaginatedResponse
from app.models.contract import ContractStatus
from app.models.user import User

router = APIRouter()


def get_contract_service(db: Session = Depends(get_db)) -> ContractService:
    """Get contract service dependency."""
    return ContractService(db)


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    """Get user service dependency."""
    return UserService(db)


def get_blockchain_service(db: Session = Depends(get_db)) -> RealBlockchainService:
    """Get blockchain service dependency."""
    return RealBlockchainService(db)


@router.post("", response_model=Response[Contract])
async def create_contract(
    contract_data: ContractCreate,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service),
    user_service: UserService = Depends(get_user_service)
) -> Any:
    """
    Create new rental contract.
    ИСПРАВЛЕНО: Упрощена логика обработки
    """
    try:
        # Создаем контракт через сервис
        contract_dict = contract_service.create_contract(contract_data, current_user.id)
        
        return Response(
            data=contract_dict,
            message="Contract created successfully. After signing by both parties, it can be deployed to blockchain."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating contract: {str(e)}"
        )

@router.post("/{contract_id}/deploy-to-blockchain", response_model=Response[dict])
async def deploy_contract_to_blockchain(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    blockchain_service: RealBlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    НОВЫЙ: Деплой подписанного контракта в блокчейн.
    """
    try:
        result = blockchain_service.deploy_rental_contract(contract_id, current_user.id)
        
        return Response(
            data=result,
            message=f"Contract successfully deployed to blockchain at {result.get('contract_address')}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{contract_id}/pay-deposit", response_model=Response[dict])
async def pay_contract_deposit(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service),
    blockchain_service: RealBlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    НОВЫЙ: Оплатить депозит по смарт-контракту.
    """
    try:
        # Получаем контракт из БД
        contract = contract_service.get_contract_by_id(contract_id, current_user.id)
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )
        
        if not contract.contract_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contract not deployed to blockchain yet"
            )
        
        # Оплачиваем депозит через блокчейн
        result = blockchain_service.pay_deposit(contract.contract_address, current_user.id)
        
        return Response(
            data=result,
            message="Deposit paid successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{contract_id}/complete", response_model=Response[dict])
async def complete_contract_blockchain(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service),
    blockchain_service: RealBlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    ОБНОВЛЕНО: Завершить контракт через блокчейн.
    """
    try:
        # Получаем контракт из БД
        contract = contract_service.get_contract_by_id(contract_id, current_user.id)
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )
        
        if contract.contract_address:
            # Завершаем через блокчейн
            result = blockchain_service.complete_rental(contract.contract_address, current_user.id)
            
            return Response(
                data=result,
                message="Contract completed successfully via blockchain"
            )
        else:
            # Обычное завершение (без блокчейна)
            updated_contract = contract_service.complete_contract(contract_id, current_user.id)
            
            return Response(
                data={"status": "completed"},
                message="Contract completed successfully"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{contract_id}/cancel", response_model=Response[dict])
async def cancel_contract_blockchain(
    contract_id: uuid.UUID,
    reason: str = Body("", embed=True),
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service),
    blockchain_service: RealBlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    ОБНОВЛЕНО: Отменить контракт через блокчейн.
    """
    try:
        # Получаем контракт из БД
        contract = contract_service.get_contract_by_id(contract_id, current_user.id)
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )
        
        if contract.contract_address:
            # Отменяем через блокчейн
            result = blockchain_service.cancel_rental(contract.contract_address, current_user.id, reason)
            
            return Response(
                data=result,
                message="Contract cancelled successfully via blockchain"
            )
        else:
            # Обычная отмена (без блокчейна)
            updated_contract = contract_service.cancel_contract(contract_id, current_user.id, reason)
            
            return Response(
                data={"status": "cancelled", "reason": reason},
                message="Contract cancelled successfully"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{contract_id}/blockchain-status", response_model=Response[dict])
async def get_contract_blockchain_status(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service),
    blockchain_service: RealBlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    НОВЫЙ: Получить статус контракта в блокчейне.
    """
    try:
        # Получаем контракт из БД
        contract = contract_service.get_contract_by_id(contract_id, current_user.id)
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )
        
        if not contract.contract_address:
            return Response(
                data={"deployed": False, "message": "Contract not deployed to blockchain"},
                message="Contract exists only in database"
            )
        
        # Получаем статус из блокчейна
        blockchain_status = blockchain_service.get_contract_status(contract.contract_address)
        
        # Синхронизируем статусы
        blockchain_service.sync_contract_status(contract_id)
        
        return Response(
            data={
                "deployed": True,
                "blockchain_status": blockchain_status,
                "contract_address": contract.contract_address,
                "transaction_hash": contract.transaction_hash
            },
            message="Blockchain status retrieved successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{contract_id}/sync-blockchain", response_model=Response[dict])
async def sync_contract_with_blockchain(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service),
    blockchain_service: RealBlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    НОВЫЙ: Синхронизировать статус контракта с блокчейном.
    """
    try:
        # Проверяем доступ к контракту
        contract = contract_service.get_contract_by_id(contract_id, current_user.id)
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )
        
        if not contract.contract_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contract not deployed to blockchain"
            )
        
        # Синхронизируем
        success = blockchain_service.sync_contract_status(contract_id)
        
        if success:
            return Response(
                data={"synced": True},
                message="Contract status synchronized with blockchain"
            )
        else:
            return Response(
                data={"synced": False},
                message="Failed to synchronize with blockchain"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Оставляем все остальные существующие эндпоинты без изменений
@router.get("", response_model=PaginatedResponse[Contract])
async def get_user_contracts(
    status: Optional[ContractStatus] = Query(None, description="Filter by status"),
    contract_type: Optional[str] = Query(None, description="owner/tenant/all"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Get user's contracts with filtering.
    """
    result = contract_service.get_user_contracts(
        current_user.id, status, contract_type, page, size
    )
    return result


@router.get("/stats", response_model=Response[ContractStats])
async def get_contracts_stats(
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Get user's contract statistics.
    """
    stats = contract_service.get_contract_stats(current_user.id)
    return Response(data=stats)


@router.get("/{contract_id}", response_model=Response[ContractDetail])
async def get_contract(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Get contract by ID with full details.
    """
    contract = contract_service.get_contract_by_id(contract_id, current_user.id)
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )
    
    return Response(data=contract)


@router.patch("/{contract_id}", response_model=Response[Contract])
async def update_contract(
    contract_id: uuid.UUID,
    contract_data: ContractUpdate,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Update contract (limited fields).
    """
    contract = contract_service.update_contract(contract_id, contract_data, current_user.id)
    return Response(
        data=contract,
        message="Contract updated successfully"
    )


@router.post("/{contract_id}/sign", response_model=Response[Contract])
async def sign_contract(
    contract_id: uuid.UUID,
    signature_data: ContractSignature,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Sign contract with digital signature.
    """
    contract = contract_service.sign_contract(
        contract_id, current_user.id, signature_data.signature
    )
    
    message = "Contract signed successfully"
    if contract.tenant_signature and contract.owner_signature:
        message += ". Contract is now ready for blockchain deployment!"
    
    return Response(
        data=contract,
        message=message
    )


@router.post("/{contract_id}/extend", response_model=Response[Contract])
async def extend_contract(
    contract_id: uuid.UUID,
    extension_data: ContractExtension,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Extend contract duration.
    """
    contract = contract_service.extend_contract(
        contract_id, 
        extension_data.new_end_date,
        extension_data.additional_price,
        current_user.id
    )
    return Response(
        data=contract,
        message="Contract extended successfully"
    )


@router.get("/{contract_id}/messages", response_model=PaginatedResponse[ContractMessage])
async def get_contract_messages(
    contract_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Get contract messages.
    """
    result = contract_service.get_contract_messages(contract_id, current_user.id, page, size)
    return result


@router.post("/{contract_id}/messages", response_model=Response[ContractMessage])
async def add_contract_message(
    contract_id: uuid.UUID,
    message_data: ContractMessageCreate,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Add message to contract chat.
    """
    message = contract_service.add_contract_message(
        contract_id, message_data, current_user.id
    )
    return Response(
        data=message,
        message="Message added successfully"
    )


@router.get("/{contract_id}/history", response_model=Response[List[dict]])
async def get_contract_history(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Get contract history.
    """
    history = contract_service.get_contract_history(contract_id, current_user.id)
    return Response(data=history)


@router.post("/{contract_id}/dispute", response_model=Response[dict])
async def create_dispute(
    contract_id: uuid.UUID,
    dispute_data: DisputeCreate,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Create dispute for contract.
    """
    dispute = contract_service.create_dispute(contract_id, dispute_data, current_user.id)
    return Response(
        data=dispute,
        message="Dispute created successfully"
    )


# Admin endpoints
@router.get("/admin/all", response_model=PaginatedResponse[Contract])
async def get_all_contracts_admin(
    status: Optional[ContractStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_admin_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Get all contracts (admin only).
    """
    result = contract_service.get_all_contracts(status, page, size)
    return result


@router.get("/admin/stats", response_model=Response[ContractStats])
async def get_all_contracts_stats(
    current_user: User = Depends(get_current_admin_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Get global contract statistics (admin only).
    """
    stats = contract_service.get_contract_stats()
    return Response(data=stats)