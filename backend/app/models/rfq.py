import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Date,
    Numeric,
    ForeignKey,
    Integer,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class RfqStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    FORCE_CLOSED = "FORCE_CLOSED"


class ExtensionTrigger(str, enum.Enum):
    BID_RECEIVED = "BID_RECEIVED"
    ANY_RANK_CHANGE = "ANY_RANK_CHANGE"
    L1_RANK_CHANGE = "L1_RANK_CHANGE"


class Rfq(Base):
    __tablename__ = "rfqs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reference_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    pickup_date = Column(Date, nullable=False)
    is_british_auction = Column(Boolean, default=True, nullable=False)

    bid_start_time = Column(DateTime(timezone=True), nullable=False)
    bid_close_time = Column(DateTime(timezone=True), nullable=False)  # Original close time
    current_bid_close_time = Column(DateTime(timezone=True), nullable=False, index=True)
    forced_bid_close_time = Column(DateTime(timezone=True), nullable=False)

    status = Column(SQLEnum(RfqStatus), default=RfqStatus.SCHEDULED, nullable=False, index=True)
    lowest_bid_id = Column(String(36), nullable=True)
    lowest_bid_amount = Column(Numeric(14, 2), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    config = relationship("AuctionConfig", back_populates="rfq", uselist=False, cascade="all, delete-orphan")
    bids = relationship("Bid", back_populates="rfq", cascade="all, delete-orphan", order_by="Bid.created_at.desc()")
    events = relationship("AuctionEvent", back_populates="rfq", cascade="all, delete-orphan", order_by="AuctionEvent.created_at.desc()")


class AuctionConfig(Base):
    __tablename__ = "auction_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rfq_id = Column(String(36), ForeignKey("rfqs.id", ondelete="CASCADE"), unique=True, nullable=False)
    trigger_window_minutes = Column(Integer, nullable=False)  # X
    extension_duration_minutes = Column(Integer, nullable=False)  # Y
    extension_trigger = Column(SQLEnum(ExtensionTrigger), nullable=False)

    rfq = relationship("Rfq", back_populates="config")
