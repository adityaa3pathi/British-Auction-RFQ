from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.rfq import Rfq, AuctionConfig, RfqStatus, ExtensionTrigger
from app.models.event import AuctionEvent, AuctionEventType
from app.services.ranking_service import compute_rankings


def create_rfq(
    db: Session,
    reference_id: str,
    name: str,
    pickup_date: Any,
    bid_start_time: datetime,
    bid_close_time: datetime,
    forced_bid_close_time: datetime,
    trigger_window_minutes: int,
    extension_duration_minutes: int,
    extension_trigger: ExtensionTrigger,
) -> Rfq:
    # 1. Validation checks
    if bid_close_time <= bid_start_time:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_CLOSE_TIME", "message": "Bid close time must be strictly after bid start time"},
        )

    if forced_bid_close_time <= bid_close_time:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_FORCED_CLOSE_TIME", "message": "Forced bid close time must be strictly after bid close time"},
        )

    if trigger_window_minutes <= 0 or extension_duration_minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_AUCTION_CONFIG", "message": "Trigger window and extension duration must be greater than zero"},
        )

    # Check unique reference ID
    existing = db.query(Rfq).filter(Rfq.reference_id == reference_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "REFERENCE_ID_EXISTS", "message": f"Reference ID '{reference_id}' already exists"},
        )

    now = datetime.now(timezone.utc)
    start_utc = bid_start_time if bid_start_time.tzinfo else bid_start_time.replace(tzinfo=timezone.utc)
    close_utc = bid_close_time if bid_close_time.tzinfo else bid_close_time.replace(tzinfo=timezone.utc)
    forced_utc = forced_bid_close_time if forced_bid_close_time.tzinfo else forced_bid_close_time.replace(tzinfo=timezone.utc)

    # Compute initial status
    if now >= forced_utc:
        initial_status = RfqStatus.FORCE_CLOSED
    elif now >= close_utc:
        initial_status = RfqStatus.CLOSED
    elif now >= start_utc:
        initial_status = RfqStatus.ACTIVE
    else:
        initial_status = RfqStatus.SCHEDULED

    rfq = Rfq(
        reference_id=reference_id,
        name=name,
        pickup_date=pickup_date,
        is_british_auction=True,
        bid_start_time=start_utc,
        bid_close_time=close_utc,
        current_bid_close_time=close_utc,
        forced_bid_close_time=forced_utc,
        status=initial_status,
        created_at=now,
    )
    db.add(rfq)
    db.flush()

    config = AuctionConfig(
        rfq_id=rfq.id,
        trigger_window_minutes=trigger_window_minutes,
        extension_duration_minutes=extension_duration_minutes,
        extension_trigger=extension_trigger,
    )
    db.add(config)

    # Log creation event
    event = AuctionEvent(
        rfq_id=rfq.id,
        event_type=AuctionEventType.AUCTION_CREATED.value,
        reason=(
            f"British Auction initialized. Trigger window: {trigger_window_minutes}m, "
            f"Extension: {extension_duration_minutes}m, Rule: {extension_trigger.value}"
        ),
        old_close_time=None,
        new_close_time=close_utc,
        created_at=now,
    )
    db.add(event)

    db.commit()
    db.refresh(rfq)
    return rfq


def list_rfqs(
    db: Session,
    status_filter: Optional[str] = None,
    query: Optional[str] = None,
) -> List[Dict[str, Any]]:
    # Lazy status refresh for accuracy
    now = datetime.now(timezone.utc)
    all_rfqs = db.query(Rfq).all()
    status_changed = False

    for rfq in all_rfqs:
        start_utc = rfq.bid_start_time if rfq.bid_start_time.tzinfo else rfq.bid_start_time.replace(tzinfo=timezone.utc)
        current_close_utc = rfq.current_bid_close_time if rfq.current_bid_close_time.tzinfo else rfq.current_bid_close_time.replace(tzinfo=timezone.utc)
        forced_utc = rfq.forced_bid_close_time if rfq.forced_bid_close_time.tzinfo else rfq.forced_bid_close_time.replace(tzinfo=timezone.utc)

        if rfq.status == RfqStatus.SCHEDULED and now >= start_utc:
            rfq.status = RfqStatus.ACTIVE
            status_changed = True
        elif rfq.status == RfqStatus.ACTIVE and now >= current_close_utc:
            rfq.status = RfqStatus.FORCE_CLOSED if current_close_utc >= forced_utc else RfqStatus.CLOSED
            status_changed = True

    if status_changed:
        db.commit()

    q = db.query(Rfq)
    if query:
        search_pattern = f"%{query}%"
        q = q.filter(or_(Rfq.name.ilike(search_pattern), Rfq.reference_id.ilike(search_pattern)))

    if status_filter and status_filter.upper() != "ALL":
        try:
            status_enum = RfqStatus(status_filter.upper())
            q = q.filter(Rfq.status == status_enum)
        except ValueError:
            pass

    rfqs = q.order_by(Rfq.created_at.desc()).all()

    result = []
    for r in rfqs:
        result.append({
            "id": r.id,
            "reference_id": r.reference_id,
            "name": r.name,
            "pickup_date": str(r.pickup_date),
            "is_british_auction": r.is_british_auction,
            "status": r.status.value,
            "bid_start_time": r.bid_start_time.isoformat(),
            "bid_close_time": r.bid_close_time.isoformat(),
            "current_bid_close_time": r.current_bid_close_time.isoformat(),
            "forced_bid_close_time": r.forced_bid_close_time.isoformat(),
            "lowest_bid_amount": float(r.lowest_bid_amount) if r.lowest_bid_amount is not None else None,
            "bids_count": len(r.bids),
            "config": {
                "trigger_window_minutes": r.config.trigger_window_minutes,
                "extension_duration_minutes": r.config.extension_duration_minutes,
                "extension_trigger": r.config.extension_trigger.value,
            } if r.config else None,
        })
    return result


