from typing import Optional
from pydantic import BaseModel


class EventResponse(BaseModel):
    id: str
    event_type: str
    bid_id: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    old_close_time: Optional[str] = None
    new_close_time: Optional[str] = None
    reason: str
    created_at: str
