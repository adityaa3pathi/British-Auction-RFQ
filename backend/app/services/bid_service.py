import json
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.rfq import Rfq, RfqStatus
from app.models.bid import Bid
from app.models.supplier import Supplier
from app.models.event import AuctionEvent, AuctionEventType
from app.services.ranking_service import compute_rankings
from app.services.auction_engine import evaluate_extension
from app.services.event_hub import event_hub


async def submit_bid(
    db: Session,
    rfq_id: str,
    supplier_id: str,
    carrier_name: str,
    freight_charges: float,
    origin_charges: float,
    destination_charges: float,
    transit_time_days: int,
    quote_valid_until: Any,
) -> Dict[str, Any]:
    # 1. Load RFQ
    rfq = db.query(Rfq).filter(Rfq.id == rfq_id).first()
    if not rfq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RFQ_NOT_FOUND", "message": f"RFQ {rfq_id} not found"},
        )

    # 2. Check Supplier
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SUPPLIER_NOT_FOUND", "message": f"Supplier {supplier_id} not found"},
        )

    # 3. Server-side authoritative clock check
    now = datetime.now(timezone.utc)

    # Ensure timezone awareness on model dates
    start_time = rfq.bid_start_time if rfq.bid_start_time.tzinfo else rfq.bid_start_time.replace(tzinfo=timezone.utc)
    current_close = rfq.current_bid_close_time if rfq.current_bid_close_time.tzinfo else rfq.current_bid_close_time.replace(tzinfo=timezone.utc)
    forced_close = rfq.forced_bid_close_time if rfq.forced_bid_close_time.tzinfo else rfq.forced_bid_close_time.replace(tzinfo=timezone.utc)

    # Check start time
    if now < start_time:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "AUCTION_NOT_STARTED", "message": f"Auction has not started yet (starts at {start_time.isoformat()})"},
        )

    # Lazy close check
    if now >= current_close or rfq.status in [RfqStatus.CLOSED, RfqStatus.FORCE_CLOSED]:
        new_status = RfqStatus.FORCE_CLOSED if current_close >= forced_close else RfqStatus.CLOSED
        if rfq.status != new_status:
            rfq.status = new_status
            db.commit()
            await event_hub.broadcast(rfq_id, "auction_closed", {"rfq_id": rfq_id, "status": new_status.value})
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "AUCTION_CLOSED", "message": "Auction is closed. No further bids can be accepted."},
        )

    # 4. Continuous lowering rule: check supplier's own prior bids on this RFQ
    latest_prior_bid = (
        db.query(Bid)
        .filter(Bid.rfq_id == rfq_id, Bid.supplier_id == supplier_id)
        .order_by(Bid.created_at.desc())
        .first()
    )

    new_total = round(float(freight_charges) + float(origin_charges) + float(destination_charges), 2)

    if latest_prior_bid and new_total >= float(latest_prior_bid.total_price):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "BID_NOT_LOWER",
                "message": (
                    f"Your bid (${new_total:,.2f}) must be strictly lower than your previous bid "
                    f"(${float(latest_prior_bid.total_price):,.2f})"
                ),
                "previous_bid": float(latest_prior_bid.total_price),
                "submitted_bid": new_total,
            },
        )

    # 5. Snapshot rankings before inserting the new bid
    ranks_before = compute_rankings(db, rfq_id)

    # 6. Insert new bid
    new_bid = Bid(
        rfq_id=rfq_id,
        supplier_id=supplier_id,
        carrier_name=carrier_name,
        freight_charges=freight_charges,
        origin_charges=origin_charges,
        destination_charges=destination_charges,
        total_price=new_total,
        transit_time_days=transit_time_days,
        quote_valid_until=quote_valid_until,
        created_at=now,
    )
    db.add(new_bid)
    db.flush()  # assign new_bid.id without committing transaction

    # 7. Snapshot rankings after inserting the new bid
    ranks_after = compute_rankings(db, rfq_id)

    # 8. Evaluate British Auction Extension
    extension_res = evaluate_extension(
        now=now,
        current_close=current_close,
        forced_close=forced_close,
        trigger_window_minutes=rfq.config.trigger_window_minutes,
        extension_duration_minutes=rfq.config.extension_duration_minutes,
        extension_trigger=rfq.config.extension_trigger,
        ranks_before=ranks_before,
        ranks_after=ranks_after,
    )

    old_close_iso = current_close.isoformat()
    extended = False
    new_close_iso = old_close_iso

    if extension_res.extend:
        extended = True
        rfq.current_bid_close_time = extension_res.new_close
        new_close_iso = extension_res.new_close.isoformat()

        # Log extension event
        ext_event = AuctionEvent(
            rfq_id=rfq_id,
            event_type=(
                AuctionEventType.EXTENSION_CAPPED.value
                if extension_res.capped
                else AuctionEventType.EXTENSION_APPLIED.value
            ),
            bid_id=new_bid.id,
            supplier_id=supplier_id,
            old_close_time=current_close,
            new_close_time=extension_res.new_close,
            reason=extension_res.reason,
            metadata_json=json.dumps({
                "ranks_before": ranks_before,
                "ranks_after": ranks_after,
                "capped": extension_res.capped,
            }),
            created_at=now,
        )
        db.add(ext_event)

    # Update RFQ lowest bid cache
    if ranks_after:
        rfq.lowest_bid_id = ranks_after[0]["bid_id"]
        rfq.lowest_bid_amount = ranks_after[0]["total_price"]

    # Log bid submission event
    bid_event = AuctionEvent(
        rfq_id=rfq_id,
        event_type=AuctionEventType.BID_SUBMITTED.value,
        bid_id=new_bid.id,
        supplier_id=supplier_id,
        reason=f"Quote of ${new_total:,.2f} submitted by {supplier.name} ({carrier_name})",
        metadata_json=json.dumps({"total_price": new_total, "carrier": carrier_name}),
        created_at=now,
    )
    db.add(bid_event)

    db.commit()
    db.refresh(new_bid)

    # 9. Real-time SSE Broadcast
    broadcast_payload = {
        "rfq_id": rfq_id,
        "bid": {
            "id": new_bid.id,
            "supplier_id": supplier_id,
            "supplier_name": supplier.name,
            "carrier_name": carrier_name,
            "total_price": new_total,
            "created_at": now.isoformat(),
        },
        "rankings": ranks_after,
        "current_bid_close_time": new_close_iso,
        "extended": extended,
        "extension_reason": extension_res.reason if extended else None,
    }
    await event_hub.broadcast(rfq_id, "bid_submitted", broadcast_payload)

    if extended:
        await event_hub.broadcast(rfq_id, "auction_extended", {
            "rfq_id": rfq_id,
            "old_close_time": old_close_iso,
            "new_close_time": new_close_iso,
            "reason": extension_res.reason,
            "capped": extension_res.capped,
        })

    return {
        "bid_id": new_bid.id,
        "rfq_id": rfq_id,
        "supplier_id": supplier_id,
        "total_price": new_total,
        "extended": extended,
        "old_bid_close_time": old_close_iso,
        "current_bid_close_time": new_close_iso,
        "extension_reason": extension_res.reason,
        "rankings": ranks_after,
    }
