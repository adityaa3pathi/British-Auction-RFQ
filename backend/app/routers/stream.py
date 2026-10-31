import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from app.services.event_hub import event_hub

router = APIRouter(prefix="/api/rfqs", tags=["Stream"])


@router.get("/{rfq_id}/stream")
async def stream_rfq_events(rfq_id: str, request: Request):
    """
    Server-Sent Events (SSE) endpoint.
    Sends live updates to clients whenever bids are placed, close times are extended,
    or auctions are closed.
    """
    queue = await event_hub.subscribe(rfq_id)

    async def event_generator():
        try:
            # Send initial ping to establish connection immediately
            yield f"event: connected\ndata: {{\"connected\": true, \"rfq_id\": \"{rfq_id}\"}}\n\n"
            while True:
                # Check for client disconnect
                if await request.is_disconnected():
                    break
                try:
                    # Wait for next event with a periodic heartbeat
                    message = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield message
                except asyncio.TimeoutError:
                    # Send comment heartbeat to keep connection alive
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            await event_hub.unsubscribe(rfq_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
