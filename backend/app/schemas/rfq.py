from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from app.models.rfq import ExtensionTrigger, RfqStatus


class AuctionConfigCreate(BaseModel):
    trigger_window_minutes: int = Field(gt=0, description="Trigger Window X (Minutes)")
    extension_duration_minutes: int = Field(gt=0, description="Extension Duration Y (Minutes)")
    extension_trigger: ExtensionTrigger = Field(description="Extension trigger rule")


class RfqCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200, json_schema_extra={"example": "Shanghai to Rotterdam 40ft HC"})
    reference_id: str = Field(min_length=2, max_length=50, json_schema_extra={"example": "RFQ-2026-001"})
    pickup_date: date
    bid_start_time: datetime
    bid_close_time: datetime
    forced_bid_close_time: datetime
    config: AuctionConfigCreate

    @field_validator("bid_close_time")
    @classmethod
    def validate_close_time(cls, v, info):
        start = info.data.get("bid_start_time")
        if start and v <= start:
            raise ValueError("Bid close time must be strictly after bid start time")
        return v

    @field_validator("forced_bid_close_time")
    @classmethod
    def validate_forced_close_time(cls, v, info):
        close = info.data.get("bid_close_time")
        if close and v <= close:
            raise ValueError("Forced bid close time must be strictly after bid close time")
        return v


class RfqConfigResponse(BaseModel):
    trigger_window_minutes: int
    extension_duration_minutes: int
    extension_trigger: str


class RfqListItem(BaseModel):
    id: str
    reference_id: str
    name: str
    pickup_date: str
    is_british_auction: bool
    status: str
    bid_start_time: str
    bid_close_time: str
    current_bid_close_time: str
    forced_bid_close_time: str
    lowest_bid_amount: Optional[float] = None
    bids_count: int
    config: Optional[RfqConfigResponse] = None


class RfqDetailResponse(BaseModel):
    id: str
    reference_id: str
    name: str
    pickup_date: str
    is_british_auction: bool
    status: str
    bid_start_time: str
    bid_close_time: str
    current_bid_close_time: str
    forced_bid_close_time: str
    server_time: str
    trigger_window_start: Optional[str] = None
    in_trigger_window: bool
    config: Optional[RfqConfigResponse] = None
    rankings: List[dict]
    lowest_bid_amount: Optional[float] = None
    all_bids: List[dict]
