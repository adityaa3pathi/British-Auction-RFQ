from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field


class BidCreate(BaseModel):
    supplier_id: str
    carrier_name: str = Field(min_length=1, max_length=150, json_schema_extra={"example": "Maersk Line"})
    freight_charges: float = Field(ge=0, json_schema_extra={"example": 1200.00})
    origin_charges: float = Field(default=0.0, ge=0, json_schema_extra={"example": 150.00})
    destination_charges: float = Field(default=0.0, ge=0, json_schema_extra={"example": 200.00})
    transit_time_days: int = Field(gt=0, json_schema_extra={"example": 28})
    quote_valid_until: date


class BidResponse(BaseModel):
    bid_id: str
    rfq_id: str
    supplier_id: str
    total_price: float
    extended: bool
    old_bid_close_time: str
    current_bid_close_time: str
    extension_reason: str
    rankings: List[dict]
