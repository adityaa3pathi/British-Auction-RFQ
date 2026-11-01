import sys
from datetime import datetime, timezone, timedelta, date
from app.database import engine, SessionLocal, Base
from app.models.supplier import Supplier
from app.models.rfq import Rfq, AuctionConfig, RfqStatus, ExtensionTrigger
from app.models.bid import Bid
from app.models.event import AuctionEvent, AuctionEventType


def seed(force=False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if force:
            print("Clearing existing data...")
            db.query(AuctionEvent).delete()
            db.query(Bid).delete()
            db.query(AuctionConfig).delete()
            db.query(Rfq).delete()
            db.query(Supplier).delete()
            db.commit()
        elif db.query(Supplier).count() > 0 and db.query(Rfq).count() > 0:
            print("Database already contains data. Skipping seed.")
            return

        print("Seeding database...")
        now = datetime.now(timezone.utc)

        # 1. Suppliers
        suppliers_data = [
            {"name": "Maersk Logistics", "email": "quotes@maersk.com"},
            {"name": "CMA CGM Group", "email": "pricing@cmacgm.com"},
            {"name": "Hapag-Lloyd Ocean", "email": "bids@hapag-lloyd.com"},
            {"name": "MSC Mediterranean", "email": "freight@msc.com"},
            {"name": "Kuehne+Nagel Global", "email": "rfq@kuehne-nagel.com"},
        ]
        suppliers = []
        for s_data in suppliers_data:
            s = Supplier(name=s_data["name"], email=s_data["email"])
            db.add(s)
            suppliers.append(s)
        db.flush()

        sup_maersk = suppliers[0]
        sup_cma = suppliers[1]
        sup_hapag = suppliers[2]
        sup_msc = suppliers[3]
        sup_kn = suppliers[4]

        # 2. RFQ 1: Active, closing in 20 minutes (inside 20m trigger window for testing)
        rfq1_start = now - timedelta(minutes=15)
        rfq1_close = now + timedelta(minutes=20)
        rfq1_forced = now + timedelta(minutes=45)

        rfq1 = Rfq(
            reference_id="RFQ-2026-001",
            name="Shanghai to Rotterdam, 40ft High Cube",
            pickup_date=date(2026, 11, 25),
            is_british_auction=True,
            bid_start_time=rfq1_start,
            bid_close_time=rfq1_close,
            current_bid_close_time=rfq1_close,
            forced_bid_close_time=rfq1_forced,
            status=RfqStatus.ACTIVE,
            created_at=rfq1_start,
        )
        db.add(rfq1)
        db.flush()

        cfg1 = AuctionConfig(
            rfq_id=rfq1.id,
            trigger_window_minutes=20,
            extension_duration_minutes=5,
            extension_trigger=ExtensionTrigger.L1_RANK_CHANGE,
        )
        db.add(cfg1)

        # Initial bids for RFQ 1
        bid1_cma = Bid(
            rfq_id=rfq1.id,
            supplier_id=sup_cma.id,
            carrier_name="CMA CGM",
            freight_charges=1200.00,
            origin_charges=170.00,
            destination_charges=150.00,
            total_price=1520.00,
            transit_time_days=28,
            quote_valid_until=date(2026, 12, 15),
            created_at=now - timedelta(minutes=10),
        )
        db.add(bid1_cma)
        db.flush()

        bid1_maersk = Bid(
            rfq_id=rfq1.id,
            supplier_id=sup_maersk.id,
            carrier_name="Maersk Line",
            freight_charges=1150.00,
            origin_charges=150.00,
            destination_charges=150.00,
            total_price=1450.00,
            transit_time_days=26,
            quote_valid_until=date(2026, 12, 20),
            created_at=now - timedelta(minutes=5),
        )
        db.add(bid1_maersk)
        db.flush()

        rfq1.lowest_bid_id = bid1_maersk.id
        rfq1.lowest_bid_amount = 1450.00

        db.add(AuctionEvent(
            rfq_id=rfq1.id,
            event_type=AuctionEventType.AUCTION_CREATED.value,
            reason="British Auction initialized with 20m trigger window and 5m extension duration.",
            new_close_time=rfq1_close,
            created_at=rfq1_start,
        ))
        db.add(AuctionEvent(
            rfq_id=rfq1.id,
            event_type=AuctionEventType.AUCTION_STARTED.value,
            reason="Bidding started.",
            created_at=rfq1_start,
        ))
        db.add(AuctionEvent(
            rfq_id=rfq1.id,
            event_type=AuctionEventType.BID_SUBMITTED.value,
            bid_id=bid1_cma.id,
            supplier_id=sup_cma.id,
            reason=f"Quote of $1,520.00 submitted by {sup_cma.name}",
            created_at=now - timedelta(minutes=10),
        ))
        db.add(AuctionEvent(
            rfq_id=rfq1.id,
            event_type=AuctionEventType.BID_SUBMITTED.value,
            bid_id=bid1_maersk.id,
            supplier_id=sup_maersk.id,
            reason=f"Quote of $1,450.00 submitted by {sup_maersk.name} (New L1 Leader)",
            created_at=now - timedelta(minutes=5),
        ))

        # 3. RFQ 2: Active, Any Rank Change trigger
        rfq2_start = now - timedelta(minutes=15)
        rfq2_close = now + timedelta(minutes=45)
        rfq2_forced = now + timedelta(hours=2)

        rfq2 = Rfq(
            reference_id="RFQ-2026-002",
            name="Hamburg to New York, 20ft Standard Container",
            pickup_date=date(2026, 11, 30),
            is_british_auction=True,
            bid_start_time=rfq2_start,
            bid_close_time=rfq2_close,
            current_bid_close_time=rfq2_close,
            forced_bid_close_time=rfq2_forced,
            status=RfqStatus.ACTIVE,
            created_at=rfq2_start,
        )
        db.add(rfq2)
        db.flush()

        cfg2 = AuctionConfig(
            rfq_id=rfq2.id,
            trigger_window_minutes=15,
            extension_duration_minutes=10,
            extension_trigger=ExtensionTrigger.ANY_RANK_CHANGE,
        )
        db.add(cfg2)

        bid2_hapag = Bid(
            rfq_id=rfq2.id,
            supplier_id=sup_hapag.id,
            carrier_name="Hapag-Lloyd Express",
            freight_charges=900.00,
            origin_charges=120.00,
            destination_charges=130.00,
            total_price=1150.00,
            transit_time_days=14,
            quote_valid_until=date(2026, 12, 10),
            created_at=now - timedelta(minutes=10),
        )
        db.add(bid2_hapag)
        db.flush()
        rfq2.lowest_bid_id = bid2_hapag.id
        rfq2.lowest_bid_amount = 1150.00

        # 4. RFQ 3: Scheduled
        rfq3_start = now + timedelta(hours=2)
        rfq3_close = now + timedelta(hours=6)
        rfq3_forced = now + timedelta(hours=8)

        rfq3 = Rfq(
            reference_id="RFQ-2026-003",
            name="Singapore to Los Angeles, Reefer 40ft",
            pickup_date=date(2026, 12, 5),
            is_british_auction=True,
            bid_start_time=rfq3_start,
            bid_close_time=rfq3_close,
            current_bid_close_time=rfq3_close,
            forced_bid_close_time=rfq3_forced,
            status=RfqStatus.SCHEDULED,
            created_at=now,
        )
        db.add(rfq3)
        db.flush()

        cfg3 = AuctionConfig(
            rfq_id=rfq3.id,
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            extension_trigger=ExtensionTrigger.BID_RECEIVED,
        )
        db.add(cfg3)

        # 5. RFQ 4: Closed
        rfq4_start = now - timedelta(hours=5)
        rfq4_close = now - timedelta(hours=1)
        rfq4_forced = now + timedelta(hours=1)

        rfq4 = Rfq(
            reference_id="RFQ-2026-004",
            name="Dubai to Mumbai, 40ft General Cargo",
            pickup_date=date(2026, 11, 15),
            is_british_auction=True,
            bid_start_time=rfq4_start,
            bid_close_time=rfq4_close,
            current_bid_close_time=rfq4_close,
            forced_bid_close_time=rfq4_forced,
            status=RfqStatus.CLOSED,
            created_at=rfq4_start,
        )
        db.add(rfq4)
        db.flush()

        cfg4 = AuctionConfig(
            rfq_id=rfq4.id,
            trigger_window_minutes=15,
            extension_duration_minutes=5,
            extension_trigger=ExtensionTrigger.L1_RANK_CHANGE,
        )
        db.add(cfg4)

        db.commit()
        print("Database successfully seeded with realistic suppliers, active RFQs, and bids!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    force_flag = "--force" in sys.argv or "-f" in sys.argv
    seed(force=force_flag)
