import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class AuctionEventType(str, enum.Enum):
    AUCTION_CREATED = "AUCTION_CREATED"
    AUCTION_STARTED = "AUCTION_STARTED"
    BID_SUBMITTED = "BID_SUBMITTED"
    RANK_CHANGED = "RANK_CHANGED"
    EXTENSION_APPLIED = "EXTENSION_APPLIED"
    EXTENSION_CAPPED = "EXTENSION_CAPPED"
    AUCTION_CLOSED = "AUCTION_CLOSED"
    AUCTION_FORCE_CLOSED = "AUCTION_FORCE_CLOSED"


class AuctionEvent(Base):
    __tablename__ = "auction_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rfq_id = Column(String(36), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    bid_id = Column(String(36), ForeignKey("bids.id", ondelete="SET NULL"), nullable=True)
    supplier_id = Column(String(36), ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)

    old_close_time = Column(DateTime(timezone=True), nullable=True)
    new_close_time = Column(DateTime(timezone=True), nullable=True)
    reason = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    rfq = relationship("Rfq", back_populates="events")
    bid = relationship("Bid", back_populates="events")
    supplier = relationship("Supplier", back_populates="events")
