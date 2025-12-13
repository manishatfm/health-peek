from transformers import pipeline
import re
import emoji
import logging
from typing import Tuple, Dict, List
import asyncio
from functools import lru_cache

logger = logging.getLogger(__name__)

class SentimentAnalysisService:
    def __init__(self):
        self.sentiment_analyzer = None
        self.emotion_analyzer = None
        self.is_initialized = False
        
    async def initialize(self):
        """Initialize AI models asynchronously"""
        if self.is_initialized:
            return
            
        try:
            logger.info("Initializing AI sentiment models...")
            
            # Initialize models in separate threads to avoid blocking
            loop = asyncio.get_event_loop()
            
            # Load sentiment analyzer
            self.sentiment_analyzer = await loop.run_in_executor(
                None, 
                lambda: pipeline("text-classification", 
                               model="j-hartmann/emotion-english-distilroberta-base",
                               framework="pt")
            )
            
            # Load emotion analyzer
            self.emotion_analyzer = await loop.run_in_executor(
                None,
                lambda: pipeline("sentiment-analysis",
                               model="cardiffnlp/twitter-roberta-base-sentiment-latest", 
                               framework="pt")
            )
            
            self.is_initialized = True
            logger.info("AI models initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize AI models: {e}")
            # Continue without AI models - fallback will be used
    
    def preprocess_text(self, text: str) -> str:
        """Clean and preprocess text for analysis"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove URLs
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        
        # Remove excessive punctuation but keep some for context
        text = re.sub(r'[!]{3,}', '!!!', text)
        text = re.sub(r'[?]{3,}', '???', text)
        text = re.sub(r'[.]{3,}', '...', text)
        
        return text
    
    @lru_cache(maxsize=1000)
    def analyze_emoji_sentiment(self, text: str) -> Tuple[str, float]:
        """Analyze sentiment based on emojis with caching"""
        emojis = emoji.emoji_list(text)
        if not emojis:
            return "neutral", 0.0
        
        # Emoji sentiment mappings with weights
        positive_emojis = {
            '😊': 0.8, '😄': 0.9, '😃': 0.8, '😀': 0.7, '🙂': 0.6, '😉': 0.7,
            '😍': 0.9, '🥰': 0.9, '😘': 0.8, '😗': 0.7, '☺️': 0.8, '🤗': 0.8,
            '🤩': 0.9, '😇': 0.8, '😋': 0.7, '😎': 0.8, '🥳': 0.9, '🎉': 0.8,
            '❤️': 0.9, '💕': 0.8, '💖': 0.9, '💗': 0.8, '🌟': 0.7, '✨': 0.7,
            '👍': 0.7, '👏': 0.8, '🙌': 0.8, '💪': 0.7, '🔥': 0.8, '💯': 0.8
        }
        
        negative_emojis = {
            '😢': 0.8, '😭': 0.9, '😔': 0.7, '😞': 0.7, '😟': 0.6, '😕': 0.6,
            '☹️': 0.7, '🙁': 0.6, '😤': 0.7, '😠': 0.8, '😡': 0.9, '🤬': 0.9,
            '😰': 0.8, '😨': 0.8, '😱': 0.9, '😖': 0.7, '😣': 0.7, '😫': 0.8,
            '😩': 0.8, '🥺': 0.7, '😪': 0.6, '😴': 0.5, '🤒': 0.7, '🤕': 0.7,
            '💔': 0.9, '😿': 0.8, '👎': 0.7, '💀': 0.8, '😵': 0.8
        }
        
        total_weight = 0
        positive_weight = 0
        negative_weight = 0
        
        for emoji_info in emojis:
            emoji_char = emoji_info['emoji']
            if emoji_char in positive_emojis:
                weight = positive_emojis[emoji_char]
                positive_weight += weight
                total_weight += weight
            elif emoji_char in negative_emojis:
                weight = negative_emojis[emoji_char]
                negative_weight += weight
                total_weight += weight
        
        if total_weight == 0:
            return "neutral", 0.0
        
        # Calculate weighted sentiment
        positive_ratio = positive_weight / total_weight
        negative_ratio = negative_weight / total_weight
        
        if positive_ratio > negative_ratio:
            return "positive", positive_ratio
        elif negative_ratio > positive_ratio:
            return "negative", negative_ratio
        else:
            return "neutral", 0.5
    
    def detect_mixed_emotions(self, original_text: str, processed_text: str) -> float:
        """Detect mixed or conflicting emotions in text"""
        # Patterns that suggest mixed emotions
        mixed_patterns = [
            r'\bbut\b', r'\bhowever\b', r'\balthough\b', r'\bthough\b',
            r'\bon the other hand\b', r'\bmixed feelings?\b', r'\bconfused\b',
            r'\bdont know\b', r'\bunsure\b', r'\bmaybe\b', r'\bperhaps\b'
        ]
        
        # Contrasting emotion words in same text
        positive_words = ['happy', 'good', 'great', 'excellent', 'wonderful', 'amazing', 'love', 'joy']
        negative_words = ['sad', 'bad', 'terrible', 'awful', 'hate', 'angry', 'depressed', 'worried']
        
        text_lower = processed_text.lower()
        
        # Check for mixed patterns
        mixed_score = 0
        for pattern in mixed_patterns:
            if re.search(pattern, text_lower):
                mixed_score += 0.2
        
        # Check for contrasting emotions
        has_positive = any(word in text_lower for word in positive_words)
        has_negative = any(word in text_lower for word in negative_words)
        
        if has_positive and has_negative:
            mixed_score += 0.3
        
        # Emoji analysis for mixed emotions
        emoji_sentiment, _ = self.analyze_emoji_sentiment(original_text)
        
        # If text sentiment conflicts with emoji sentiment, it's mixed
        if emoji_sentiment != "neutral":
            # This would need comparison with text sentiment
            # For now, just add slight penalty if emojis present with mixed patterns
            emojis = emoji.emoji_list(original_text)
            if emojis and mixed_score > 0:
                mixed_score += 0.1
        
        return min(mixed_score, 0.5)  # Cap at 0.5
    
    async def analyze_sentiment(self, text: str) -> Tuple[str, float, Dict]:
        """Main sentiment analysis method with improved accuracy"""
        original_text = text
        processed_text = self.preprocess_text(text)
        
        # Get emoji analysis first (very reliable for chat messages)
        emoji_sentiment, emoji_confidence = self.analyze_emoji_sentiment(original_text)
        
        # Get mixed emotion penalty
        mixed_penalty = self.detect_mixed_emotions(original_text, processed_text)
        
        # AI Analysis if models are loaded
        if self.is_initialized and self.sentiment_analyzer:
            try:
                # Get emotion analysis
                emotion_results = self.sentiment_analyzer(processed_text[:512])
                
                # Get sentiment analysis
                sentiment_results = None
                if self.emotion_analyzer:
                    sentiment_results = self.emotion_analyzer(processed_text[:512])
                
                # Process results
                emotions = {}
                if emotion_results:
                    for result in emotion_results:
                        emotions[result['label']] = result['score']
                
                # Determine primary sentiment from AI
                if sentiment_results:
                    ai_label = sentiment_results[0]['label'].lower()
                    confidence = sentiment_results[0]['score']
                    
                    # Map AI labels to our sentiment categories
                    if 'positive' in ai_label:
                        primary_sentiment = "positive"
                    elif 'negative' in ai_label:
                        primary_sentiment = "negative"
                    else:
                        primary_sentiment = "neutral"
                else:
                    # Fallback to emotion-based sentiment
                    positive_emotions = ['joy', 'love', 'surprise', 'optimism']
                    negative_emotions = ['sadness', 'anger', 'fear', 'disgust', 'pessimism']
                    
                    positive_score = sum(emotions.get(e, 0) for e in positive_emotions)
                    negative_score = sum(emotions.get(e, 0) for e in negative_emotions)
                    
                    if positive_score > negative_score and positive_score > 0.3:
                        primary_sentiment = "positive"
                        confidence = positive_score
                    elif negative_score > positive_score and negative_score > 0.3:
                        primary_sentiment = "negative"
                        confidence = negative_score
                    else:
                        primary_sentiment = "neutral"
                        confidence = 0.5
                
                # **CRITICAL FIX**: If AI says neutral but emojis suggest otherwise, trust emojis
                if primary_sentiment == "neutral" and emoji_sentiment != "neutral" and emoji_confidence > 0.6:
                    logger.debug(f"Overriding AI neutral with emoji sentiment: {emoji_sentiment}")
                    primary_sentiment = emoji_sentiment
                    confidence = emoji_confidence * 0.85
                
                # Adjust confidence based on emoji reinforcement
                elif emoji_sentiment != "neutral" and emoji_sentiment == primary_sentiment:
                    confidence = min(confidence + emoji_confidence * 0.15, 0.98)
                
                # Apply mixed emotion penalty
                confidence = max(confidence - mixed_penalty, 0.15)
                
                return primary_sentiment, confidence, emotions
                
            except Exception as e:
                logger.error(f"AI analysis failed: {e}")
                # Fall through to fallback
        
        # Enhanced fallback analysis (much better accuracy)
        return await self._fallback_analysis(processed_text, emoji_sentiment, emoji_confidence, mixed_penalty)
    
    async def _fallback_analysis(self, text: str, emoji_sentiment: str, emoji_confidence: float, mixed_penalty: float) -> Tuple[str, float, Dict]:
        """HIGHLY IMPROVED fallback sentiment analysis - aims for <30% neutral"""
        
        # EXPANDED word lists with casual chat language
        positive_words = [
            'happy', 'good', 'great', 'excellent', 'wonderful', 'amazing', 'love', 'joy',
            'excited', 'thrilled', 'delighted', 'pleased', 'satisfied', 'content',
            'optimistic', 'hopeful', 'grateful', 'blessed', 'fantastic', 'awesome',
            'nice', 'fine', 'perfect', 'best', 'better', 'beautiful', 'lovely',
            'fun', 'enjoy', 'glad', 'proud', 'yay', 'yep', 'yeah', 'cool', 'sweet',
            'brilliant', 'super', 'fabulous', 'divine', 'splendid', 'marvelous',
            'thanks', 'thank', 'appreciate', 'congrats', 'congratulations', 'celebrate',
            'smile', 'laugh', 'laughing', 'funny', 'hilarious', 'adorable', 'cute'
        ]
        
        negative_words = [
            'sad', 'bad', 'terrible', 'awful', 'hate', 'angry', 'mad', 'furious',
            'depressed', 'worried', 'anxious', 'stressed', 'upset', 'frustrated',
            'disappointed', 'hurt', 'pain', 'suffer', 'horrible', 'disgusting',
            'sick', 'tired', 'exhausted', 'annoyed', 'irritated', 'worst', 'worse',
            'sucks', 'damn', 'hell', 'cry', 'crying', 'miss', 'lonely', 'alone',
            'difficult', 'hard', 'tough', 'struggle', 'problem', 'issue', 'wrong',
            'fail', 'failed', 'failure', 'broke', 'broken', 'sorry', 'apologize',
            'unfortunately', 'sadly', 'regret', 'wish', 'cant', 'cannot', 'wont'
        ]
        
        # Casual phrases (don't count these as neutral indicators)
        casual_neutral = ['ok', 'okay', 'k', 'yeah', 'yep', 'nope', 'hmm', 'um', 'uh']
        
        text_lower = text.lower().strip()
        words = text.split()
        
        # **PHASE 1: Check if it's genuinely neutral filler**
        if len(words) <= 2 and text_lower in casual_neutral:
            import emoji
            has_emojis = len(emoji.emoji_list(text)) > 0
            exclamation_count = text.count('!')
            
            if has_emojis and emoji_sentiment != "neutral":
                return emoji_sentiment, emoji_confidence * 0.8, {emoji_sentiment: emoji_confidence * 0.8}
            elif exclamation_count >= 2:
                return "positive", 0.68, {"joy": 0.68, "excitement": 0.55}
            else:
                # True neutral filler - but this should already be filtered in analysis.py
                return "neutral", 0.5, {"neutral": 0.5}
        
        # **PHASE 2: Count sentiment indicators**
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        # **PHASE 3: Check punctuation patterns**
        exclamation_count = text.count('!')
        question_count = text.count('?')
        caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
        
        # **PHASE 4: Detect implicit sentiment patterns**
        # Positive patterns
        if any(pattern in text_lower for pattern in ['feel good', 'feeling good', 'sounds good', 
                                                       'look forward', 'cant wait', "can't wait",
                                                       'so happy', 'really good', 'went well']):
            positive_count += 2
        
        # Negative patterns
        if any(pattern in text_lower for pattern in ['feel bad', 'feeling bad', 'not good',
                                                       'dont like', "don't like", 'hate it',
                                                       'so sad', 'really bad', 'went wrong',
                                                       'fed up', 'had enough']):
            negative_count += 2
        
        # Questions with concern
        if question_count >= 2 and any(word in text_lower for word in ['what', 'why', 'how', 'when']):
            negative_count += 1  # Questions can indicate confusion/concern
        
        # Excessive punctuation indicates emotion
        if exclamation_count >= 3:
            positive_count += 1  # Excitement
        
        # ALL CAPS suggests strong emotion
        if caps_ratio > 0.5 and len(words) > 2:
            if positive_count > 0:
                positive_count += 1
            elif negative_count > 0:
                negative_count += 1
            else:
                negative_count += 1  # Default to negative for ALL CAPS
        
        # **PHASE 5: Calculate base sentiment**
        total_words = len(words)
        
        # Lower threshold for sentiment detection (was 0.15, now 0.08)
        positive_score = positive_count / max(total_words * 0.08, 1)
        negative_score = negative_count / max(total_words * 0.08, 1)
        
        # **PHASE 6: Determine sentiment with LOWER neutral threshold**
        if positive_count > negative_count:
            sentiment = "positive"
            base_confidence = min(positive_score, 0.88)
            # Boost confidence for clear positives
            if positive_count >= 2:
                base_confidence = min(base_confidence + 0.1, 0.92)
        elif negative_count > positive_count:
            sentiment = "negative"
            base_confidence = min(negative_score, 0.88)
            # Boost confidence for clear negatives
            if negative_count >= 2:
                base_confidence = min(base_confidence + 0.1, 0.92)
        elif positive_count > 0 or negative_count > 0:
            # Equal counts but SOME sentiment - pick based on strength
            if positive_score > negative_score:
                sentiment = "positive"
                base_confidence = 0.65
            else:
                sentiment = "negative"
                base_confidence = 0.65
        else:
            # **PHASE 7: Last attempt - check emoji and context before neutral**
            if emoji_sentiment != "neutral" and emoji_confidence > 0.4:
                # Trust emoji even with lower confidence
                return emoji_sentiment, emoji_confidence * 0.75, {emoji_sentiment: emoji_confidence * 0.75}
            
            # Check for implicit emotional content
            if exclamation_count >= 1 and len(words) >= 3:
                return "positive", 0.58, {"joy": 0.58, "excitement": 0.45}
            
            if question_count >= 2:
                return "negative", 0.55, {"confusion": 0.55, "concern": 0.45}
            
            # Finally, truly neutral
            sentiment = "neutral"
            base_confidence = 0.5
        
        # **PHASE 8: Boost confidence with emoji reinforcement**
        if emoji_sentiment != "neutral":
            if emoji_sentiment == sentiment:
                # Emoji reinforces - significant boost
                base_confidence = min(base_confidence + emoji_confidence * 0.35, 0.96)
            else:
                # Emoji conflicts - use emoji if high confidence
                if emoji_confidence > 0.7:
                    sentiment = emoji_sentiment
                    base_confidence = emoji_confidence * 0.85
                elif emoji_confidence > 0.5:
                    # Mixed signal - reduce confidence but keep text sentiment
                    base_confidence = base_confidence * 0.85
        
        # **PHASE 9: Apply mixed emotion penalty**
        final_confidence = max(base_confidence - mixed_penalty, 0.15)
        
        # **PHASE 10: Map emotions**
        emotions = {}
        if sentiment == "positive":
            emotions = {
                "joy": final_confidence * 0.9,
                "optimism": final_confidence * 0.7,
                "excitement": final_confidence * 0.6
            }
        elif sentiment == "negative":
            emotions = {
                "sadness": final_confidence * 0.6,
                "anger": final_confidence * 0.5,
                "frustration": final_confidence * 0.7
            }
        else:
            emotions = {"neutral": final_confidence}
        
        logger.debug(f"Sentiment: {sentiment} ({final_confidence:.2f}) | Pos:{positive_count} Neg:{negative_count} | Text: {text[:50]}")
        
        return sentiment, final_confidence, emotions

# Singleton instance
sentiment_service = SentimentAnalysisService()