from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.bid import BidCreate, BidResponse
from app.services import bid_service

router = APIRouter(prefix="/api/rfqs", tags=["Bids"])


@router.post("/{rfq_id}/bids", response_model=BidResponse, status_code=status.HTTP_201_CREATED)
async def submit_quote(rfq_id: str, payload: BidCreate, db: Session = Depends(get_db)):
    result = await bid_service.submit_bid(
        db=db,
        rfq_id=rfq_id,
        supplier_id=payload.supplier_id,
        carrier_name=payload.carrier_name,
        freight_charges=payload.freight_charges,
        origin_charges=payload.origin_charges,
        destination_charges=payload.destination_charges,
        transit_time_days=payload.transit_time_days,
        quote_valid_until=payload.quote_valid_until,
    )
    return result
