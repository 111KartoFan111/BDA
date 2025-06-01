"""
Исправленные схемы контракта с правильной валидацией Pydantic v2.
Заменяет backend/app/schemas/contract.py
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, field_validator, ConfigDict, model_validator
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import uuid


from app.models.contract import ContractStatus, PaymentStatus, DisputeStatus


class UserMinimal(BaseModel):
    """Минимальная схема пользователя для контрактов."""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    avatar: Optional[str] = None
    is_verified: bool = False
    rating: Optional[float] = None
    total_reviews: int = 0


class ItemMinimal(BaseModel):
    """Минимальная схема товара для контрактов."""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    title: str
    description: str
    price_per_day: Decimal
    condition: str
    location: Optional[str] = None
    images: List[str] = []


class ContractBase(BaseModel):
    """Base contract schema."""
    item_id: uuid.UUID
    start_date: datetime
    end_date: datetime
    total_price: Decimal
    deposit: Optional[Decimal] = 0
    terms: Optional[str] = None
    special_conditions: Optional[str] = None
    
    @field_validator('end_date')
    @classmethod
    def validate_end_date(cls, v, info):
        if 'start_date' in info.data:
            start_date = info.data['start_date']
            end_date = v
            
            # Нормализуем даты для сравнения
            if start_date.tzinfo is not None:
                start_date = start_date.astimezone(timezone.utc).replace(tzinfo=None)
            
            if end_date.tzinfo is not None:
                end_date = end_date.astimezone(timezone.utc).replace(tzinfo=None)
            
            if end_date <= start_date:
                raise ValueError('End date must be after start date')
        return v
    
    @field_validator('start_date')
    @classmethod  
    def validate_start_date(cls, v):
        # Нормализуем дату
        if v.tzinfo is not None:
            normalized_date = v.astimezone(timezone.utc).replace(tzinfo=None)
        else:
            normalized_date = v
            
        # Проверяем, что дата не слишком в прошлом (разрешаем в пределах часа)
        current_time = datetime.utcnow()
        one_hour_ago = current_time - timedelta(hours=1)
        
        if normalized_date < one_hour_ago:
            raise ValueError('Start date cannot be more than 1 hour in the past')
        return v
    
    @field_validator('total_price', 'deposit')
    @classmethod
    def validate_amounts(cls, v):
        if v < 0:
            raise ValueError('Amount cannot be negative')
        return v


class ContractCreate(ContractBase):
    """Contract creation schema."""
    tenant_id: Optional[uuid.UUID] = None
    tenant_email: Optional[str] = None
    
    @model_validator(mode='after')
    def validate_tenant_info(self):
        """Проверяем, что указан либо tenant_id, либо tenant_email."""
        tenant_id = self.tenant_id
        tenant_email = self.tenant_email
        
        if not tenant_id and not tenant_email:
            raise ValueError('Either tenant_id or tenant_email must be provided')
        
        return self


class ContractUpdate(BaseModel):
    """Contract update schema."""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    total_price: Optional[Decimal] = None
    deposit: Optional[Decimal] = None
    terms: Optional[str] = None
    special_conditions: Optional[str] = None
    status: Optional[ContractStatus] = None


class Contract(BaseModel):
    """Основная схема контракта для API ответов."""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    tenant_id: uuid.UUID
    owner_id: uuid.UUID
    item_id: uuid.UUID
    start_date: datetime
    end_date: datetime
    total_price: Decimal
    deposit: Decimal = 0
    currency: str = "ETH"
    terms: Optional[str] = None
    special_conditions: Optional[str] = None
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


class ContractWithDetails(Contract):
    """Схема контракта с деталями пользователей и товара."""
    model_config = ConfigDict(from_attributes=True)
    
    tenant: UserMinimal
    owner: UserMinimal
    item: ItemMinimal


class ContractDetail(ContractWithDetails):
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
    
    @field_validator('message')
    @classmethod
    def validate_message(cls, v):
        if not v.strip():
            raise ValueError('Message cannot be empty')
        return v.strip()


class ContractMessageCreate(ContractMessageBase):
    """Contract message creation schema."""
    pass


class ContractMessage(ContractMessageBase):
    """Contract message response schema."""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    contract_id: uuid.UUID
    sender_id: uuid.UUID
    sender: UserMinimal
    is_read: bool = False
    is_system: bool = False
    created_at: datetime
    read_at: Optional[datetime] = None


class PaymentBase(BaseModel):
    """Base payment schema."""
    amount: Decimal
    payment_type: str
    description: Optional[str] = None
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        return v


class PaymentCreate(PaymentBase):
    """Payment creation schema."""
    contract_id: uuid.UUID


class Payment(PaymentBase):
    """Payment response schema."""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    contract_id: uuid.UUID
    payer_id: uuid.UUID
    payer: UserMinimal
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


class DisputeBase(BaseModel):
    """Base dispute schema."""
    reason: str
    description: str
    evidence: List[str] = []
    
    @field_validator('reason', 'description')
    @classmethod
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
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    contract_id: uuid.UUID
    complainant_id: uuid.UUID
    complainant: UserMinimal
    status: DisputeStatus
    priority: str = "normal"
    assigned_to: Optional[uuid.UUID] = None
    assigned_admin: Optional[UserMinimal] = None
    resolution: Optional[str] = None
    resolution_date: Optional[datetime] = None
    compensation_amount: Decimal = 0
    compensation_recipient: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class ContractHistory(BaseModel):
    """Contract history schema."""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    contract_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    user: Optional[UserMinimal] = None
    event_type: str
    description: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    created_at: datetime


class ContractSignature(BaseModel):
    """Contract signature schema."""
    signature: str
    
    @field_validator('signature')
    @classmethod
    def validate_signature(cls, v):
        if not v.strip():
            raise ValueError('Signature cannot be empty')
        return v.strip()


class ContractExtension(BaseModel):
    """Contract extension schema."""
    new_end_date: datetime
    additional_price: Decimal
    
    @field_validator('additional_price')
    @classmethod
    def validate_price(cls, v):
        if v < 0:
            raise ValueError('Additional price cannot be negative')
        return v


class ContractStats(BaseModel):
    """Contract statistics schema."""
    model_config = ConfigDict(from_attributes=True)
    
    total_contracts: int = 0
    active_contracts: int = 0
    completed_contracts: int = 0
    cancelled_contracts: int = 0
    disputed_contracts: int = 0
    total_volume: Decimal = 0
    average_contract_value: Decimal = 0
    contract_growth: float = 0.0
    status_distribution: Dict[str, int] = {}


# Forward reference resolution
ContractDetail.model_rebuild()