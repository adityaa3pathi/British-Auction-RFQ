from datetime import datetime, timezone, timedelta
import pytest
from app.services.auction_engine import evaluate_extension


@pytest.fixture
def base_times():
    now = datetime(2026, 11, 10, 17, 55, 0, tzinfo=timezone.utc)
    current_close = datetime(2026, 11, 10, 18, 0, 0, tzinfo=timezone.utc)
    forced_close = datetime(2026, 11, 10, 18, 15, 0, tzinfo=timezone.utc)
    return {"now": now, "current_close": current_close, "forced_close": forced_close}


def test_bid_outside_trigger_window(base_times):
    # Window is 10 mins (17:50 to 18:00). Bid is placed at 17:40
    early_bid_time = datetime(2026, 11, 10, 17, 40, 0, tzinfo=timezone.utc)
    res = evaluate_extension(
        now=early_bid_time,
        current_close=base_times["current_close"],
        forced_close=base_times["forced_close"],
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger="BID_RECEIVED",
        ranks_before=[],
        ranks_after=[{"supplier_id": "sup-1", "rank": 1}],
    )
    assert res.extend is False
    assert "outside trigger window" in res.reason


def test_trigger_bid_received_extends(base_times):
    # Bid at 17:55 (inside 10 min window) with BID_RECEIVED trigger
    res = evaluate_extension(
        now=base_times["now"],
        current_close=base_times["current_close"],
        forced_close=base_times["forced_close"],
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger="BID_RECEIVED",
        ranks_before=[],
        ranks_after=[{"supplier_id": "sup-1", "rank": 1}],
    )
    assert res.extend is True
    assert res.capped is False
    # Extended from 18:00 to 18:05
    assert res.new_close == datetime(2026, 11, 10, 18, 5, 0, tzinfo=timezone.utc)


def test_trigger_l1_rank_change_when_leader_changes(base_times):
    # Supplier B takes over L1 from Supplier A
    ranks_before = [
        {"supplier_id": "sup-a", "rank": 1},
        {"supplier_id": "sup-b", "rank": 2},
    ]
    ranks_after = [
        {"supplier_id": "sup-b", "rank": 1},
        {"supplier_id": "sup-a", "rank": 2},
    ]

    res = evaluate_extension(
        now=base_times["now"],
        current_close=base_times["current_close"],
        forced_close=base_times["forced_close"],
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger="L1_RANK_CHANGE",
        ranks_before=ranks_before,
        ranks_after=ranks_after,
    )
    assert res.extend is True
    assert res.new_close == datetime(2026, 11, 10, 18, 5, 0, tzinfo=timezone.utc)


def test_trigger_l1_rank_change_ignores_non_l1_bid(base_times):
    # Supplier C underbids Supplier B, but Supplier A is still L1
    ranks_before = [
        {"supplier_id": "sup-a", "rank": 1},
        {"supplier_id": "sup-b", "rank": 2},
    ]
    ranks_after = [
        {"supplier_id": "sup-a", "rank": 1},
        {"supplier_id": "sup-c", "rank": 2},
        {"supplier_id": "sup-b", "rank": 3},
    ]

    res = evaluate_extension(
        now=base_times["now"],
        current_close=base_times["current_close"],
        forced_close=base_times["forced_close"],
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger="L1_RANK_CHANGE",
        ranks_before=ranks_before,
        ranks_after=ranks_after,
    )
    assert res.extend is False
    assert "Trigger condition not met" in res.reason


def test_trigger_any_rank_change_fires_on_mid_table_shift(base_times):
    # Supplier C jumps over Supplier B (2 <-> 3), L1 unchanged
    ranks_before = [
        {"supplier_id": "sup-a", "rank": 1},
        {"supplier_id": "sup-b", "rank": 2},
        {"supplier_id": "sup-c", "rank": 3},
    ]
    ranks_after = [
        {"supplier_id": "sup-a", "rank": 1},
        {"supplier_id": "sup-c", "rank": 2},
        {"supplier_id": "sup-b", "rank": 3},
    ]

    res = evaluate_extension(
        now=base_times["now"],
        current_close=base_times["current_close"],
        forced_close=base_times["forced_close"],
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger="ANY_RANK_CHANGE",
        ranks_before=ranks_before,
        ranks_after=ranks_after,
    )
    assert res.extend is True
    assert res.new_close == datetime(2026, 11, 10, 18, 5, 0, tzinfo=timezone.utc)


def test_extension_capped_at_forced_close_ceiling():
    # Current close is 18:12, forced close is 18:15.
    # Extension duration is 5 mins (proposed: 18:17 > forced: 18:15).
    now = datetime(2026, 11, 10, 18, 10, 0, tzinfo=timezone.utc)
    current_close = datetime(2026, 11, 10, 18, 12, 0, tzinfo=timezone.utc)
    forced_close = datetime(2026, 11, 10, 18, 15, 0, tzinfo=timezone.utc)

    res = evaluate_extension(
        now=now,
        current_close=current_close,
        forced_close=forced_close,
        trigger_window_minutes=5,
        extension_duration_minutes=5,
        extension_trigger="BID_RECEIVED",
        ranks_before=[],
        ranks_after=[{"supplier_id": "sup-1", "rank": 1}],
    )
    assert res.extend is True
    assert res.capped is True
    assert res.new_close == forced_close  # Exactly 18:15:00


def test_extension_when_already_at_forced_close():
    # Auction close already equal to forced close. Cannot extend.
    forced_close = datetime(2026, 11, 10, 18, 15, 0, tzinfo=timezone.utc)
    now = datetime(2026, 11, 10, 18, 14, 0, tzinfo=timezone.utc)

    res = evaluate_extension(
        now=now,
        current_close=forced_close,
        forced_close=forced_close,
        trigger_window_minutes=5,
        extension_duration_minutes=5,
        extension_trigger="BID_RECEIVED",
        ranks_before=[],
        ranks_after=[{"supplier_id": "sup-1", "rank": 1}],
    )
    assert res.extend is False
    assert res.capped is True
    assert res.new_close == forced_close
