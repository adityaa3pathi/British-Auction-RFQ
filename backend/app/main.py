import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import rfqs, bids, suppliers, stream
from app.services.auction_closer import run_auction_closer


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # Start background auction status monitor
    closer_task = asyncio.create_task(run_auction_closer(settings.WORKER_TICK_SECONDS))

    yield

    # Shutdown
    closer_task.cancel()
    try:
        await closer_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="British Auction RFQ Engine with dynamic bidding extensions and forced close rules.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(rfqs.router)
app.include_router(bids.router)
app.include_router(suppliers.router)
app.include_router(stream.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "British Auction RFQ API is running",
        "docs": "/docs",
        "health": "/api/health",
    }
