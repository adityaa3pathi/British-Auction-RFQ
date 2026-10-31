import asyncio
import json
from typing import Dict, Set
from datetime import datetime, timezone


class EventHub:
    """
    In-memory pub/sub broker for Server-Sent Events (SSE).
    Allows live real-time pushing of bids, timer extensions, and status closures.
    """
    def __init__(self):
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, rfq_id: str) -> asyncio.Queue:
        queue = asyncio.Queue()
        async with self._lock:
            if rfq_id not in self._subscribers:
                self._subscribers[rfq_id] = set()
            self._subscribers[rfq_id].add(queue)
        return queue

    async def unsubscribe(self, rfq_id: str, queue: asyncio.Queue):
        async with self._lock:
            if rfq_id in self._subscribers:
                self._subscribers[rfq_id].discard(queue)
                if not self._subscribers[rfq_id]:
                    del self._subscribers[rfq_id]

    async def broadcast(self, rfq_id: str, event_type: str, data: dict):
        payload = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        raw_message = f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"

        async with self._lock:
            subscribers = list(self._subscribers.get(rfq_id, []))

        for queue in subscribers:
            try:
                await queue.put(raw_message)
            except Exception:
                pass


event_hub = EventHub()
