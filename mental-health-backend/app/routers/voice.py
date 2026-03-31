"""Voice router - endpoints for voice/audio analysis"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.services.voice_service import voice_service
from app.services.sentiment_service import sentiment_service
from app.services.analysis_service import analysis_service
from app.core.security import get_current_user

router = APIRouter(
    prefix="/api/voice",
    tags=["voice"]
)


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio file to text"""
    if not voice_service.is_initialized:
        raise HTTPException(status_code=503, detail="Voice service not initialized")
    
    try:
        audio_data = await file.read()
        result = await voice_service.transcribe(audio_data)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def analyze_voice(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Transcribe audio and analyze emotions/sentiment"""
    if not voice_service.is_initialized:
        raise HTTPException(status_code=503, detail="Voice service not initialized. Please ensure Whisper model is available.")

    try:
        audio_data = await file.read()
        result = await voice_service.transcribe_and_analyze(
            audio_data=audio_data,
            sentiment_service=sentiment_service,
            analysis_service=analysis_service,
            user_id=current_user["user_id"],
        )
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def voice_status():
    """Check voice service status"""
    return {
        "success": True,
        "initialized": voice_service.is_initialized
    }