def get_rfq_details(db: Session, rfq_id: str) -> Dict[str, Any]:
    rfq = db.query(Rfq).filter(Rfq.id == rfq_id).first()
    if not rfq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RFQ_NOT_FOUND", "message": f"RFQ {rfq_id} not found"},
        )

    # Lazy status check
    now = datetime.now(timezone.utc)
    start_utc = rfq.bid_start_time if rfq.bid_start_time.tzinfo else rfq.bid_start_time.replace(tzinfo=timezone.utc)
    current_close_utc = rfq.current_bid_close_time if rfq.current_bid_close_time.tzinfo else rfq.current_bid_close_time.replace(tzinfo=timezone.utc)
    forced_utc = rfq.forced_bid_close_time if rfq.forced_bid_close_time.tzinfo else rfq.forced_bid_close_time.replace(tzinfo=timezone.utc)

    if rfq.status == RfqStatus.SCHEDULED and now >= start_utc:
        rfq.status = RfqStatus.ACTIVE
        db.commit()
    elif rfq.status == RfqStatus.ACTIVE and now >= current_close_utc:
        rfq.status = RfqStatus.FORCE_CLOSED if current_close_utc >= forced_utc else RfqStatus.CLOSED
        db.commit()

    rankings = compute_rankings(db, rfq_id)

    # Trigger window calculation
    window_start = current_close_utc - (
        datetime.fromtimestamp(0, tz=timezone.utc) - datetime.fromtimestamp(0, tz=timezone.utc)
    )
    if rfq.config:
        from datetime import timedelta
        window_start = current_close_utc - timedelta(minutes=rfq.config.trigger_window_minutes)

    in_trigger_window = (window_start <= now < current_close_utc) if rfq.status == RfqStatus.ACTIVE else False

    return {
        "id": rfq.id,
        "reference_id": rfq.reference_id,
        "name": rfq.name,
        "pickup_date": str(rfq.pickup_date),
        "is_british_auction": rfq.is_british_auction,
        "status": rfq.status.value,
        "bid_start_time": rfq.bid_start_time.isoformat(),
        "bid_close_time": rfq.bid_close_time.isoformat(),
        "current_bid_close_time": rfq.current_bid_close_time.isoformat(),
        "forced_bid_close_time": rfq.forced_bid_close_time.isoformat(),
        "server_time": now.isoformat(),
        "trigger_window_start": window_start.isoformat() if rfq.config else None,
        "in_trigger_window": in_trigger_window,
        "config": {
            "trigger_window_minutes": rfq.config.trigger_window_minutes,
            "extension_duration_minutes": rfq.config.extension_duration_minutes,
            "extension_trigger": rfq.config.extension_trigger.value,
        } if rfq.config else None,
        "rankings": rankings,
        "lowest_bid_amount": float(rfq.lowest_bid_amount) if rfq.lowest_bid_amount is not None else None,
        "all_bids": [
            {
                "id": b.id,
                "supplier_id": b.supplier_id,
                "supplier_name": b.supplier.name if b.supplier else "Unknown",
                "carrier_name": b.carrier_name,
                "freight_charges": float(b.freight_charges),
                "origin_charges": float(b.origin_charges),
                "destination_charges": float(b.destination_charges),
                "total_price": float(b.total_price),
                "transit_time_days": b.transit_time_days,
                "quote_valid_until": str(b.quote_valid_until),
                "created_at": b.created_at.isoformat(),
            }
            for b in rfq.bids
        ],
    }


def get_rfq_events(db: Session, rfq_id: str) -> List[Dict[str, Any]]:
    events = (
        db.query(AuctionEvent)
        .filter(AuctionEvent.rfq_id == rfq_id)
        .order_by(AuctionEvent.created_at.desc())
        .all()
    )
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "bid_id": e.bid_id,
            "supplier_id": e.supplier_id,
            "supplier_name": e.supplier.name if e.supplier else None,
            "old_close_time": e.old_close_time.isoformat() if e.old_close_time else None,
            "new_close_time": e.new_close_time.isoformat() if e.new_close_time else None,
            "reason": e.reason,
            "created_at": e.created_at.isoformat(),
        }
        for e in events
    ]
