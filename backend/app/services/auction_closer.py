import asyncio
import logging
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models.rfq import Rfq, RfqStatus
from app.models.event import AuctionEvent, AuctionEventType
from app.services.event_hub import event_hub

logger = logging.getLogger("auction_closer")


async def run_auction_closer(tick_seconds: float = 1.0):
    """
    Background worker that runs every second to transition scheduled auctions to ACTIVE,
    and close expired active auctions (CLOSED or FORCE_CLOSED).
    """
    logger.info("British Auction Closer worker started.")
    while True:
        try:
            now = datetime.now(timezone.utc)
            with SessionLocal() as db:
                # 1. Activate scheduled auctions
                scheduled_rfqs = (
                    db.query(Rfq)
                    .filter(Rfq.status == RfqStatus.SCHEDULED, Rfq.bid_start_time <= now)
                    .all()
                )
                for rfq in scheduled_rfqs:
                    rfq.status = RfqStatus.ACTIVE
                    event = AuctionEvent(
                        rfq_id=rfq.id,
                        event_type=AuctionEventType.AUCTION_STARTED.value,
                        reason="Bidding period started; auction is now ACTIVE",
                        created_at=now,
                    )
                    db.add(event)
                    db.commit()
                    logger.info(f"Auction {rfq.reference_id} is now ACTIVE")
                    await event_hub.broadcast(rfq.id, "auction_started", {
                        "rfq_id": rfq.id,
                        "status": RfqStatus.ACTIVE.value,
                    })

                # 2. Expire active auctions
                active_rfqs = (
                    db.query(Rfq)
                    .filter(Rfq.status == RfqStatus.ACTIVE, Rfq.current_bid_close_time <= now)
                    .all()
                )
                for rfq in active_rfqs:
                    current_close = rfq.current_bid_close_time if rfq.current_bid_close_time.tzinfo else rfq.current_bid_close_time.replace(tzinfo=timezone.utc)
                    forced_close = rfq.forced_bid_close_time if rfq.forced_bid_close_time.tzinfo else rfq.forced_bid_close_time.replace(tzinfo=timezone.utc)

                    if current_close >= forced_close:
                        rfq.status = RfqStatus.FORCE_CLOSED
                        event_type = AuctionEventType.AUCTION_FORCE_CLOSED.value
                        reason = "Auction reached hard forced close ceiling; bidding is closed."
                    else:
                        rfq.status = RfqStatus.CLOSED
                        event_type = AuctionEventType.AUCTION_CLOSED.value
                        reason = "Auction deadline reached with no qualifying last-minute extensions."

                    event = AuctionEvent(
                        rfq_id=rfq.id,
                        event_type=event_type,
                        old_close_time=current_close,
                        new_close_time=current_close,
                        reason=reason,
                        created_at=now,
                    )
                    db.add(event)
                    db.commit()
                    logger.info(f"Auction {rfq.reference_id} {rfq.status.value}")
                    await event_hub.broadcast(rfq.id, "auction_closed", {
                        "rfq_id": rfq.id,
                        "status": rfq.status.value,
                        "reason": reason,
                    })

        except asyncio.CancelledError:
            logger.info("Auction Closer worker stopped.")
            break
        except Exception as e:
            logger.error(f"Error in auction closer loop: {e}", exc_info=True)

        await asyncio.sleep(tick_seconds)
