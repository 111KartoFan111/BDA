"""
API эндпоинты для работы с блокчейном.
"""

from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.utils.dependencies import get_current_user, get_current_admin_user
from app.services.blockchain import BlockchainService
from app.schemas.common import Response
from app.models.user import User
from pydantic import BaseModel, Field

router = APIRouter()


# Pydantic модели для запросов/ответов
class ContractDeployRequest(BaseModel):
    """Запрос на деплой контракта."""
    contract_id: uuid.UUID
    gas_limit: Optional[int] = None
    gas_price: Optional[str] = None


class TransactionRequest(BaseModel):
    """Запрос транзакции."""
    from_address: str
    to_address: str
    amount_eth: str = Field(..., description="Сумма в ETH")
    
    
class ContractFunctionRequest(BaseModel):
    """Запрос выполнения функции контракта."""
    contract_address: str
    function_name: str
    args: List[Any] = []
    value_eth: str = "0"


class WalletRequest(BaseModel):
    """Запрос работы с кошельком."""
    wallet_address: str


def get_blockchain_service(db: Session = Depends(get_db)) -> BlockchainService:
    """Get blockchain service dependency."""
    return BlockchainService(db)


@router.post("/deploy-contract", response_model=Response[Dict[str, Any]])
async def deploy_contract(
    deploy_request: ContractDeployRequest,
    current_user: User = Depends(get_current_user),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Деплой контракта аренды в блокчейн.
    """
    try:
        result = blockchain_service.deploy_rental_contract(
            deploy_request.contract_id,
            current_user.id
        )
        
        return Response(
            data=result,
            message="Contract deployed successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/contract/{contract_address}/status", response_model=Response[Dict[str, Any]])
async def get_contract_status(
    contract_address: str,
    current_user: User = Depends(get_current_user),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Получить статус смарт-контракта.
    """
    try:
        status_info = blockchain_service.get_contract_status(contract_address)
        
        return Response(
            data=status_info,
            message="Contract status retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/transaction/{tx_hash}/verify", response_model=Response[Dict[str, Any]])
async def verify_transaction(
    tx_hash: str,
    current_user: User = Depends(get_current_user),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Верификация транзакции в блокчейне.
    """
    try:
        verification_result = blockchain_service.verify_transaction(tx_hash)
        
        return Response(
            data=verification_result,
            message="Transaction verified successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/wallet/{wallet_address}/balance", response_model=Response[Dict[str, str]])
async def get_wallet_balance(
    wallet_address: str,
    current_user: User = Depends(get_current_user),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Получить баланс кошелька.
    """
    try:
        balance = blockchain_service.get_wallet_balance(wallet_address)
        
        return Response(
            data={
                "address": wallet_address,
                "balance": balance,
                "currency": "ETH"
            },
            message="Wallet balance retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/transaction/create", response_model=Response[Dict[str, Any]])
async def create_payment_transaction(
    transaction_request: TransactionRequest,
    current_user: User = Depends(get_current_user),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Создать транзакцию платежа.
    """
    try:
        transaction_data = blockchain_service.create_payment_transaction(
            transaction_request.from_address,
            transaction_request.to_address,
            transaction_request.amount_eth
        )
        
        return Response(
            data=transaction_data,
            message="Payment transaction created successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/wallet/{wallet_address}/history", response_model=Response[List[Dict[str, Any]]])
async def get_transaction_history(
    wallet_address: str,
    limit: int = Query(10, ge=1, le=100, description="Number of transactions"),
    current_user: User = Depends(get_current_user),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Получить историю транзакций кошелька.
    """
    try:
        history = blockchain_service.get_transaction_history(wallet_address, limit)
        
        return Response(
            data=history,
            message="Transaction history retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/gas/estimate", response_model=Response[Dict[str, Any]])
async def get_gas_estimates(
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Получить текущие оценки цены газа.
    """
    try:
        gas_estimates = blockchain_service.estimate_gas_price()
        
        return Response(
            data=gas_estimates,
            message="Gas estimates retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/network/info", response_model=Response[Dict[str, Any]])
async def get_network_info(
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Получить информацию о блокчейн сети.
    """
    try:
        network_info = blockchain_service.get_network_info()
        
        return Response(
            data=network_info,
            message="Network information retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/contract/validate", response_model=Response[Dict[str, Any]])
async def validate_contract(
    wallet_request: WalletRequest,
    current_user: User = Depends(get_current_user),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Валидация смарт-контракта.
    """
    try:
        validation_result = blockchain_service.validate_smart_contract(
            wallet_request.wallet_address
        )
        
        return Response(
            data=validation_result,
            message="Contract validation completed"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/contract/execute", response_model=Response[Dict[str, Any]])
async def execute_contract_function(
    function_request: ContractFunctionRequest,
    current_user: User = Depends(get_current_user),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Выполнить функцию смарт-контракта.
    """
    try:
        # Проверяем, что у пользователя есть адрес кошелька
        if not current_user.wallet_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User wallet address not found"
            )
        
        execution_result = blockchain_service.execute_contract_function(
            function_request.contract_address,
            function_request.function_name,
            function_request.args,
            current_user.wallet_address,
            function_request.value_eth
        )
        
        return Response(
            data=execution_result,
            message="Contract function execution prepared"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/contract/{contract_address}/events", response_model=Response[List[Dict[str, Any]]])
async def get_contract_events(
    contract_address: str,
    from_block: int = Query(0, description="Starting block number"),
    current_user: User = Depends(get_current_user),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Получить события смарт-контракта.
    """
    try:
        events = blockchain_service.monitor_contract_events(contract_address, from_block)
        
        return Response(
            data=events,
            message="Contract events retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Админские эндпоинты
@router.get("/admin/network/stats", response_model=Response[Dict[str, Any]])
async def get_network_stats(
    current_user: User = Depends(get_current_admin_user),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Получить статистику сети (только для админов).
    """
    try:
        network_info = blockchain_service.get_network_info()
        gas_estimates = blockchain_service.estimate_gas_price()
        
        stats = {
            "network": network_info,
            "gas": gas_estimates,
            "timestamp": "2024-01-15T10:30:00Z"
        }
        
        return Response(
            data=stats,
            message="Network statistics retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/admin/contracts/bulk-deploy", response_model=Response[Dict[str, Any]])
async def bulk_deploy_contracts(
    contract_ids: List[uuid.UUID] = Body(..., description="List of contract IDs to deploy"),
    current_user: User = Depends(get_current_admin_user),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Массовый деплой контрактов (только для админов).
    """
    try:
        results = {
            "deployed": [],
            "failed": [],
            "total": len(contract_ids)
        }
        
        for contract_id in contract_ids:
            try:
                result = blockchain_service.deploy_rental_contract(contract_id, current_user.id)
                results["deployed"].append({
                    "contract_id": contract_id,
                    "blockchain_address": result.get("contract_address"),
                    "transaction_hash": result.get("transaction_hash")
                })
            except Exception as e:
                results["failed"].append({
                    "contract_id": contract_id,
                    "error": str(e)
                })
        
        return Response(
            data=results,
            message=f"Bulk deployment completed. {len(results['deployed'])} deployed, {len(results['failed'])} failed."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Утилитарные эндпоинты
@router.get("/utils/address/validate", response_model=Response[Dict[str, bool]])
async def validate_ethereum_address(
    address: str = Query(..., description="Ethereum address to validate"),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Валидация Ethereum адреса.
    """
    try:
        from web3 import Web3
        is_valid = Web3.is_address(address)
        is_checksum = Web3.is_checksum_address(address) if is_valid else False
        
        return Response(
            data={
                "valid": is_valid,
                "checksum": is_checksum,
                "address": address
            },
            message="Address validation completed"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/utils/wei/convert", response_model=Response[Dict[str, str]])
async def convert_wei_to_eth(
    wei_amount: str = Query(..., description="Amount in wei"),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Конвертация wei в ETH.
    """
    try:
        from web3 import Web3
        eth_amount = Web3.from_wei(int(wei_amount), 'ether')
        
        return Response(
            data={
                "wei": wei_amount,
                "eth": str(eth_amount),
                "gwei": str(Web3.from_wei(int(wei_amount), 'gwei'))
            },
            message="Conversion completed successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/utils/eth/convert", response_model=Response[Dict[str, str]])
async def convert_eth_to_wei(
    eth_amount: str = Query(..., description="Amount in ETH"),
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Конвертация ETH в wei.
    """
    try:
        from web3 import Web3
        wei_amount = Web3.to_wei(float(eth_amount), 'ether')
        
        return Response(
            data={
                "eth": eth_amount,
                "wei": str(wei_amount),
                "gwei": str(Web3.to_wei(float(eth_amount), 'gwei'))
            },
            message="Conversion completed successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# WebSocket эндпоинт для реального времени (если нужен)
@router.get("/health", response_model=Response[Dict[str, Any]])
async def blockchain_health_check(
    blockchain_service: BlockchainService = Depends(get_blockchain_service)
) -> Any:
    """
    Проверка состояния блокчейн соединения.
    """
    try:
        network_info = blockchain_service.get_network_info()
        
        health_status = {
            "status": "healthy" if network_info.get("connected") else "unhealthy",
            "network": network_info,
            "timestamp": "2024-01-15T10:30:00Z",
            "services": {
                "web3": "connected" if network_info.get("connected") else "disconnected",
                "contracts": "available" if network_info.get("connected") else "unavailable"
            }
        }
        
        return Response(
            data=health_status,
            message="Blockchain health check completed"
        )
    except Exception as e:
        return Response(
            data={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": "2024-01-15T10:30:00Z"
            },
            message="Blockchain health check failed"
        )