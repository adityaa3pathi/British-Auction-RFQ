import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, Integer, Date, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Bid(Base):
    __tablename__ = "bids"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rfq_id = Column(String(36), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id = Column(String(36), ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, index=True)

    carrier_name = Column(String(150), nullable=False)
    freight_charges = Column(Numeric(14, 2), nullable=False)
    origin_charges = Column(Numeric(14, 2), default=0.0, nullable=False)
    destination_charges = Column(Numeric(14, 2), default=0.0, nullable=False)
    total_price = Column(Numeric(14, 2), nullable=False, index=True)

    transit_time_days = Column(Integer, nullable=False)
    quote_valid_until = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    rfq = relationship("Rfq", back_populates="bids")
    supplier = relationship("Supplier", back_populates="bids")
    events = relationship("AuctionEvent", back_populates="bid")


Index("idx_bids_rfq_supplier", Bid.rfq_id, Bid.supplier_id, Bid.created_at.desc())
