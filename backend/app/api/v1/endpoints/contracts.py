"""
Contracts endpoints.
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.utils.dependencies import get_current_user, get_current_admin_user
from app.services.contract import ContractService
from app.services.user import UserService
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



def get_contract_service(db: Session = Depends(get_db)) -> ContractService:
    """Get contract service dependency."""
    return ContractService(db)

def get_user_service(db: Session = Depends(get_db)) -> UserService:
    """Get user service dependency."""
    return UserService(db)


@router.post("", response_model=Response[Contract])
async def create_contract(
    contract_data: ContractCreate,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service),
    user_service: UserService = Depends(get_user_service)
) -> Any:
    """
    Create new rental contract.
    ИСПРАВЛЕНО: Поддержка создания по email арендатора
    """
    try:
        # Если указан tenant_email, находим пользователя
        tenant_id = None
        if hasattr(contract_data, 'tenant_email') and contract_data.tenant_email:
            tenant_user = user_service.get_user_by_email(contract_data.tenant_email)
            if not tenant_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Пользователь с email {contract_data.tenant_email} не найден"
                )
            tenant_id = tenant_user.id
        elif hasattr(contract_data, 'tenant_id') and contract_data.tenant_id:
            tenant_id = contract_data.tenant_id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Необходимо указать tenant_id или tenant_email"
            )

        # Создаем объект с правильными данными
        create_data = ContractCreate(
            item_id=contract_data.item_id,
            tenant_id=tenant_id,
            start_date=contract_data.start_date,
            end_date=contract_data.end_date,
            total_price=contract_data.total_price,
            deposit=contract_data.deposit or 0,
            terms=contract_data.terms or "",
            special_conditions=contract_data.special_conditions or ""
        )

        contract = contract_service.create_contract(create_data, current_user.id)
        
        return Response(
            data=contract,
            message="Contract created successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка создания контракта: {str(e)}"
        )

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
    return Response(
        data=contract,
        message="Contract signed successfully"
    )


@router.post("/{contract_id}/activate", response_model=Response[Contract])
async def activate_contract(
    contract_id: uuid.UUID,
    contract_address: str,
    transaction_hash: str,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Activate contract after blockchain deployment.
    """
    contract = contract_service.activate_contract(
        contract_id, contract_address, transaction_hash
    )
    return Response(
        data=contract,
        message="Contract activated successfully"
    )


@router.post("/{contract_id}/complete", response_model=Response[Contract])
async def complete_contract(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Complete rental contract.
    """
    contract = contract_service.complete_contract(contract_id, current_user.id)
    return Response(
        data=contract,
        message="Contract completed successfully"
    )


@router.post("/{contract_id}/cancel", response_model=Response[Contract])
async def cancel_contract(
    contract_id: uuid.UUID,
    reason: str = "",
    current_user: User = Depends(get_current_user),
    contract_service: ContractService = Depends(get_contract_service)
) -> Any:
    """
    Cancel rental contract.
    """
    contract = contract_service.cancel_contract(contract_id, current_user.id, reason)
    return Response(
        data=contract,
        message="Contract cancelled successfully"
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