from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app.models.rfq import ExtensionTrigger


@dataclass
class ExtensionResult:
    extend: bool
    capped: bool
    new_close: datetime
    reason: str


def evaluate_extension(
    now: datetime,
    current_close: datetime,
    forced_close: datetime,
    trigger_window_minutes: int,
    extension_duration_minutes: int,
    extension_trigger: str,
    ranks_before: List[Dict[str, Any]],
    ranks_after: List[Dict[str, Any]],
) -> ExtensionResult:
    """
    Pure decision function for British Auction extension evaluation.
    Kept free of database I/O to ensure fast, deterministic unit testing.
    """
    # 1. Trigger window: [current_close - X minutes, current_close)
    window_start = current_close - timedelta(minutes=trigger_window_minutes)
    in_window = window_start <= now < current_close

    if not in_window:
        return ExtensionResult(
            extend=False,
            capped=False,
            new_close=current_close,
            reason=f"Bid placed outside trigger window ({trigger_window_minutes}m before close)",
        )

    # 2. Check trigger condition
    trigger_str = str(extension_trigger).upper()
    fired = False
    trigger_details = ""

    if "BID_RECEIVED" in trigger_str:
        fired = True
        trigger_details = "New bid received during trigger window"

    elif "ANY_RANK_CHANGE" in trigger_str:
        if not ranks_before and ranks_after:
            fired = True
            trigger_details = "First competitive bid placed, establishing initial rank"
        else:
            # Check if any supplier who previously had a rank changed position
            prev_ranks = {r["supplier_id"]: r["rank"] for r in ranks_before}
            rank_changed = False
            for curr in ranks_after:
                sup_id = curr["supplier_id"]
                if sup_id in prev_ranks and prev_ranks[sup_id] != curr["rank"]:
                    rank_changed = True
                    break
            fired = rank_changed
            trigger_details = "Supplier ranking shifted during trigger window" if fired else "No existing supplier rank changed"

    elif "L1_RANK_CHANGE" in trigger_str:
        l1_before = ranks_before[0]["supplier_id"] if ranks_before else None
        l1_after = ranks_after[0]["supplier_id"] if ranks_after else None
        fired = (l1_before != l1_after)
        trigger_details = "L1 lowest bidder changed during trigger window" if fired else "L1 lowest bidder remained unchanged"

    if not fired:
        return ExtensionResult(
            extend=False,
            capped=False,
            new_close=current_close,
            reason=f"Trigger condition not met ({trigger_details})",
        )

    # 3. Calculate extension bounded by forced close time
    proposed_close = current_close + timedelta(minutes=extension_duration_minutes)

    if proposed_close > forced_close:
        # Ceiling reached
        if current_close >= forced_close:
            return ExtensionResult(
                extend=False,
                capped=True,
                new_close=forced_close,
                reason="Auction already at hard forced close ceiling; no further extension permitted",
            )
        else:
            return ExtensionResult(
                extend=True,
                capped=True,
                new_close=forced_close,
                reason=f"{trigger_details} - Extended to hard forced close ceiling ({forced_close.isoformat()})",
            )

    return ExtensionResult(
        extend=True,
        capped=False,
        new_close=proposed_close,
        reason=f"{trigger_details} - Auction extended by {extension_duration_minutes} minutes",
    )
