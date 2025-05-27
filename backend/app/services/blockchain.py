"""
Blockchain service for smart contract operations.
"""

from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from web3 import Web3
import json
import uuid

from app.models.contract import Contract, ContractStatus
from app.core.config import settings
from app.utils.exceptions import BadRequestError, NotFoundError


class BlockchainService:
    """Service for blockchain operations."""
    
    def __init__(self, db: Session):
        self.db = db
        self.w3 = None
        self._initialize_web3()
    
    def _initialize_web3(self):
        """Initialize Web3 connection."""
        try:
            if settings.WEB3_PROVIDER_URL and settings.WEB3_PROVIDER_URL != "https://sepolia.infura.io/v3/YOUR_INFURA_KEY":
                self.w3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER_URL))
                if not self.w3.is_connected():
                    print("Warning: Could not connect to Web3 provider")
        except Exception as e:
            print(f"Warning: Web3 initialization failed: {e}")
    
    def deploy_rental_contract(self, contract_id: uuid.UUID, user_id: uuid.UUID) -> Dict[str, Any]:
        """
        Deploy rental contract to blockchain.
        
        Args:
            contract_id: Contract ID
            user_id: User ID deploying the contract
            
        Returns:
            Deployment result
        """
        if not self.w3 or not self.w3.is_connected():
            raise BadRequestError("Blockchain connection not available")
        
        # Get contract from database
        contract = self.db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise NotFoundError("Contract", str(contract_id))
        
        # Check if user is authorized (owner or tenant)
        if contract.owner_id != user_id and contract.tenant_id != user_id:
            raise BadRequestError("Not authorized to deploy this contract")
        
        # Check if contract is ready for deployment
        if not contract.tenant_signature or not contract.owner_signature:
            raise BadRequestError("Contract must be signed by both parties before deployment")
        
        try:
            # Mock deployment for development
            # In production, you would deploy actual smart contract here
            mock_address = f"0x{''.join([f'{i:02x}' for i in range(20)])}"
            mock_tx_hash = f"0x{''.join([f'{i:02x}' for i in range(32)])}"
            
            # Update contract with blockchain info
            contract.contract_address = mock_address
            contract.transaction_hash = mock_tx_hash
            contract.block_number = 12345678  # Mock block number
            contract.status = ContractStatus.ACTIVE
            
            self.db.commit()
            
            return {
                "contract_address": mock_address,
                "transaction_hash": mock_tx_hash,
                "block_number": 12345678,
                "gas_used": 150000,
                "status": "deployed"
            }
            
        except Exception as e:
            raise BadRequestError(f"Contract deployment failed: {str(e)}")
    
    def get_contract_status(self, contract_address: str) -> Dict[str, Any]:
        """
        Get blockchain contract status.
        
        Args:
            contract_address: Smart contract address
            
        Returns:
            Contract status information
        """
        if not self.w3 or not self.w3.is_connected():
            # Return mock data for development
            return {
                "address": contract_address,
                "status": "active",
                "balance": "0.1",
                "last_activity": "2024-01-15T10:30:00Z",
                "transaction_count": 3
            }
        
        try:
            # In production, query actual smart contract
            # For now, return mock data
            return {
                "address": contract_address,
                "status": "active",
                "balance": "0.1",
                "last_activity": "2024-01-15T10:30:00Z",
                "transaction_count": 3
            }
            
        except Exception as e:
            raise BadRequestError(f"Failed to get contract status: {str(e)}")
    
    def verify_transaction(self, tx_hash: str) -> Dict[str, Any]:
        """
        Verify blockchain transaction.
        
        Args:
            tx_hash: Transaction hash
            
        Returns:
            Transaction verification result
        """
        if not self.w3 or not self.w3.is_connected():
            # Return mock verification for development
            return {
                "hash": tx_hash,
                "status": "confirmed",
                "confirmations": 12,
                "block_number": 12345678,
                "gas_used": 21000,
                "verified": True
            }
        
        try:
            # In production, verify actual transaction
            # For now, return mock data
            return {
                "hash": tx_hash,
                "status": "confirmed",
                "confirmations": 12,
                "block_number": 12345678,
                "gas_used": 21000,
                "verified": True
            }
            
        except Exception as e:
            raise BadRequestError(f"Transaction verification failed: {str(e)}")
    
    def get_wallet_balance(self, wallet_address: str) -> str:
        """
        Get wallet balance.
        
        Args:
            wallet_address: Wallet address
            
        Returns:
            Balance in ETH
        """
        if not self.w3 or not self.w3.is_connected():
            # Return mock balance for development
            return "1.5"
        
        try:
            if not Web3.is_address(wallet_address):
                raise BadRequestError("Invalid wallet address")
            
            # Get balance in wei
            balance_wei = self.w3.eth.get_balance(wallet_address)
            # Convert to ETH
            balance_eth = self.w3.from_wei(balance_wei, 'ether')
            
            return str(balance_eth)
            
        except Exception as e:
            raise BadRequestError(f"Failed to get wallet balance: {str(e)}")
    
    def create_payment_transaction(
        self, 
        from_address: str, 
        to_address: str, 
        amount_eth: str
    ) -> Dict[str, Any]:
        """
        Create payment transaction (returns unsigned transaction).
        
        Args:
            from_address: Sender address
            to_address: Recipient address
            amount_eth: Amount in ETH
            
        Returns:
            Unsigned transaction data
        """
        if not self.w3 or not self.w3.is_connected():
            raise BadRequestError("Blockchain connection not available")
        
        try:
            # Validate addresses
            if not Web3.is_address(from_address) or not Web3.is_address(to_address):
                raise BadRequestError("Invalid wallet address")
            
            # Convert amount to wei
            amount_wei = self.w3.to_wei(amount_eth, 'ether')
            
            # Get nonce
            nonce = self.w3.eth.get_transaction_count(from_address)
            
            # Create transaction
            transaction = {
                'to': to_address,
                'value': amount_wei,
                'gas': 21000,
                'gasPrice': self.w3.eth.gas_price,
                'nonce': nonce,
            }
            
            return {
                "transaction": transaction,
                "estimated_gas": 21000,
                "gas_price": str(self.w3.eth.gas_price),
                "total_cost_eth": str(self.w3.from_wei(
                    transaction['gas'] * transaction['gasPrice'] + amount_wei, 
                    'ether'
                ))
            }
            
        except Exception as e:
            raise BadRequestError(f"Failed to create transaction: {str(e)}")
    
    def get_transaction_history(self, address: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get transaction history for address.
        
        Args:
            address: Wallet address
            limit: Number of transactions to return
            
        Returns:
            List of transactions
        """
        if not self.w3 or not self.w3.is_connected():
            # Return mock transactions for development
            return [
                {
                    "hash": f"0x{'1' * 64}",
                    "from": address,
                    "to": "0x742d35Cc6634C0532925a3b8D6Ac6131dAE9C0E3",
                    "value": "0.1",
                    "timestamp": "2024-01-15T10:30:00Z",
                    "status": "confirmed"
                }
            ]
        
        try:
            # In production, query blockchain for actual transactions
            # This would require indexing service or external API
            return []
            
        except Exception as e:
            raise BadRequestError(f"Failed to get transaction history: {str(e)}")
    
    def estimate_gas_price(self) -> Dict[str, Any]:
        """
        Get current gas price estimates.
        
        Returns:
            Gas price information
        """
        if not self.w3 or not self.w3.is_connected():
            # Return mock gas prices for development
            return {
                "slow": "20",
                "standard": "25", 
                "fast": "30",
                "unit": "gwei"
            }
        
        try:
            current_gas_price = self.w3.eth.gas_price
            gas_price_gwei = self.w3.from_wei(current_gas_price, 'gwei')
            
            return {
                "slow": str(float(gas_price_gwei) * 0.8),
                "standard": str(gas_price_gwei),
                "fast": str(float(gas_price_gwei) * 1.2),
                "unit": "gwei"
            }
            
        except Exception as e:
            raise BadRequestError(f"Failed to estimate gas price: {str(e)}")
    
    def validate_smart_contract(self, contract_address: str) -> Dict[str, Any]:
        """
        Validate smart contract code and functionality.
        
        Args:
            contract_address: Contract address to validate
            
        Returns:
            Validation result
        """
        if not self.w3 or not self.w3.is_connected():
            return {
                "valid": True,
                "contract_type": "rental",
                "version": "1.0.0",
                "verified": False
            }
        
        try:
            # Check if address contains contract code
            code = self.w3.eth.get_code(contract_address)
            
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
        Get blockchain network information.
        
        Returns:
            Network information
        """
        if not self.w3 or not self.w3.is_connected():
            return {
                "connected": False,
                "network": "sepolia",
                "chain_id": 11155111,
                "block_number": 0
            }
        
        try:
            return {
                "connected": True,
                "network": "sepolia",
                "chain_id": self.w3.eth.chain_id,
                "block_number": self.w3.eth.block_number,
                "gas_price": str(self.w3.from_wei(self.w3.eth.gas_price, 'gwei')) + " gwei"
            }
            
        except Exception as e:
            return {
                "connected": False,
                "error": str(e)
            }