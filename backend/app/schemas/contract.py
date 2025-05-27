"""
Contract schemas for request/response validation.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, validator
from datetime import datetime
from decimal import Decimal
import uuid

from app.models.contract import ContractStatus, PaymentStatus, DisputeStatus


class ContractBase(BaseModel):
    """Base contract schema."""
    item_id: uuid.UUID
    start_date: datetime
    end_date: datetime
    total_price: Decimal
    deposit: Optional[Decimal] = 0
    terms: Optional[str] = None
    special_conditions: Optional[str] = None
    
    @validator('end_date')
    def validate_end_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v
    
    @validator('total_price', 'deposit')
    def validate_amounts(cls, v):
        if v < 0:
            raise ValueError('Amount cannot be negative')
        return v


class ContractCreate(ContractBase):
    """Contract creation schema."""
    tenant_id: uuid.UUID


class ContractUpdate(BaseModel):
    """Contract update schema."""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    total_price: Optional[Decimal] = None
    deposit: Optional[Decimal] = None
    terms: Optional[str] = None
    special_conditions: Optional[str] = None
    status: Optional[ContractStatus] = None


class ContractInDB(ContractBase):
    """Contract schema for database operations."""
    id: uuid.UUID
    tenant_id: uuid.UUID
    owner_id: uuid.UUID
    status: ContractStatus
    tenant_signature: Optional[str] = None
    owner_signature: Optional[str] = None
    tenant_signed_at: Optional[datetime] = None
    owner_signed_at: Optional[datetime] = None
    contract_address: Optional[str] = None
    transaction_hash: Optional[str] = None
    block_number: Optional[int] = None
    payment_status: PaymentStatus
    paid_amount: Decimal = 0
    deposit_paid: bool = False
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    extension_count: int = 0
    meta_info: Dict[str, Any] = {}
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class Contract(ContractInDB):
    """Public contract schema."""
    tenant: Dict[str, Any] = {}
    owner: Dict[str, Any] = {}
    item: Dict[str, Any] = {}


class ContractDetail(Contract):
    """Detailed contract schema."""
    messages: List['ContractMessage'] = []
    payments: List['Payment'] = []
    disputes: List['Dispute'] = []
    history: List['ContractHistory'] = []


class ContractList(BaseModel):
    """Contract list response schema."""
    contracts: List[Contract]
    total: int
    page: int
    size: int
    pages: int


class ContractMessageBase(BaseModel):
    """Base contract message schema."""
    message: str
    message_type: str = "text"
    attachments: List[str] = []
    
    @validator('message')
    def validate_message(cls, v):
        if not v.strip():
            raise ValueError('Message cannot be empty')
        return v.strip()


class ContractMessageCreate(ContractMessageBase):
    """Contract message creation schema."""
    pass


class ContractMessage(ContractMessageBase):
    """Contract message response schema."""
    id: uuid.UUID
    contract_id: uuid.UUID
    sender_id: uuid.UUID
    sender: Dict[str, Any] = {}
    is_read: bool = False
    is_system: bool = False
    created_at: datetime
    read_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class PaymentBase(BaseModel):
    """Base payment schema."""
    amount: Decimal
    payment_type: str
    description: Optional[str] = None
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        return v


class PaymentCreate(PaymentBase):
    """Payment creation schema."""
    contract_id: uuid.UUID


class Payment(PaymentBase):
    """Payment response schema."""
    id: uuid.UUID
    contract_id: uuid.UUID
    payer_id: uuid.UUID
    payer: Dict[str, Any] = {}
    currency: str = "ETH"
    status: PaymentStatus
    transaction_hash: Optional[str] = None
    block_number: Optional[int] = None
    gas_used: Optional[int] = None
    gas_price: Optional[int] = None
    meta_info: Dict[str, Any] = {}
    created_at: datetime
    processed_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class DisputeBase(BaseModel):
    """Base dispute schema."""
    reason: str
    description: str
    evidence: List[str] = []
    
    @validator('reason', 'description')
    def validate_text_fields(cls, v):
        if not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()


class DisputeCreate(DisputeBase):
    """Dispute creation schema."""
    contract_id: uuid.UUID


class DisputeUpdate(BaseModel):
    """Dispute update schema."""
    status: Optional[DisputeStatus] = None
    assigned_to: Optional[uuid.UUID] = None
    resolution: Optional[str] = None
    compensation_amount: Optional[Decimal] = None
    compensation_recipient: Optional[uuid.UUID] = None


class Dispute(DisputeBase):
    """Dispute response schema."""
    id: uuid.UUID
    contract_id: uuid.UUID
    complainant_id: uuid.UUID
    complainant: Dict[str, Any] = {}
    status: DisputeStatus
    priority: str = "normal"
    assigned_to: Optional[uuid.UUID] = None
    assigned_admin: Optional[Dict[str, Any]] = None
    resolution: Optional[str] = None
    resolution_date: Optional[datetime] = None
    compensation_amount: Decimal = 0
    compensation_recipient: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class ContractHistory(BaseModel):
    """Contract history schema."""
    id: uuid.UUID
    contract_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    user: Optional[Dict[str, Any]] = None
    event_type: str
    description: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        orm_mode = True


class ContractSignature(BaseModel):
    """Contract signature schema."""
    signature: str
    
    @validator('signature')
    def validate_signature(cls, v):
        if not v.strip():
            raise ValueError('Signature cannot be empty')
        return v.strip()


class ContractExtension(BaseModel):
    """Contract extension schema."""
    new_end_date: datetime
    additional_price: Decimal
    
    @validator('additional_price')
    def validate_price(cls, v):
        if v < 0:
            raise ValueError('Additional price cannot be negative')
        return v


class ContractStats(BaseModel):
    """Contract statistics schema."""
    total_contracts: int = 0
    active_contracts: int = 0
    completed_contracts: int = 0
    cancelled_contracts: int = 0
    disputed_contracts: int = 0
    total_volume: Decimal = 0
    average_contract_value: Decimal = 0
    contract_growth: float = 0.0
    status_distribution: Dict[str, int] = {}
    
    class Config:
        orm_mode = True


# Forward reference resolution
ContractDetail.update_forward_refs()