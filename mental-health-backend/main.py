import os
# Fix matplotlib backend issue on Windows
os.environ['MPLBACKEND'] = 'Agg'

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import logging

# Import modules
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, analysis, dashboard, blogs, voice
from app.services.sentiment_service import sentiment_service
from app.utils.logging import setup_logging

# Setup logging
logger = setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Mental Health Chat Analyzer API...")
    
    try:
        # Connect to database
        await connect_to_mongo()
        logger.info("Database connected successfully")
        
        # Initialize AI models
        await sentiment_service.initialize()
        logger.info("AI models initialized")
        
        # Initialize voice/whisper model
        from app.services.voice_service import voice_service
        await voice_service.initialize()
        logger.info("Voice (Whisper) model initialized")
        
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    await close_mongo_connection()

# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description=settings.API_DESCRIPTION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Global exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )

# Include routers
app.include_router(auth.router)
app.include_router(analysis.router)
app.include_router(dashboard.router)
app.include_router(blogs.router)
app.include_router(voice.router)

# Legacy endpoint compatibility
@app.post("/analyze")
async def analyze_compatibility(request: dict):
    """Legacy endpoint for backward compatibility"""
    from app.models.schemas import MessageRequest
    from app.routers.analysis import analyze_message
    from app.core.security import get_current_user
    from fastapi import Depends
    
    # This is a simplified compatibility layer
    # In production, you should handle authentication properly
    message_request = MessageRequest(message=request.get("message", ""))
    
    # For now, return a simple response without authentication
    # You should implement proper auth handling for production
    try:
        sentiment, confidence, emotions = await sentiment_service.analyze_sentiment(message_request.message)
        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "emotions": emotions,
            "message": "Analysis completed successfully"
        }
    except Exception as e:
        logger.error(f"Legacy endpoint error: {e}")
        return {
            "error": str(e),
            "message": "Analysis failed"
        }

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.API_VERSION,
        "ai_models_loaded": sentiment_service.is_initialized
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Mental Health Chat Analyzer API",
        "version": settings.API_VERSION,
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )