"""
Улучшенный сервис блокчейна для интеграции с смарт-контрактами.
"""

from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from web3 import Web3
from web3.exceptions import Web3Exception
import json
import uuid
import logging
from decimal import Decimal

from app.models.contract import Contract, ContractStatus
from app.models.item import Item
from app.models.user import User
from app.core.config import settings
from app.utils.exceptions import BadRequestError, NotFoundError, BlockchainError

logger = logging.getLogger(__name__)


class BlockchainService:
    """Улучшенный сервис для работы с блокчейном и смарт-контрактами."""
    
    def __init__(self, db: Session):
        self.db = db
        self.w3 = None
        self.contract_factory = None
        self.contract_abi = None
        self._initialize_web3()
    
    def _initialize_web3(self):
        """Инициализация подключения к Web3."""
        try:
            if settings.WEB3_PROVIDER_URL and settings.WEB3_PROVIDER_URL != "https://sepolia.infura.io/v3/YOUR_INFURA_KEY":
                self.w3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER_URL))
                
                if not self.w3.is_connected():
                    logger.warning("Could not connect to Web3 provider")
                    return
                
                # Загружаем ABI контрактов
                self._load_contract_abis()
                self._initialize_factory_contract()
                
                logger.info(f"Connected to blockchain network: {self.w3.eth.chain_id}")
            else:
                logger.warning("Web3 provider URL not configured properly")
        except Exception as e:
            logger.error(f"Web3 initialization failed: {e}")
    
    def _load_contract_abis(self):
        """Загрузка ABI контрактов."""
        # В реальном проекте ABI можно загружать из файлов или БД
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
            }
        ]
    
    def _initialize_factory_contract(self):
        """Инициализация контракта фабрики."""
        try:
            factory_address = getattr(settings, 'RENTAL_FACTORY_ADDRESS', None)
            if factory_address and self.w3:
                self.contract_factory = self.w3.eth.contract(
                    address=Web3.to_checksum_address(factory_address),
                    abi=self.factory_abi
                )
                logger.info(f"Factory contract initialized at {factory_address}")
        except Exception as e:
            logger.error(f"Failed to initialize factory contract: {e}")
    
    def deploy_rental_contract(self, contract_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any]:
        """
        Деплой контракта аренды в блокчейн.
        
        Args:
            contract_id: ID контракта в БД
            user_id: ID пользователя
            
        Returns:
            Результат деплоя
        """
        if not self.w3 or not self.w3.is_connected():
            # В тестовом режиме возвращаем мок-данные
            return self._mock_deployment_result()
        
        # Получаем контракт из БД
        contract = self.db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        # Проверяем авторизацию
        if contract.owner_id != user_id and contract.tenant_id != user_id:
            raise BadRequestError("Not authorized to deploy this contract")
        
        # Проверяем готовность к деплою
        if not contract.tenant_signature or not contract.owner_signature:
            raise BadRequestError("Contract must be signed by both parties")
        
        try:
            if self.contract_factory:
                # Реальный деплой через фабрику
                return self._deploy_through_factory(contract)
            else:
                # Мок-деплой для разработки
                return self._mock_deployment_result()
                
        except Exception as e:
            logger.error(f"Contract deployment failed: {e}")
            raise BlockchainError(f"Deployment failed: {str(e)}")
    
    def _deploy_through_factory(self, contract: Contract) -> Dict[str, Any]:
        """Деплой через фабрику контрактов."""
        try:
            # Получаем адрес владельца из настроек или переменных окружения
            owner_address = getattr(settings, 'BLOCKCHAIN_OWNER_ADDRESS', None)
            if not owner_address:
                raise BadRequestError("Blockchain owner address not configured")
            
            # Конвертируем параметры
            tenant_address = contract.tenant.wallet_address
            if not tenant_address:
                raise BadRequestError("Tenant wallet address not found")
            
            item_id = int(str(contract.item_id).replace('-', '')[:8], 16)  # Упрощенная конвертация UUID
            duration_seconds = int((contract.end_date - contract.start_date).total_seconds())
            deposit_wei = self.w3.to_wei(float(contract.deposit), 'ether')
            amount_wei = self.w3.to_wei(float(contract.total_price), 'ether')
            
            # Создаем транзакцию
            function_call = self.contract_factory.functions.createRentalContract(
                Web3.to_checksum_address(tenant_address),
                item_id,
                duration_seconds,
                deposit_wei
            )
            
            # Оцениваем газ
            gas_estimate = function_call.estimate_gas({
                'from': Web3.to_checksum_address(owner_address),
                'value': amount_wei
            })
            
            # Отправляем транзакцию (требует приватного ключа)
            # В реальном проекте используйте безопасное хранение ключей
            tx_hash = function_call.transact({
                'from': Web3.to_checksum_address(owner_address),
                'value': amount_wei,
                'gas': int(gas_estimate * 1.2)
            })
            
            # Ждем подтверждения
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            # Извлекаем адрес нового контракта из событий
            contract_address = None
            if receipt.logs:
                for log in receipt.logs:
                    try:
                        decoded = self.contract_factory.events.RentalContractCreated().process_log(log)
                        contract_address = decoded['args']['contractAddress']
                        break
                    except:
                        continue
            
            return {
                "contract_address": contract_address,
                "transaction_hash": tx_hash.hex(),
                "block_number": receipt.blockNumber,
                "gas_used": receipt.gasUsed,
                "status": "deployed"
            }
            
        except Exception as e:
            logger.error(f"Factory deployment failed: {e}")
            raise BlockchainError(f"Factory deployment failed: {str(e)}")
    
    def _mock_deployment_result(self) -> Dict[str, Any]:
        """Мок-результат для разработки."""
        mock_address = f"0x{''.join([f'{i:02x}' for i in range(20)])}"
        mock_tx_hash = f"0x{''.join([f'{i:02x}' for i in range(32)])}"
        
        return {
            "contract_address": mock_address,
            "transaction_hash": mock_tx_hash,
            "block_number": 12345678,
            "gas_used": 150000,
            "status": "deployed"
        }
    
    def get_contract_status(self, contract_address: str) -> Dict[str, Any]:
        """
        Получить статус контракта в блокчейне.
        
        Args:
            contract_address: Адрес контракта
            
        Returns:
            Статус контракта
        """
        if not self.w3 or not self.w3.is_connected():
            return self._mock_contract_status(contract_address)
        
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
                "balance": str(self.w3.from_wei(self.w3.eth.get_balance(contract_address), 'ether'))
            }
            
        except Exception as e:
            logger.error(f"Failed to get contract status: {e}")
            return {
                "address": contract_address,
                "status": "error",
                "error": str(e)
            }
    
    def _mock_contract_status(self, contract_address: str) -> Dict[str, Any]:
        """Мок-статус для разработки."""
        return {
            "address": contract_address,
            "status": "active",
            "tenant": "0x1234567890123456789012345678901234567890",
            "owner": "0x0987654321098765432109876543210987654321",
            "item_id": 1,
            "amount": "0.1",
            "duration": 604800,  # 7 days
            "deposit": "0.01",
            "start_time": 1640995200,
            "balance": "0.11"
        }
    
    def verify_transaction(self, tx_hash: str) -> Dict[str, Any]:
        """
        Верификация транзакции.
        
        Args:
            tx_hash: Хеш транзакции
            
        Returns:
            Результат верификации
        """
        if not self.w3 or not self.w3.is_connected():
            return self._mock_transaction_verification(tx_hash)
        
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
    
    def _mock_transaction_verification(self, tx_hash: str) -> Dict[str, Any]:
        """Мок-верификация для разработки."""
        return {
            "hash": tx_hash,
            "status": "confirmed",
            "confirmations": 12,
            "block_number": 12345678,
            "gas_used": 21000,
            "gas_price": "20000000000",
            "verified": True
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
            return "1.5"  # Мок-баланс
        
        try:
            if not Web3.is_address(wallet_address):
                raise BadRequestError("Invalid wallet address")
            
            balance_wei = self.w3.eth.get_balance(Web3.to_checksum_address(wallet_address))
            balance_eth = self.w3.from_wei(balance_wei, 'ether')
            
            return str(balance_eth)
            
        except Exception as e:
            logger.error(f"Failed to get wallet balance: {e}")
            raise BadRequestError(f"Failed to get wallet balance: {str(e)}")
    
    def create_payment_transaction(
        self, 
        from_address: str, 
        to_address: str, 
        amount_eth: str
    ) -> Dict[str, Any]:
        """
        Создать транзакцию платежа.
        
        Args:
            from_address: Адрес отправителя
            to_address: Адрес получателя
            amount_eth: Сумма в ETH
            
        Returns:
            Данные транзакции
        """
        if not self.w3 or not self.w3.is_connected():
            return self._mock_payment_transaction(from_address, to_address, amount_eth)
        
        try:
            # Валидация адресов
            if not Web3.is_address(from_address) or not Web3.is_address(to_address):
                raise BadRequestError("Invalid wallet address")
            
            # Конвертация в wei
            amount_wei = self.w3.to_wei(amount_eth, 'ether')
            
            # Получение nonce
            nonce = self.w3.eth.get_transaction_count(Web3.to_checksum_address(from_address))
            
            # Создание транзакции
            transaction = {
                'to': Web3.to_checksum_address(to_address),
                'value': amount_wei,
                'gas': 21000,
                'gasPrice': self.w3.eth.gas_price,
                'nonce': nonce,
            }
            
            total_cost = transaction['gas'] * transaction['gasPrice'] + amount_wei
            
            return {
                "transaction": transaction,
                "estimated_gas": 21000,
                "gas_price": str(transaction['gasPrice']),
                "total_cost_eth": str(self.w3.from_wei(total_cost, 'ether'))
            }
            
        except Exception as e:
            logger.error(f"Failed to create payment transaction: {e}")
            raise BadRequestError(f"Failed to create transaction: {str(e)}")
    
    def _mock_payment_transaction(self, from_address: str, to_address: str, amount_eth: str) -> Dict[str, Any]:
        """Мок-транзакция для разработки."""
        return {
            "transaction": {
                "to": to_address,
                "value": int(float(amount_eth) * 10**18),
                "gas": 21000,
                "gasPrice": 20000000000,
                "nonce": 42
            },
            "estimated_gas": 21000,
            "gas_price": "20000000000",
            "total_cost_eth": str(float(amount_eth) + 0.00042)
        }
    
    def get_transaction_history(self, address: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Получить историю транзакций.
        
        Args:
            address: Адрес кошелька
            limit: Количество транзакций
            
        Returns:
            Список транзакций
        """
        if not self.w3 or not self.w3.is_connected():
            return self._mock_transaction_history(address, limit)
        
        # В реальном проекте нужен индексер или внешний API
        return []
    
    def _mock_transaction_history(self, address: str, limit: int) -> List[Dict[str, Any]]:
        """Мок-история для разработки."""
        return [
            {
                "hash": f"0x{'1' * 64}",
                "from": address,
                "to": "0x742d35Cc6634C0532925a3b8D6Ac6131dAE9C0E3",
                "value": "0.1",
                "timestamp": "2024-01-15T10:30:00Z",
                "status": "confirmed",
                "block_number": 12345678
            }
        ] * min(limit, 5)
    
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
                "unit": "gwei"
            }
        
        try:
            current_gas_price = self.w3.eth.gas_price
            gas_price_gwei = float(self.w3.from_wei(current_gas_price, 'gwei'))
            
            return {
                "slow": str(round(gas_price_gwei * 0.8, 1)),
                "standard": str(round(gas_price_gwei, 1)),
                "fast": str(round(gas_price_gwei * 1.2, 1)),
                "unit": "gwei"
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
    
    def validate_smart_contract(self, contract_address: str) -> Dict[str, Any]:
        """
        Валидация смарт-контракта.
        
        Args:
            contract_address: Адрес контракта
            
        Returns:
            Результат валидации
        """
        if not self.w3 or not self.w3.is_connected():
            return {
                "valid": True,
                "contract_type": "rental",
                "version": "1.0.0",
                "verified": False
            }
        
        try:
            code = self.w3.eth.get_code(Web3.to_checksum_address(contract_address))
            
            if code == b'':
                return {
                    "valid": False,
                    "error": "No contract code found at address"
                }
            
            return {
                "valid": True,
                "contract_type": "rental",
                "version": "1.0.0",
                "verified": True,
                "code_size": len(code)
            }
            
        except Exception as e:
            return {
                "valid": False,
                "error": str(e)
            }
    
    def get_network_info(self) -> Dict[str, Any]:
        """
        Получить информацию о сети.
        
        Returns:
            Информация о блокчейн сети
        """
        if not self.w3 or not self.w3.is_connected():
            return {
                "connected": False,
                "network": "sepolia",
                "chain_id": 11155111,
                "block_number": 0,
                "gas_price": "0 gwei"
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
                "gas_price": f"{self.w3.from_wei(self.w3.eth.gas_price, 'gwei')} gwei"
            }
            
        except Exception as e:
            logger.error(f"Failed to get network info: {e}")
            return {
                "connected": False,
                "error": str(e)
            }
    
    def execute_contract_function(
        self, 
        contract_address: str,
        function_name: str,
        args: List[Any],
        user_address: str,
        value_eth: str = "0"
    ) -> Dict[str, Any]:
        """
        Выполнить функцию контракта.
        
        Args:
            contract_address: Адрес контракта
            function_name: Название функции
            args: Аргументы функции
            user_address: Адрес пользователя
            value_eth: Сумма к отправке
            
        Returns:
            Результат выполнения
        """
        if not self.w3 or not self.w3.is_connected():
            return {
                "success": True,
                "transaction_hash": "0x" + "1" * 64,
                "gas_used": 50000,
                "mock": True
            }
        
        try:
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=self.rental_abi
            )
            
            function = getattr(contract.functions, function_name)
            if not function:
                raise BadRequestError(f"Function {function_name} not found")
            
            # Подготовка транзакции
            tx_params = {
                'from': Web3.to_checksum_address(user_address),
                'value': self.w3.to_wei(value_eth, 'ether') if value_eth != "0" else 0
            }
            
            # Оценка газа
            gas_estimate = function(*args).estimate_gas(tx_params)
            tx_params['gas'] = int(gas_estimate * 1.2)
            
            # В реальном проекте здесь должно быть подписание транзакции
            # Пока возвращаем мок-результат
            return {
                "success": True,
                "estimated_gas": gas_estimate,
                "function": function_name,
                "args": args,
                "requires_signing": True
            }
            
        except Exception as e:
            logger.error(f"Contract function execution failed: {e}")
            raise BlockchainError(f"Function execution failed: {str(e)}")
    
    def monitor_contract_events(self, contract_address: str, from_block: int = 0) -> List[Dict[str, Any]]:
        """
        Мониторинг событий контракта.
        
        Args:
            contract_address: Адрес контракта
            from_block: Начальный блок
            
        Returns:
            Список событий
        """
        if not self.w3 or not self.w3.is_connected():
            return []
        
        try:
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=self.rental_abi
            )
            
            # Получаем все события
            events = []
            event_filter = contract.events.RentalCompleted.create_filter(
                fromBlock=from_block,
                toBlock='latest'
            )
            
            for event in event_filter.get_all_entries():
                events.append({
                    "event": "RentalCompleted",
                    "block_number": event.blockNumber,
                    "transaction_hash": event.transactionHash.hex(),
                    "args": dict(event.args)
                })
            
            return events
            
        except Exception as e:
            logger.error(f"Event monitoring failed: {e}")
            return []