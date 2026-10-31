from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.bid import Bid
from app.models.supplier import Supplier


def get_latest_supplier_bids(db: Session, rfq_id: str) -> List[Bid]:
    """
    Returns each supplier's latest bid for a given RFQ.
    Sorted by total_price ASC, created_at ASC.
    """
    all_bids = (
        db.query(Bid)
        .filter(Bid.rfq_id == rfq_id)
        .order_by(Bid.created_at.desc())
        .all()
    )

    # Keep only the latest bid per supplier
    seen_suppliers = set()
    latest_bids = []
    for b in all_bids:
        if b.supplier_id not in seen_suppliers:
            seen_suppliers.add(b.supplier_id)
            latest_bids.append(b)

    # Sort according to British Auction rules: lowest total price first, earlier bid breaks tie
    latest_bids.sort(key=lambda x: (float(x.total_price), x.created_at))
    return latest_bids


def compute_rankings(db: Session, rfq_id: str) -> List[Dict[str, Any]]:
    """
    Computes ranking snapshot: L1, L2, L3...
    """
    latest_bids = get_latest_supplier_bids(db, rfq_id)
    rankings = []
    for idx, bid in enumerate(latest_bids, start=1):
        rankings.append({
            "rank": idx,
            "rank_label": f"L{idx}",
            "supplier_id": bid.supplier_id,
            "supplier_name": bid.supplier.name if bid.supplier else "Unknown",
            "bid_id": bid.id,
            "carrier_name": bid.carrier_name,
            "freight_charges": float(bid.freight_charges),
            "origin_charges": float(bid.origin_charges),
            "destination_charges": float(bid.destination_charges),
            "total_price": float(bid.total_price),
            "transit_time_days": bid.transit_time_days,
            "quote_valid_until": str(bid.quote_valid_until),
            "created_at": bid.created_at.isoformat(),
        })
    return rankings
