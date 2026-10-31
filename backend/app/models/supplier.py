import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False)
    email = Column(String(200), unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    bids = relationship("Bid", back_populates="supplier", cascade="all, delete-orphan")
    events = relationship("AuctionEvent", back_populates="supplier")
