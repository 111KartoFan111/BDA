"""
Улучшенный блокчейн сервис с полной интеграцией с реальными смарт-контрактами.
Заменяет backend/app/services/blockchain.py
"""

from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from web3 import Web3
from web3.exceptions import Web3Exception, ContractLogicError
import json
import uuid
import logging
from decimal import Decimal
from datetime import datetime
import os

from app.models.contract import Contract, ContractStatus
from app.models.item import Item
from app.models.user import User
from app.core.config import settings
from app.utils.exceptions import BadRequestError, NotFoundError, BlockchainError

logger = logging.getLogger(__name__)


class RealBlockchainService:
    """Сервис для работы с реальными смарт-контрактами."""
    
    def __init__(self, db: Session):
        self.db = db
        self.w3 = None
        self.factory_contract = None
        self.factory_address = None
        self.account = None
        
        # ABI контрактов
        self.factory_abi = [
            {
                "inputs": [
                    {"internalType": "address", "name": "_tenant", "type": "address"},
                    {"internalType": "uint256", "name": "_itemId", "type": "uint256"},
                    {"internalType": "uint256", "name": "_duration", "type": "uint256"},
                    {"internalType": "uint256", "name": "_deposit", "type": "uint256"}
                ],
                "name": "createRentalContract",
                "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                "stateMutability": "payable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
                "name": "getUserContracts",
                "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getAllContracts",
                "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "internalType": "address", "name": "contractAddress", "type": "address"},
                    {"indexed": True, "internalType": "address", "name": "tenant", "type": "address"},
                    {"indexed": True, "internalType": "address", "name": "owner", "type": "address"},
                    {"indexed": False, "internalType": "uint256", "name": "itemId", "type": "uint256"}
                ],
                "name": "RentalContractCreated",
                "type": "event"
            }
        ]
        
        self.rental_abi = [
            {
                "inputs": [],
                "name": "getRentalInfo",
                "outputs": [
                    {"internalType": "address", "name": "tenant", "type": "address"},
                    {"internalType": "address", "name": "owner", "type": "address"},
                    {"internalType": "uint256", "name": "itemId", "type": "uint256"},
                    {"internalType": "uint256", "name": "amount", "type": "uint256"},
                    {"internalType": "uint256", "name": "duration", "type": "uint256"},
                    {"internalType": "uint256", "name": "deposit", "type": "uint256"},
                    {"internalType": "uint256", "name": "startTime", "type": "uint256"},
                    {"internalType": "uint8", "name": "status", "type": "uint8"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "payDeposit",
                "outputs": [],
                "stateMutability": "payable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "completeRental",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "string", "name": "_reason", "type": "string"}],
                "name": "cancelRental",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "_newDuration", "type": "uint256"}],
                "name": "extendRental",
                "outputs": [],
                "stateMutability": "payable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getContractBalance",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        
        self._initialize_web3()
    
    def _initialize_web3(self):
        """Инициализация подключения к Web3."""
        try:
            # Получаем URL провайдера
            provider_url = getattr(settings, 'WEB3_PROVIDER_URL', None)
            if not provider_url:
                provider_url = os.getenv('WEB3_PROVIDER_URL', 
                    'https://eth-sepolia.g.alchemy.com/v2/sw-BMbGHGOkXWmcIQRs-jGvzi4IVNMN1')
            
            logger.info(f"Connecting to Web3 provider: {provider_url}")
            self.w3 = Web3(Web3.HTTPProvider(provider_url))
            
            if not self.w3.is_connected():
                logger.error("Could not connect to Web3 provider")
                return
            
            # Проверяем сеть
            chain_id = self.w3.eth.chain_id
            if chain_id != 11155111:  # Sepolia
                logger.warning(f"Connected to unexpected network: {chain_id}")
            
            logger.info(f"✅ Connected to blockchain network: {chain_id}")
            
            # Загружаем адрес фабрики из конфига
            self.factory_address = getattr(settings, 'RENTAL_FACTORY_ADDRESS', None)
            if not self.factory_address:
                logger.error("RENTAL_FACTORY_ADDRESS not configured")
                return
            
            # Создаем контракт фабрики
            self.factory_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(self.factory_address),
                abi=self.factory_abi
            )
            
            # Настраиваем аккаунт для транзакций
            private_key = getattr(settings, 'BLOCKCHAIN_PRIVATE_KEY', None)
            if private_key:
                self.account = self.w3.eth.account.from_key(private_key)
                logger.info(f"Blockchain account configured: {self.account.address}")
            else:
                logger.warning("No private key configured - read-only mode")
            
            logger.info(f"✅ Factory contract initialized at {self.factory_address}")
            
        except Exception as e:
            logger.error(f"Web3 initialization failed: {e}")
            raise BlockchainError(f"Failed to initialize blockchain connection: {str(e)}")
    
    def deploy_rental_contract(self, contract_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any]:
        """
        Создать реальный смарт-контракт для аренды.
        
        Args:
            contract_id: ID контракта в БД
            user_id: ID пользователя
            
        Returns:
            Результат создания контракта
        """
        if not self.w3 or not self.w3.is_connected():
            raise BlockchainError("Blockchain connection not available")
        
        if not self.factory_contract:
            raise BlockchainError("Factory contract not initialized")
        
        if not self.account:
            raise BlockchainError("No blockchain account configured")
        
        # Получаем контракт из БД
        contract = self.db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        # Проверяем авторизацию
        if contract.owner_id != user_id:
            raise BadRequestError("Only contract owner can deploy to blockchain")
        
        # Проверяем готовность к деплою
        if not contract.tenant_signature or not contract.owner_signature:
            raise BadRequestError("Contract must be signed by both parties")
        
        if contract.status != ContractStatus.SIGNED:
            raise BadRequestError("Contract must be in SIGNED status")
        
        try:
            # Получаем адрес арендатора
            tenant = self.db.query(User).filter(User.id == contract.tenant_id).first()
            if not tenant or not tenant.wallet_address:
                raise BadRequestError("Tenant wallet address not found")
            
            # Подготавливаем параметры
            tenant_address = Web3.to_checksum_address(tenant.wallet_address)
            item_id = int(str(contract.item_id).replace('-', '')[:8], 16)  # Конвертируем UUID
            duration_seconds = int((contract.end_date - contract.start_date).total_seconds())
            deposit_wei = self.w3.to_wei(float(contract.deposit), 'ether')
            amount_wei = self.w3.to_wei(float(contract.total_price), 'ether')
            
            logger.info(f"Deploying contract: tenant={tenant_address}, item={item_id}, "
                       f"duration={duration_seconds}s, deposit={deposit_wei}, amount={amount_wei}")
            
            # Создаем транзакцию
            function_call = self.factory_contract.functions.createRentalContract(
                tenant_address,
                item_id,
                duration_seconds,
                deposit_wei
            )
            
            # Оцениваем газ
            try:
                gas_estimate = function_call.estimate_gas({
                    'from': self.account.address,
                    'value': amount_wei
                })
            except Exception as e:
                logger.error(f"Gas estimation failed: {e}")
                raise BlockchainError(f"Transaction would fail: {str(e)}")
            
            # Проверяем баланс
            balance = self.w3.eth.get_balance(self.account.address)
            total_cost = gas_estimate * self.w3.eth.gas_price + amount_wei
            
            if balance < total_cost:
                raise BlockchainError(
                    f"Insufficient balance. Need {self.w3.from_wei(total_cost, 'ether')} ETH, "
                    f"have {self.w3.from_wei(balance, 'ether')} ETH"
                )
            
            # Создаем и подписываем транзакцию
            transaction = function_call.build_transaction({
                'from': self.account.address,
                'value': amount_wei,
                'gas': int(gas_estimate * 1.2),  # Добавляем 20% запаса
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.account.address)
            })
            
            # Подписываем транзакцию
            signed_txn = self.w3.eth.account.sign_transaction(transaction, self.account.key)
            
            # Отправляем транзакцию
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            logger.info(f"Transaction sent: {tx_hash.hex()}")
            
            # Ждем подтверждения
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
            
            if receipt.status != 1:
                raise BlockchainError("Transaction failed")
            
            # Извлекаем адрес нового контракта из событий
            contract_address = None
            for log in receipt.logs:
                try:
                    decoded = self.factory_contract.events.RentalContractCreated().process_log(log)
                    contract_address = decoded['args']['contractAddress']
                    logger.info(f"New contract deployed at: {contract_address}")
                    break
                except:
                    continue
            
            if not contract_address:
                # Пытаемся получить адрес из логов по-другому
                if receipt.logs:
                    # Обычно адрес контракта можно найти в логах
                    contract_address = receipt.logs[0].address
                    logger.warning(f"Contract address extracted from logs: {contract_address}")
            
            # Обновляем контракт в БД
            contract.contract_address = contract_address
            contract.transaction_hash = tx_hash.hex()
            contract.block_number = receipt.blockNumber
            contract.status = ContractStatus.ACTIVE
            contract.updated_at = datetime.utcnow()
            
            self.db.commit()
            
            result = {
                "contract_address": contract_address,
                "transaction_hash": tx_hash.hex(),
                "block_number": receipt.blockNumber,
                "gas_used": receipt.gasUsed,
                "status": "deployed",
                "tenant_address": tenant_address,
                "amount_eth": self.w3.from_wei(amount_wei, 'ether'),
                "deposit_eth": self.w3.from_wei(deposit_wei, 'ether')
            }
            
            logger.info(f"✅ Contract {contract_id} successfully deployed to {contract_address}")
            return result
            
        except Exception as e:
            logger.error(f"Contract deployment failed: {e}")
            if isinstance(e, (BadRequestError, BlockchainError)):
                raise
            raise BlockchainError(f"Deployment failed: {str(e)}")
    
    def get_contract_status(self, contract_address: str) -> Dict[str, Any]:
        """
        Получить статус реального смарт-контракта.
        
        Args:
            contract_address: Адрес контракта
            
        Returns:
            Статус контракта
        """
        if not self.w3 or not self.w3.is_connected():
            raise BlockchainError("Blockchain connection not available")
        
        try:
            # Проверяем, что адрес содержит код
            code = self.w3.eth.get_code(Web3.to_checksum_address(contract_address))
            if code == b'':
                return {
                    "address": contract_address,
                    "status": "not_found",
                    "error": "No contract code at address"
                }
            
            # Создаем экземпляр контракта
            rental_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=self.rental_abi
            )
            
            # Получаем информацию о контракте
            rental_info = rental_contract.functions.getRentalInfo().call()
            
            # Получаем баланс контракта
            balance = self.w3.eth.get_balance(contract_address)
            
            status_map = {
                0: "created",
                1: "active", 
                2: "completed",
                3: "cancelled",
                4: "disputed"
            }
            
            return {
                "address": contract_address,
                "status": status_map.get(rental_info[7], "unknown"),
                "tenant": rental_info[0],
                "owner": rental_info[1],
                "item_id": rental_info[2],
                "amount": str(self.w3.from_wei(rental_info[3], 'ether')),
                "duration": rental_info[4],
                "deposit": str(self.w3.from_wei(rental_info[5], 'ether')),
                "start_time": rental_info[6],
                "balance": str(self.w3.from_wei(balance, 'ether')),
                "duration_days": rental_info[4] // (24 * 60 * 60),
                "start_date": datetime.fromtimestamp(rental_info[6]).isoformat() if rental_info[6] > 0 else None
            }
            
        except Exception as e:
            logger.error(f"Failed to get contract status: {e}")
            return {
                "address": contract_address,
                "status": "error",
                "error": str(e)
            }
    
    def pay_deposit(self, contract_address: str, user_id: uuid.UUID) -> Dict[str, Any]:
        """
        Оплатить депозит по контракту.
        
        Args:
            contract_address: Адрес смарт-контракта
            user_id: ID пользователя (арендатора)
            
        Returns:
            Результат операции
        """
        if not self.w3 or not self.w3.is_connected():
            raise BlockchainError("Blockchain connection not available")
        
        if not self.account:
            raise BlockchainError("No blockchain account configured")
        
        try:
            # Получаем контракт из БД
            db_contract = self.db.query(Contract).filter(
                Contract.contract_address == contract_address
            ).first()
            
            if not db_contract:
                raise NotFoundError("Contract", contract_address)
            
            if db_contract.tenant_id != user_id:
                raise BadRequestError("Only tenant can pay deposit")
            
            # Создаем экземпляр смарт-контракта
            rental_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=self.rental_abi
            )
            
            # Получаем информацию о депозите
            rental_info = rental_contract.functions.getRentalInfo().call()
            deposit_wei = rental_info[5]
            
            if rental_info[7] != 0:  # Не в статусе CREATED
                raise BadRequestError("Contract is not in CREATED status")
            
            # Создаем транзакцию
            function_call = rental_contract.functions.payDeposit()
            
            gas_estimate = function_call.estimate_gas({
                'from': self.account.address,
                'value': deposit_wei
            })
            
            transaction = function_call.build_transaction({
                'from': self.account.address,
                'value': deposit_wei,
                'gas': int(gas_estimate * 1.2),
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.account.address)
            })
            
            # Подписываем и отправляем
            signed_txn = self.w3.eth.account.sign_transaction(transaction, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Ждем подтверждения
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt.status == 1:
                # Обновляем статус в БД
                db_contract.deposit_paid = True
                self.db.commit()
                
                return {
                    "success": True,
                    "transaction_hash": tx_hash.hex(),
                    "deposit_amount": str(self.w3.from_wei(deposit_wei, 'ether')),
                    "gas_used": receipt.gasUsed
                }
            else:
                raise BlockchainError("Transaction failed")
                
        except Exception as e:
            logger.error(f"Failed to pay deposit: {e}")
            if isinstance(e, (BadRequestError, NotFoundError, BlockchainError)):
                raise
            raise BlockchainError(f"Deposit payment failed: {str(e)}")
    
    def complete_rental(self, contract_address: str, user_id: uuid.UUID) -> Dict[str, Any]:
        """
        Завершить аренду.
        
        Args:
            contract_address: Адрес смарт-контракта
            user_id: ID пользователя
            
        Returns:
            Результат операции
        """
        if not self.w3 or not self.w3.is_connected():
            raise BlockchainError("Blockchain connection not available")
        
        if not self.account:
            raise BlockchainError("No blockchain account configured")
        
        try:
            # Получаем контракт из БД
            db_contract = self.db.query(Contract).filter(
                Contract.contract_address == contract_address
            ).first()
            
            if not db_contract:
                raise NotFoundError("Contract", contract_address)
            
            # Проверяем права (владелец или арендатор)
            if db_contract.tenant_id != user_id and db_contract.owner_id != user_id:
                raise BadRequestError("Only contract parties can complete rental")
            
            # Создаем экземпляр смарт-контракта
            rental_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=self.rental_abi
            )
            
            # Создаем транзакцию
            function_call = rental_contract.functions.completeRental()
            
            gas_estimate = function_call.estimate_gas({'from': self.account.address})
            
            transaction = function_call.build_transaction({
                'from': self.account.address,
                'gas': int(gas_estimate * 1.2),
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.account.address)
            })
            
            # Подписываем и отправляем
            signed_txn = self.w3.eth.account.sign_transaction(transaction, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Ждем подтверждения
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt.status == 1:
                # Обновляем статус в БД
                db_contract.status = ContractStatus.COMPLETED
                db_contract.completed_at = datetime.utcnow()
                db_contract.completed_by = user_id
                self.db.commit()
                
                return {
                    "success": True,
                    "transaction_hash": tx_hash.hex(),
                    "gas_used": receipt.gasUsed,
                    "status": "completed"
                }
            else:
                raise BlockchainError("Transaction failed")
                
        except Exception as e:
            logger.error(f"Failed to complete rental: {e}")
            if isinstance(e, (BadRequestError, NotFoundError, BlockchainError)):
                raise
            raise BlockchainError(f"Rental completion failed: {str(e)}")
    
    def cancel_rental(self, contract_address: str, user_id: uuid.UUID, reason: str = "") -> Dict[str, Any]:
        """
        Отменить аренду.
        
        Args:
            contract_address: Адрес смарт-контракта
            user_id: ID пользователя
            reason: Причина отмены
            
        Returns:
            Результат операции
        """
        if not self.w3 or not self.w3.is_connected():
            raise BlockchainError("Blockchain connection not available")
        
        if not self.account:
            raise BlockchainError("No blockchain account configured")
        
        try:
            # Получаем контракт из БД
            db_contract = self.db.query(Contract).filter(
                Contract.contract_address == contract_address
            ).first()
            
            if not db_contract:
                raise NotFoundError("Contract", contract_address)
            
            # Проверяем права
            if db_contract.tenant_id != user_id and db_contract.owner_id != user_id:
                raise BadRequestError("Only contract parties can cancel rental")
            
            # Создаем экземпляр смарт-контракта
            rental_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=self.rental_abi
            )
            
            # Создаем транзакцию
            function_call = rental_contract.functions.cancelRental(reason)
            
            gas_estimate = function_call.estimate_gas({'from': self.account.address})
            
            transaction = function_call.build_transaction({
                'from': self.account.address,
                'gas': int(gas_estimate * 1.2),
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.account.address)
            })
            
            # Подписываем и отправляем
            signed_txn = self.w3.eth.account.sign_transaction(transaction, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Ждем подтверждения
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt.status == 1:
                # Обновляем статус в БД
                db_contract.status = ContractStatus.CANCELLED
                db_contract.cancelled_at = datetime.utcnow()
                db_contract.cancelled_by = user_id
                db_contract.cancellation_reason = reason
                self.db.commit()
                
                return {
                    "success": True,
                    "transaction_hash": tx_hash.hex(),
                    "gas_used": receipt.gasUsed,
                    "status": "cancelled",
                    "reason": reason
                }
            else:
                raise BlockchainError("Transaction failed")
                
        except Exception as e:
            logger.error(f"Failed to cancel rental: {e}")
            if isinstance(e, (BadRequestError, NotFoundError, BlockchainError)):
                raise
            raise BlockchainError(f"Rental cancellation failed: {str(e)}")
    
    def verify_transaction(self, tx_hash: str) -> Dict[str, Any]:
        """
        Верифицировать транзакцию.
        
        Args:
            tx_hash: Хеш транзакции
            
        Returns:
            Результат верификации
        """
        if not self.w3 or not self.w3.is_connected():
            raise BlockchainError("Blockchain connection not available")
        
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            transaction = self.w3.eth.get_transaction(tx_hash)
            
            current_block = self.w3.eth.block_number
            confirmations = current_block - receipt.blockNumber
            
            return {
                "hash": tx_hash,
                "status": "confirmed" if receipt.status == 1 else "failed",
                "confirmations": confirmations,
                "block_number": receipt.blockNumber,
                "gas_used": receipt.gasUsed,
                "gas_price": str(transaction.gasPrice),
                "from_address": transaction.get('from'),
                "to_address": transaction.get('to'),
                "value": str(transaction.value),
                "verified": True
            }
            
        except Exception as e:
            logger.error(f"Transaction verification failed: {e}")
            return {
                "hash": tx_hash,
                "status": "error",
                "error": str(e),
                "verified": False
            }
    
    def get_wallet_balance(self, wallet_address: str) -> str:
        """
        Получить баланс кошелька.
        
        Args:
            wallet_address: Адрес кошелька
            
        Returns:
            Баланс в ETH
        """
        if not self.w3 or not self.w3.is_connected():
            raise BlockchainError("Blockchain connection not available")
        
        try:
            if not Web3.is_address(wallet_address):
                raise BadRequestError("Invalid wallet address")
            
            balance_wei = self.w3.eth.get_balance(Web3.to_checksum_address(wallet_address))
            balance_eth = self.w3.from_wei(balance_wei, 'ether')
            
            return str(balance_eth)
            
        except Exception as e:
            logger.error(f"Failed to get wallet balance: {e}")
            raise BadRequestError(f"Failed to get wallet balance: {str(e)}")
    
    def get_network_info(self) -> Dict[str, Any]:
        """
        Получить информацию о сети.
        
        Returns:
            Информация о блокчейн сети
        """
        if not self.w3 or not self.w3.is_connected():
            return {
                "connected": False,
                "network": "unknown",
                "chain_id": 0,
                "block_number": 0,
                "gas_price": "0 gwei",
                "factory_address": self.factory_address
            }
        
        try:
            chain_id = self.w3.eth.chain_id
            network_names = {
                1: "mainnet",
                11155111: "sepolia",
                137: "polygon"
            }
            
            return {
                "connected": True,
                "network": network_names.get(chain_id, f"unknown-{chain_id}"),
                "chain_id": chain_id,
                "block_number": self.w3.eth.block_number,
                "gas_price": f"{self.w3.from_wei(self.w3.eth.gas_price, 'gwei')} gwei",
                "factory_address": self.factory_address,
                "account_address": self.account.address if self.account else None
            }
            
        except Exception as e:
            logger.error(f"Failed to get network info: {e}")
            return {
                "connected": False,
                "error": str(e),
                "factory_address": self.factory_address
            }
    
    def estimate_gas_price(self) -> Dict[str, Any]:
        """
        Получить оценки цены газа.
        
        Returns:
            Информация о ценах газа
        """
        if not self.w3 or not self.w3.is_connected():
            return {
                "slow": "20",
                "standard": "25", 
                "fast": "30",
                "unit": "gwei",
                "error": "Blockchain not connected"
            }
        
        try:
            current_gas_price = self.w3.eth.gas_price
            gas_price_gwei = float(self.w3.from_wei(current_gas_price, 'gwei'))
            
            return {
                "slow": str(round(gas_price_gwei * 0.8, 1)),
                "standard": str(round(gas_price_gwei, 1)),
                "fast": str(round(gas_price_gwei * 1.2, 1)),
                "unit": "gwei",
                "current": str(round(gas_price_gwei, 1))
            }
            
        except Exception as e:
            logger.error(f"Failed to estimate gas price: {e}")
            return {
                "slow": "20",
                "standard": "25",
                "fast": "30",
                "unit": "gwei",
                "error": str(e)
            }
    
    def get_user_contracts_from_blockchain(self, wallet_address: str) -> List[str]:
        """
        Получить контракты пользователя из блокчейна.
        
        Args:
            wallet_address: Адрес кошелька пользователя
            
        Returns:
            Список адресов контрактов
        """
        if not self.w3 or not self.factory_contract:
            return []
        
        try:
            contracts = self.factory_contract.functions.getUserContracts(
                Web3.to_checksum_address(wallet_address)
            ).call()
            
            return [contract for contract in contracts]
            
        except Exception as e:
            logger.error(f"Failed to get user contracts: {e}")
            return []
    
    def sync_contract_status(self, contract_id: uuid.UUID) -> bool:
        """
        Синхронизировать статус контракта с блокчейном.
        
        Args:
            contract_id: ID контракта в БД
            
        Returns:
            True если синхронизация прошла успешно
        """
        try:
            # Получаем контракт из БД
            db_contract = self.db.query(Contract).filter(Contract.id == contract_id).first()
            if not db_contract or not db_contract.contract_address:
                return False
            
            # Получаем статус из блокчейна
            blockchain_status = self.get_contract_status(db_contract.contract_address)
            
            if blockchain_status.get("status") == "error":
                return False
            
            # Маппинг статусов
            status_mapping = {
                "created": ContractStatus.SIGNED,  # В блокчейне created = подписан в БД
                "active": ContractStatus.ACTIVE,
                "completed": ContractStatus.COMPLETED,
                "cancelled": ContractStatus.CANCELLED,
                "disputed": ContractStatus.DISPUTED
            }
            
            blockchain_status_name = blockchain_status.get("status")
            if blockchain_status_name in status_mapping:
                new_status = status_mapping[blockchain_status_name]
                
                # Обновляем статус если изменился
                if db_contract.status != new_status:
                    old_status = db_contract.status
                    db_contract.status = new_status
                    db_contract.updated_at = datetime.utcnow()
                    
                    # Дополнительные обновления в зависимости от статуса
                    if new_status == ContractStatus.COMPLETED and not db_contract.completed_at:
                        db_contract.completed_at = datetime.utcnow()
                    elif new_status == ContractStatus.CANCELLED and not db_contract.cancelled_at:
                        db_contract.cancelled_at = datetime.utcnow()
                    
                    self.db.commit()
                    logger.info(f"Contract {contract_id} status updated: {old_status} -> {new_status}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync contract status: {e}")
            return False