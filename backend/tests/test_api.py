from datetime import datetime, timezone, timedelta, date
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_list_rfqs():
    response = client.get("/api/rfqs")
    assert response.status_code == 200
    rfqs = response.json()
    assert isinstance(rfqs, list)
    assert len(rfqs) >= 1


def test_create_and_bid_flow():
    now = datetime.now(timezone.utc)
    # Create an active RFQ
    rfq_payload = {
        "name": "Integration Test Lane, 40ft",
        "reference_id": f"TEST-RFQ-{int(now.timestamp())}",
        "pickup_date": str(date(2026, 12, 1)),
        "bid_start_time": (now - timedelta(minutes=5)).isoformat(),
        "bid_close_time": (now + timedelta(minutes=5)).isoformat(),
        "forced_bid_close_time": (now + timedelta(minutes=20)).isoformat(),
        "config": {
            "trigger_window_minutes": 10,
            "extension_duration_minutes": 5,
            "extension_trigger": "BID_RECEIVED",
        },
    }

    create_res = client.post("/api/rfqs", json=rfq_payload)
    assert create_res.status_code == 201
    rfq_data = create_res.json()
    rfq_id = rfq_data["id"]

    # Fetch suppliers
    sup_res = client.get("/api/suppliers")
    assert sup_res.status_code == 200
    suppliers = sup_res.json()
    assert len(suppliers) >= 2
    supplier1 = suppliers[0]
    supplier2 = suppliers[1]

    # Submit first bid from Supplier 1
    bid1_payload = {
        "supplier_id": supplier1["id"],
        "carrier_name": "Test Ocean Line",
        "freight_charges": 1000.0,
        "origin_charges": 100.0,
        "destination_charges": 100.0,
        "transit_time_days": 20,
        "quote_valid_until": "2026-12-31",
    }
    bid1_res = client.post(f"/api/rfqs/{rfq_id}/bids", json=bid1_payload)
    assert bid1_res.status_code == 201
    data1 = bid1_res.json()
    assert data1["extended"] is True  # In 10 min window, trigger=BID_RECEIVED
    assert data1["total_price"] == 1200.0

    # Submit higher bid from same Supplier 1 -> MUST FAIL with BID_NOT_LOWER
    bid_fail_payload = {
        "supplier_id": supplier1["id"],
        "carrier_name": "Test Ocean Line",
        "freight_charges": 1100.0,
        "origin_charges": 100.0,
        "destination_charges": 100.0,
        "transit_time_days": 20,
        "quote_valid_until": "2026-12-31",
    }
    fail_res = client.post(f"/api/rfqs/{rfq_id}/bids", json=bid_fail_payload)
    assert fail_res.status_code == 409
    assert fail_res.json()["detail"]["code"] == "BID_NOT_LOWER"

    # Supplier 2 underbids Supplier 1
    bid2_payload = {
        "supplier_id": supplier2["id"],
        "carrier_name": "Speedy Carrier",
        "freight_charges": 900.0,
        "origin_charges": 100.0,
        "destination_charges": 50.0,
        "transit_time_days": 18,
        "quote_valid_until": "2026-12-31",
    }
    bid2_res = client.post(f"/api/rfqs/{rfq_id}/bids", json=bid2_payload)
    assert bid2_res.status_code == 201
    data2 = bid2_res.json()
    assert data2["total_price"] == 1050.0
    # Supplier 2 should now be L1
    assert data2["rankings"][0]["supplier_id"] == supplier2["id"]
    assert data2["rankings"][0]["rank_label"] == "L1"

    # Check RFQ activity log
    events_res = client.get(f"/api/rfqs/{rfq_id}/events")
    assert events_res.status_code == 200
    events = events_res.json()
    assert len(events) >= 3  # AUCTION_CREATED, BID_SUBMITTED x 2, EXTENSION_APPLIED
