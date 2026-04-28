"""
FastAPI main application setup.

This is the entry point for the GymChad API.
It creates the FastAPI app, adds middleware, and includes routes.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

try:
    from app.api import api_router
    api_available = True
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"Could not load API routes: {e}")
    api_available = False

try:
    from app.core import UserContextMiddleware
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"Could not load UserContextMiddleware: {e}")
    UserContextMiddleware = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Lifespan events (startup/shutdown)
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle.
    
    Code before yield runs on startup.
    Code after yield runs on shutdown.
    """
    logger.info("🚀 GymChad API starting up...")
    yield
    logger.info("🛑 GymChad API shutting down...")


# Create FastAPI app instance
app = FastAPI(
    title="GymChad API",
    description="AI-powered gym tracking and coaching API",
    version="1.0.0",
    docs_url="/api/docs",  # Swagger UI
    redoc_url="/api/redoc",  # ReDoc
    lifespan=lifespan
)


# ============================================================================
# MIDDLEWARE SETUP
# ============================================================================

# CORS (Cross-Origin Resource Sharing)
# Allows requests from frontend at different origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware to extract user ID from headers
app.add_middleware(UserContextMiddleware)


# ============================================================================
# ROUTES
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"ok": True}


# Include all API routes
app.include_router(api_router)


@app.get("/api/docs")
async def get_docs():
    """Interactive API documentation (Swagger UI)."""
    return {"message": "Visit /api/docs in browser"}


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all error handler."""
    logger.error(f"Unhandled exception: {exc}")
    return {
        "error": "Internal Server Error",
        "detail": str(exc) if logger.level == logging.DEBUG else None
    }


if __name__ == "__main__":
    import uvicorn
    
    # Run with: python -m uvicorn app.main:app --reload
    # --reload enables auto-restart on file changes
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=3001,
        reload=True,
        log_level="info"
    )
