"""
Contract model for rental agreements.
"""

from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Integer,
    Numeric, JSON, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base
import uuid
import enum



class ContractStatus(str, enum.Enum):
    """Contract status."""
    DRAFT = "draft"
    PENDING = "pending"
    SIGNED = "signed"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"
    EXPIRED = "expired"


class PaymentStatus(str, enum.Enum):
    """Payment status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class DisputeStatus(str, enum.Enum):
    """Dispute status."""
    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    CLOSED = "closed"


class Contract(Base):
    """Contract model for rental agreements."""
    
    __tablename__ = "contracts"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Parties
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    
    # Contract details
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    total_price = Column(Numeric(20, 8), nullable=False)  # In ETH
    deposit = Column(Numeric(20, 8), default=0)
    currency = Column(String(10), default="ETH")
    
    # Terms
    terms = Column(Text)  # Contract terms
    special_conditions = Column(Text)  # Special conditions
    
    # Status
    status = Column(SQLEnum(ContractStatus), default=ContractStatus.DRAFT)
    
    # Signatures
    tenant_signature = Column(String(500))  # Digital signature
    owner_signature = Column(String(500))
    tenant_signed_at = Column(DateTime(timezone=True))
    owner_signed_at = Column(DateTime(timezone=True))
    
    # Blockchain
    contract_address = Column(String(42))  # Smart contract address
    transaction_hash = Column(String(66))  # Deployment transaction
    block_number = Column(Integer)
    
    # Payment tracking
    payment_status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    paid_amount = Column(Numeric(20, 8), default=0)
    deposit_paid = Column(Boolean, default=False)
    
    # Completion
    completed_at = Column(DateTime(timezone=True))
    completed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Cancellation
    cancelled_at = Column(DateTime(timezone=True))
    cancelled_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    cancellation_reason = Column(Text)
    
    # Extension
    original_end_date = Column(DateTime(timezone=True))
    extension_count = Column(Integer, default=0)
    
    # meta_info
    meta_info = Column(JSON, default=dict)  # Additional contract data
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tenant = relationship("User", foreign_keys=[tenant_id], back_populates="tenant_contracts")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owner_contracts")
    item = relationship("Item", back_populates="contracts")
    messages = relationship("ContractMessage", back_populates="contract", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="contract", cascade="all, delete-orphan")
    disputes = relationship("Dispute", back_populates="contract", cascade="all, delete-orphan")
    history = relationship("ContractHistory", back_populates="contract", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Contract(id={self.id}, status={self.status})>"
    
    @property
    def duration_days(self):
        """Get contract duration in days."""
        return (self.end_date - self.start_date).days
    
    @property
    def is_active(self):
        """Check if contract is currently active."""
        return self.status == ContractStatus.ACTIVE
    
    @property
    def is_signed(self):
        """Check if contract is fully signed."""
        return self.tenant_signature and self.owner_signature
    
    @property
    def daily_rate(self):
        """Get daily rental rate."""
        if self.duration_days > 0:
            return self.total_price / self.duration_days
        return self.total_price


class ContractMessage(Base):
    """Contract messaging system."""
    
    __tablename__ = "contract_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Message content
    message = Column(Text, nullable=False)
    message_type = Column(String(50), default="text")  # text, image, document, system
    attachments = Column(JSON, default=list)  # File attachments
    
    # Status
    is_read = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)  # System generated message
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True))
    
    # Relationships
    contract = relationship("Contract", back_populates="messages")
    sender = relationship("User")
    
    def __repr__(self):
        return f"<ContractMessage(id={self.id}, contract_id={self.contract_id})>"


class Payment(Base):
    """Payment tracking for contracts."""
    
    __tablename__ = "payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    payer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Payment details
    amount = Column(Numeric(20, 8), nullable=False)
    currency = Column(String(10), default="ETH")
    payment_type = Column(String(50), nullable=False)  # rental, deposit, penalty, refund
    
    # Status
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    
    # Blockchain
    transaction_hash = Column(String(66))
    block_number = Column(Integer)
    gas_used = Column(Integer)
    gas_price = Column(Numeric(20, 0))
    
    # meta_info
    description = Column(String(500))
    meta_info = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    confirmed_at = Column(DateTime(timezone=True))
    
    # Relationships
    contract = relationship("Contract", back_populates="payments")
    payer = relationship("User")
    
    def __repr__(self):
        return f"<Payment(id={self.id}, amount={self.amount}, status={self.status})>"


class Dispute(Base):
    """Dispute handling for contracts."""
    
    __tablename__ = "disputes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    complainant_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Dispute details
    reason = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    evidence = Column(JSON, default=list)  # Evidence files/links
    
    # Status
    status = Column(SQLEnum(DisputeStatus), default=DisputeStatus.OPEN)
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    
    # Resolution
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"))  # Admin/moderator
    resolution = Column(Text)
    resolution_date = Column(DateTime(timezone=True))
    
    # Compensation
    compensation_amount = Column(Numeric(20, 8), default=0)
    compensation_recipient = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    contract = relationship("Contract", back_populates="disputes")
    complainant = relationship("User", foreign_keys=[complainant_id])
    assigned_admin = relationship("User", foreign_keys=[assigned_to])
    compensation_user = relationship("User", foreign_keys=[compensation_recipient])
    
    def __repr__(self):
        return f"<Dispute(id={self.id}, status={self.status})>"


class ContractHistory(Base):
    """Contract history tracking."""
    
    __tablename__ = "contract_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Event details
    event_type = Column(String(50), nullable=False)  # created, signed, activated, etc.
    description = Column(String(500))
    old_value = Column(JSON)
    new_value = Column(JSON)
    
    # meta_info
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    contract = relationship("Contract", back_populates="history")
    user = relationship("User")
    
    def __repr__(self):
        return f"<ContractHistory(id={self.id}, event_type={self.event_type})>"