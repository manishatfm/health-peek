"""
Sentiment Analysis Service  —  with full multilingual support.

Supported languages
────────────────────
Indian     : Hindi (hi), Bengali (bn), Tamil (ta), Telugu (te),
             Marathi (mr), Gujarati (gu), Hinglish (hinglish)
International: English (en), Spanish (es), French (fr), German (de),
             Portuguese (pt), Arabic (ar), Russian (ru), Japanese (ja),
             Chinese (zh), Korean (ko), Italian (it), Dutch (nl),
             Turkish (tr), Polish (pl)

Analysis pipeline
─────────────────
1.  Language auto-detection (or use caller-supplied code)
2a. English       → j-hartmann emotion model + cardiffnlp sentiment model
2b. Non-English   → nlptown/bert-base-multilingual-uncased-sentiment
3.  Emoji sentiment (language-agnostic, always run)
4.  Lexicon fallback when BERT is unavailable
"""

from transformers import pipeline
import re
import emoji
import logging
from typing import Tuple, Dict, List, Optional
import asyncio
from functools import lru_cache

from .language_service import language_service

logger = logging.getLogger(__name__)


class SentimentAnalysisService:

    def __init__(self):
        # English models
        self.sentiment_analyzer = None
        self.emotion_analyzer = None
        self.is_initialized = False
        # Multilingual BERT
        self._multilingual_analyzer = None
        self._multilingual_initialized = False

    # ── Initialisation ────────────────────────────────────────────────────────

    async def initialize(self):
        """Initialise the English-specific AI models (called at startup)."""
        if self.is_initialized:
            return
        try:
            logger.info("Initialising English AI sentiment models…")
            loop = asyncio.get_event_loop()
            self.sentiment_analyzer = await loop.run_in_executor(
                None,
                lambda: pipeline(
                    "text-classification",
                    model="j-hartmann/emotion-english-distilroberta-base",
                    framework="pt",
                ),
            )
            self.emotion_analyzer = await loop.run_in_executor(
                None,
                lambda: pipeline(
                    "sentiment-analysis",
                    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                    framework="pt",
                ),
            )
            self.is_initialized = True
            logger.info("English AI models initialised successfully")
        except Exception as e:
            logger.error(f"Failed to initialise English AI models: {e}")

    async def initialize_multilingual(self):
        """
        Initialise the multilingual BERT sentiment model (loaded on demand).
        nlptown/bert-base-multilingual-uncased-sentiment is free and supports
        EN, DE, FR, NL, IT, ES natively.  It generalises reasonably to Hindi,
        Arabic, Russian, CJK, and other languages.
        """
        if self._multilingual_initialized:
            return
        try:
            logger.info("Initialising multilingual sentiment model…")
            loop = asyncio.get_event_loop()
            self._multilingual_analyzer = await loop.run_in_executor(
                None,
                lambda: pipeline(
                    "text-classification",
                    model="nlptown/bert-base-multilingual-uncased-sentiment",
                    framework="pt",
                ),
            )
            self._multilingual_initialized = True
            logger.info("Multilingual model ready")
        except Exception as e:
            logger.warning(
                f"Multilingual model failed to load ({e}) – lexicon fallback will be used"
            )
            self._multilingual_initialized = True  # prevent repeated retries

    # ── Preprocessing ─────────────────────────────────────────────────────────

    def preprocess_text(self, text: str) -> str:
        """Clean and normalise text before analysis."""
        text = re.sub(r"\s+", " ", text.strip())
        text = re.sub(
            r"http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|"
            r"[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+",
            "",
            text,
        )
        text = re.sub(r"[!]{3,}", "!!!", text)
        text = re.sub(r"[?]{3,}", "???", text)
        text = re.sub(r"[.]{3,}", "...", text)
        return text

    # ── Emoji sentiment ───────────────────────────────────────────────────────

    @lru_cache(maxsize=1000)
    def analyze_emoji_sentiment(self, text: str) -> Tuple[str, float]:
        """Analyse sentiment based on emojis (language-agnostic)."""
        emojis = emoji.emoji_list(text)
        if not emojis:
            return "neutral", 0.0

        positive_emojis = {
            "😊": 0.8, "😄": 0.9, "😃": 0.8, "😀": 0.7, "🙂": 0.6, "😉": 0.7,
            "😍": 0.9, "🥰": 0.9, "😘": 0.8, "😗": 0.7, "☺️": 0.8, "🤗": 0.8,
            "🤩": 0.9, "😇": 0.8, "😋": 0.7, "😎": 0.8, "🥳": 0.9, "🎉": 0.8,
            "❤️": 0.9, "💕": 0.8, "💖": 0.9, "💗": 0.8, "🌟": 0.7, "✨": 0.7,
            "👍": 0.7, "👏": 0.8, "🙌": 0.8, "💪": 0.7, "🔥": 0.8, "💯": 0.8,
        }
        negative_emojis = {
            "😢": 0.8, "😭": 0.9, "😔": 0.7, "😞": 0.7, "😟": 0.6, "😕": 0.6,
            "☹️": 0.7, "🙁": 0.6, "😤": 0.7, "😠": 0.8, "😡": 0.9, "🤬": 0.9,
            "😰": 0.8, "😨": 0.8, "😱": 0.9, "😖": 0.7, "😣": 0.7, "😫": 0.8,
            "😩": 0.8, "🥺": 0.7, "😪": 0.6, "😴": 0.5, "🤒": 0.7, "🤕": 0.7,
            "💔": 0.9, "😿": 0.8, "👎": 0.7, "💀": 0.8, "😵": 0.8,
        }

        total_weight = pos_weight = neg_weight = 0.0
        for ei in emojis:
            ch = ei["emoji"]
            if ch in positive_emojis:
                w = positive_emojis[ch]
                pos_weight += w
                total_weight += w
            elif ch in negative_emojis:
                w = negative_emojis[ch]
                neg_weight += w
                total_weight += w

        if total_weight == 0:
            return "neutral", 0.0

        p_ratio = pos_weight / total_weight
        n_ratio = neg_weight / total_weight
        if p_ratio > n_ratio:
            return "positive", p_ratio
        elif n_ratio > p_ratio:
            return "negative", n_ratio
        return "neutral", 0.5

    # ── Mixed-emotion detection ───────────────────────────────────────────────

    def detect_mixed_emotions(self, original_text: str, processed_text: str) -> float:
        """Return a 0-0.5 penalty for mixed/conflicting signals."""
        mixed_patterns = [
            r"\bbut\b", r"\bhowever\b", r"\balthough\b", r"\bthough\b",
            r"\bon the other hand\b", r"\bmixed feelings?\b", r"\bconfused\b",
            r"\bdont know\b", r"\bunsure\b", r"\bmaybe\b", r"\bperhaps\b",
        ]
        positive_words = ["happy", "good", "great", "excellent", "wonderful", "amazing", "love", "joy"]
        negative_words = ["sad", "bad", "terrible", "awful", "hate", "angry", "depressed", "worried"]
        text_lower = processed_text.lower()

        mixed_score = 0.0
        for pattern in mixed_patterns:
            if re.search(pattern, text_lower):
                mixed_score += 0.2

        if any(w in text_lower for w in positive_words) and any(w in text_lower for w in negative_words):
            mixed_score += 0.3

        emoji_sent, _ = self.analyze_emoji_sentiment(original_text)
        if emoji_sent != "neutral" and emoji.emoji_list(original_text) and mixed_score > 0:
            mixed_score += 0.1

        return min(mixed_score, 0.5)

    # ── Main public API ───────────────────────────────────────────────────────

    async def analyze_sentiment(
        self, text: str, language: Optional[str] = None
    ) -> Tuple[str, float, Dict]:
        """
        Analyse sentiment for *text*.

        Parameters
        ----------
        text     : Raw message text (any language).
        language : Optional ISO language code ('hi', 'es', 'hinglish', …).
                   When provided, skips auto-detection.

        Returns
        -------
        (sentiment, confidence, emotions)
        """
        original_text = text
        processed_text = self.preprocess_text(text)

        # Determine language
        if language and language_service.is_supported(language):
            detected_lang = language
        else:
            detected_lang, _ = language_service.detect_language(text)

        logger.debug(f"Language used for sentiment: {detected_lang}")

        if detected_lang not in ("en",):
            return await self._analyze_multilingual(original_text, processed_text, detected_lang)

        return await self._analyze_english(original_text, processed_text)

    # ── English analysis ──────────────────────────────────────────────────────

    async def _analyze_english(
        self, original_text: str, processed_text: str
    ) -> Tuple[str, float, Dict]:
        emoji_sentiment, emoji_confidence = self.analyze_emoji_sentiment(original_text)
        mixed_penalty = self.detect_mixed_emotions(original_text, processed_text)

        if self.is_initialized and self.sentiment_analyzer:
            try:
                emotion_results = self.sentiment_analyzer(processed_text[:512])
                sentiment_results = (
                    self.emotion_analyzer(processed_text[:512])
                    if self.emotion_analyzer
                    else None
                )

                emotions: Dict = {}
                if emotion_results:
                    for r in emotion_results:
                        emotions[r["label"]] = r["score"]

                if sentiment_results:
                    ai_label = sentiment_results[0]["label"].lower()
                    confidence = sentiment_results[0]["score"]
                    if "positive" in ai_label:
                        primary_sentiment = "positive"
                    elif "negative" in ai_label:
                        primary_sentiment = "negative"
                    else:
                        primary_sentiment = "neutral"
                else:
                    pos_emotions = ["joy", "love", "surprise", "optimism"]
                    neg_emotions = ["sadness", "anger", "fear", "disgust", "pessimism"]
                    pos_score = sum(emotions.get(e, 0) for e in pos_emotions)
                    neg_score = sum(emotions.get(e, 0) for e in neg_emotions)
                    if pos_score > neg_score and pos_score > 0.3:
                        primary_sentiment, confidence = "positive", pos_score
                    elif neg_score > pos_score and neg_score > 0.3:
                        primary_sentiment, confidence = "negative", neg_score
                    else:
                        primary_sentiment, confidence = "neutral", 0.5

                if primary_sentiment == "neutral" and emoji_sentiment != "neutral" and emoji_confidence > 0.6:
                    primary_sentiment = emoji_sentiment
                    confidence = emoji_confidence * 0.85
                elif emoji_sentiment != "neutral" and emoji_sentiment == primary_sentiment:
                    confidence = min(confidence + emoji_confidence * 0.15, 0.98)

                confidence = max(confidence - mixed_penalty, 0.15)
                return primary_sentiment, confidence, emotions

            except Exception as e:
                logger.error(f"English AI analysis failed: {e}")

        return await self._fallback_analysis(processed_text, emoji_sentiment, emoji_confidence, mixed_penalty)

    # ── Multilingual analysis ─────────────────────────────────────────────────

    async def _analyze_multilingual(
        self, original_text: str, processed_text: str, lang: str
    ) -> Tuple[str, float, Dict]:
        """
        Sentiment for non-English text using:
          1. Multilingual BERT (nlptown 5-star model)
          2. Language-specific lexicon fallback
        Emoji analysis is always applied on top.
        """
        emoji_sentiment, emoji_confidence = self.analyze_emoji_sentiment(original_text)
        mixed_penalty = self.detect_mixed_emotions(original_text, processed_text)

        if not self._multilingual_initialized:
            await self.initialize_multilingual()

        if self._multilingual_analyzer:
            try:
                result = self._multilingual_analyzer(processed_text[:512])
                if result:
                    label = result[0]["label"]   # e.g. "5 stars"
                    score = result[0]["score"]
                    stars = int(label.split()[0])

                    if stars >= 4:
                        sentiment = "positive"
                        confidence = score * (0.70 + (stars - 4) * 0.15)
                    elif stars <= 2:
                        sentiment = "negative"
                        confidence = score * (0.70 + (2 - stars) * 0.15)
                    else:
                        sentiment = "neutral"
                        confidence = score * 0.60

                    if emoji_sentiment != "neutral" and emoji_confidence > 0.65:
                        if emoji_sentiment != sentiment:
                            sentiment = emoji_sentiment
                            confidence = emoji_confidence * 0.85
                        else:
                            confidence = min(confidence + emoji_confidence * 0.15, 0.97)

                    confidence = max(confidence - mixed_penalty, 0.15)
                    emotions = self._build_emotions(sentiment, confidence)
                    return sentiment, round(confidence, 4), emotions

            except Exception as e:
                logger.warning(f"Multilingual BERT inference failed: {e}")

        return await self._multilingual_lexicon_analysis(
            original_text, processed_text, lang, emoji_sentiment, emoji_confidence, mixed_penalty
        )

    async def _multilingual_lexicon_analysis(
        self,
        original_text: str,
        processed_text: str,
        lang: str,
        emoji_sentiment: str,
        emoji_confidence: float,
        mixed_penalty: float,
    ) -> Tuple[str, float, Dict]:
        """Language-specific lexicon where BERT is unavailable."""
        pos_words, neg_words = language_service.get_sentiment_words(lang)
        text_lower = processed_text.lower()

        pos_count = sum(1 for w in pos_words if w.lower() in text_lower)
        neg_count = sum(1 for w in neg_words if w.lower() in text_lower)

        if original_text.count("!") >= 2:
            pos_count += 1

        if pos_count > neg_count:
            sentiment = "positive"
            confidence = min(0.55 + pos_count * 0.08, 0.88)
        elif neg_count > pos_count:
            sentiment = "negative"
            confidence = min(0.55 + neg_count * 0.08, 0.88)
        else:
            if emoji_sentiment != "neutral" and emoji_confidence > 0.4:
                sentiment = emoji_sentiment
                confidence = emoji_confidence * 0.75
            else:
                sentiment = "neutral"
                confidence = 0.5

        if emoji_sentiment != "neutral":
            if emoji_sentiment == sentiment:
                confidence = min(confidence + emoji_confidence * 0.2, 0.95)
            elif emoji_confidence > 0.7:
                sentiment = emoji_sentiment
                confidence = emoji_confidence * 0.85

        confidence = max(confidence - mixed_penalty, 0.15)
        emotions = self._build_emotions(sentiment, confidence)
        return sentiment, round(confidence, 4), emotions

    def _build_emotions(self, sentiment: str, confidence: float) -> Dict:
        if sentiment == "positive":
            return {"joy": confidence * 0.9, "optimism": confidence * 0.7, "excitement": confidence * 0.6}
        elif sentiment == "negative":
            return {"sadness": confidence * 0.6, "anger": confidence * 0.5, "frustration": confidence * 0.7}
        return {"neutral": confidence}

    # ── English rule-based fallback ───────────────────────────────────────────

    async def _fallback_analysis(
        self,
        text: str,
        emoji_sentiment: str,
        emoji_confidence: float,
        mixed_penalty: float,
    ) -> Tuple[str, float, Dict]:
        """Tuned rule-based fallback for English, aiming for <30% neutral rate."""
        positive_words = [
            "happy", "good", "great", "excellent", "wonderful", "amazing", "love", "joy",
            "excited", "thrilled", "delighted", "pleased", "satisfied", "content",
            "optimistic", "hopeful", "grateful", "blessed", "fantastic", "awesome",
            "nice", "fine", "perfect", "best", "better", "beautiful", "lovely",
            "fun", "enjoy", "glad", "proud", "yay", "yep", "yeah", "cool", "sweet",
            "brilliant", "super", "fabulous", "divine", "splendid", "marvelous",
            "thanks", "thank", "appreciate", "congrats", "congratulations", "celebrate",
            "smile", "laugh", "laughing", "funny", "hilarious", "adorable", "cute",
        ]
        negative_words = [
            "sad", "bad", "terrible", "awful", "hate", "angry", "mad", "furious",
            "depressed", "worried", "anxious", "stressed", "upset", "frustrated",
            "disappointed", "hurt", "pain", "suffer", "horrible", "disgusting",
            "sick", "tired", "exhausted", "annoyed", "irritated", "worst", "worse",
            "sucks", "damn", "hell", "cry", "crying", "miss", "lonely", "alone",
            "difficult", "hard", "tough", "struggle", "problem", "issue", "wrong",
            "fail", "failed", "failure", "broke", "broken", "sorry", "apologize",
            "unfortunately", "sadly", "regret", "wish", "cant", "cannot", "wont",
        ]
        casual_neutral = {"ok", "okay", "k", "yeah", "yep", "nope", "hmm", "um", "uh"}

        text_lower = text.lower().strip()
        words = text.split()

        # PHASE 1 — filler check
        if len(words) <= 2 and text_lower in casual_neutral:
            has_emojis = len(emoji.emoji_list(text)) > 0
            if has_emojis and emoji_sentiment != "neutral":
                return emoji_sentiment, emoji_confidence * 0.8, {emoji_sentiment: emoji_confidence * 0.8}
            elif text.count("!") >= 2:
                return "positive", 0.68, {"joy": 0.68, "excitement": 0.55}
            return "neutral", 0.5, {"neutral": 0.5}

        # PHASE 2 — word counting
        positive_count = sum(1 for w in positive_words if w in text_lower)
        negative_count = sum(1 for w in negative_words if w in text_lower)

        exclamation_count = text.count("!")
        question_count = text.count("?")
        caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)

        # PHASE 4 — implicit patterns
        if any(p in text_lower for p in ["feel good", "feeling good", "sounds good",
                                          "look forward", "cant wait", "can't wait",
                                          "so happy", "really good", "went well"]):
            positive_count += 2
        if any(p in text_lower for p in ["feel bad", "feeling bad", "not good",
                                          "dont like", "don't like", "hate it",
                                          "so sad", "really bad", "went wrong",
                                          "fed up", "had enough"]):
            negative_count += 2

        if question_count >= 2 and any(w in text_lower for w in ["what", "why", "how", "when"]):
            negative_count += 1
        if exclamation_count >= 3:
            positive_count += 1
        if caps_ratio > 0.5 and len(words) > 2:
            if positive_count > 0:
                positive_count += 1
            else:
                negative_count += 1

        positive_score = positive_count / max(len(words) * 0.08, 1)
        negative_score = negative_count / max(len(words) * 0.08, 1)

        if positive_count > negative_count:
            sentiment = "positive"
            base_confidence = min(positive_score, 0.88)
            if positive_count >= 2:
                base_confidence = min(base_confidence + 0.1, 0.92)
        elif negative_count > positive_count:
            sentiment = "negative"
            base_confidence = min(negative_score, 0.88)
            if negative_count >= 2:
                base_confidence = min(base_confidence + 0.1, 0.92)
        elif positive_count > 0 or negative_count > 0:
            sentiment = "positive" if positive_score >= negative_score else "negative"
            base_confidence = 0.65
        else:
            if emoji_sentiment != "neutral" and emoji_confidence > 0.4:
                return emoji_sentiment, emoji_confidence * 0.75, {emoji_sentiment: emoji_confidence * 0.75}
            if exclamation_count >= 1 and len(words) >= 3:
                return "positive", 0.58, {"joy": 0.58, "excitement": 0.45}
            if question_count >= 2:
                return "negative", 0.55, {"confusion": 0.55, "concern": 0.45}
            sentiment = "neutral"
            base_confidence = 0.5

        if emoji_sentiment != "neutral":
            if emoji_sentiment == sentiment:
                base_confidence = min(base_confidence + emoji_confidence * 0.35, 0.96)
            elif emoji_confidence > 0.7:
                sentiment = emoji_sentiment
                base_confidence = emoji_confidence * 0.85
            elif emoji_confidence > 0.5:
                base_confidence *= 0.85

        final_confidence = max(base_confidence - mixed_penalty, 0.15)

        if sentiment == "positive":
            emotions = {"joy": final_confidence * 0.9, "optimism": final_confidence * 0.7, "excitement": final_confidence * 0.6}
        elif sentiment == "negative":
            emotions = {"sadness": final_confidence * 0.6, "anger": final_confidence * 0.5, "frustration": final_confidence * 0.7}
        else:
            emotions = {"neutral": final_confidence}

        logger.debug(
            f"Fallback – {sentiment} ({final_confidence:.2f}) "
            f"Pos:{positive_count} Neg:{negative_count} | {text[:50]}"
        )
        return sentiment, final_confidence, emotions


# ── Singleton ──────────────────────────────────────────────────────────────────
sentiment_service = SentimentAnalysisService()
