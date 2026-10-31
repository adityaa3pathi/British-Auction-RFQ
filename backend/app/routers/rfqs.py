from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.rfq import RfqCreate, RfqListItem, RfqDetailResponse
from app.schemas.event import EventResponse
from app.services import rfq_service

router = APIRouter(prefix="/api/rfqs", tags=["RFQs"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_new_rfq(payload: RfqCreate, db: Session = Depends(get_db)):
    created = rfq_service.create_rfq(
        db=db,
        reference_id=payload.reference_id,
        name=payload.name,
        pickup_date=payload.pickup_date,
        bid_start_time=payload.bid_start_time,
        bid_close_time=payload.bid_close_time,
        forced_bid_close_time=payload.forced_bid_close_time,
        trigger_window_minutes=payload.config.trigger_window_minutes,
        extension_duration_minutes=payload.config.extension_duration_minutes,
        extension_trigger=payload.config.extension_trigger,
    )
    return {"id": created.id, "reference_id": created.reference_id, "status": created.status.value}


@router.get("", response_model=List[RfqListItem])
def list_all_rfqs(
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, SCHEDULED, CLOSED, FORCE_CLOSED, ALL"),
    q: Optional[str] = Query(None, description="Search query by name or reference ID"),
    db: Session = Depends(get_db),
):
    return rfq_service.list_rfqs(db=db, status_filter=status, query=q)


@router.get("/{rfq_id}", response_model=RfqDetailResponse)
def get_rfq_by_id(rfq_id: str, db: Session = Depends(get_db)):
    return rfq_service.get_rfq_details(db=db, rfq_id=rfq_id)


@router.get("/{rfq_id}/events", response_model=List[EventResponse])
def get_rfq_activity_log(rfq_id: str, db: Session = Depends(get_db)):
    return rfq_service.get_rfq_events(db=db, rfq_id=rfq_id)
