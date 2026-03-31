"""Voice service - Whisper-based voice transcription and emotion analysis"""
import logging
import tempfile
import os
import asyncio

logger = logging.getLogger(__name__)


class VoiceService:
    """Voice analysis service using Whisper model for transcription"""

    def __init__(self):
        self.is_initialized = False
        self.model = None

    async def initialize(self):
        """Initialize Whisper model for transcription"""
        try:
            loop = asyncio.get_event_loop()
            self.model = await loop.run_in_executor(None, self._load_model)
            self.is_initialized = True
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.warning(f"Whisper model not available, voice transcription disabled: {e}")
            self.is_initialized = False

    def _load_model(self):
        """Load Whisper model (runs in thread)"""
        import whisper
        return whisper.load_model("base")

    async def transcribe(self, audio_data: bytes) -> dict:
        """Transcribe audio bytes to text using Whisper"""
        if not self.is_initialized or self.model is None:
            raise RuntimeError("Voice service not initialized")

        tmp_path = None
        try:
            # Write audio to a temp file for Whisper
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp.write(audio_data)
                tmp_path = tmp.name

            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, lambda: self.model.transcribe(tmp_path)
            )

            text = result.get("text", "").strip()
            language = result.get("language", "en")

            return {
                "text": text,
                "language": language,
            }
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

    async def transcribe_and_analyze(self, audio_data: bytes, sentiment_service, analysis_service, user_id: str) -> dict:
        """Transcribe audio and run emotion/sentiment analysis on the text"""
        # Step 1: Transcribe
        transcription = await self.transcribe(audio_data)
        text = transcription.get("text", "")

        if not text:
            return {
                "text": "",
                "language": transcription.get("language", "en"),
                "sentiment": "neutral",
                "confidence": 0.0,
                "emotions": {},
                "emoji_analysis": None,
                "analysis_id": None,
                "message": "No speech detected in audio",
            }

        # Step 2: Sentiment/emotion analysis on transcribed text
        sentiment, confidence, emotions = await sentiment_service.analyze_sentiment(text)
        emoji_sentiment, emoji_confidence = sentiment_service.analyze_emoji_sentiment(text)
        emoji_analysis = (
            {"sentiment": emoji_sentiment, "confidence": emoji_confidence}
            if emoji_sentiment != "neutral"
            else None
        )

        # Step 3: Save to analysis history
        analysis_id = await analysis_service.save_analysis(
            user_id=user_id,
            message=text,
            sentiment=sentiment,
            confidence=confidence,
            emotions=emotions,
            emoji_analysis=emoji_analysis,
            source="voice",
        )

        return {
            "text": text,
            "language": transcription.get("language", "en"),
            "sentiment": sentiment,
            "confidence": confidence,
            "emotions": emotions,
            "emoji_analysis": emoji_analysis,
            "analysis_id": analysis_id,
        }


voice_service = VoiceService()
