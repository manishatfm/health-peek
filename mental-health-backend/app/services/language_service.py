"""
Multilingual Language Detection & Translation Service
Supports Indian languages + major international languages including Hinglish.

Indian languages: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati
International: Spanish, French, German, Portuguese, Arabic, Russian, Japanese,
               Chinese (Simplified), Korean, Italian, Dutch, Turkish, Polish
Special modes:  Hinglish (Hindi-English code-mix), Romanized Indic scripts
"""

import re
import logging
from typing import Tuple, Optional, Dict, List
from functools import lru_cache

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Language metadata
# ─────────────────────────────────────────────

SUPPORTED_LANGUAGES: Dict[str, Dict] = {
    # ── Indian languages ───────────────────
    "hi": {
        "name": "Hindi",
        "native": "हिन्दी",
        "script": "devanagari",
        "region": "indian",
        "unicode_range": (0x0900, 0x097F),
    },
    "bn": {
        "name": "Bengali",
        "native": "বাংলা",
        "script": "bengali",
        "region": "indian",
        "unicode_range": (0x0980, 0x09FF),
    },
    "ta": {
        "name": "Tamil",
        "native": "தமிழ்",
        "script": "tamil",
        "region": "indian",
        "unicode_range": (0x0B80, 0x0BFF),
    },
    "te": {
        "name": "Telugu",
        "native": "తెలుగు",
        "script": "telugu",
        "region": "indian",
        "unicode_range": (0x0C00, 0x0C7F),
    },
    "mr": {
        "name": "Marathi",
        "native": "मराठी",
        "script": "devanagari",
        "region": "indian",
        "unicode_range": (0x0900, 0x097F),
    },
    "gu": {
        "name": "Gujarati",
        "native": "ગુજરાતી",
        "script": "gujarati",
        "region": "indian",
        "unicode_range": (0x0A80, 0x0AFF),
    },
    # ── Hinglish (special) ─────────────────
    "hinglish": {
        "name": "Hinglish",
        "native": "Hinglish",
        "script": "roman",
        "region": "indian",
        "unicode_range": None,
    },
    # ── International languages ────────────
    "es": {"name": "Spanish",    "native": "Español",    "script": "latin",    "region": "international"},
    "fr": {"name": "French",     "native": "Français",   "script": "latin",    "region": "international"},
    "de": {"name": "German",     "native": "Deutsch",    "script": "latin",    "region": "international"},
    "pt": {"name": "Portuguese", "native": "Português",  "script": "latin",    "region": "international"},
    "ar": {"name": "Arabic",     "native": "العربية",     "script": "arabic",   "region": "international", "unicode_range": (0x0600, 0x06FF)},
    "ru": {"name": "Russian",    "native": "Русский",    "script": "cyrillic", "region": "international", "unicode_range": (0x0400, 0x04FF)},
    "ja": {"name": "Japanese",   "native": "日本語",      "script": "cjk",      "region": "international"},
    "zh": {"name": "Chinese",    "native": "中文",        "script": "cjk",      "region": "international"},
    "ko": {"name": "Korean",     "native": "한국어",      "script": "hangul",   "region": "international", "unicode_range": (0xAC00, 0xD7AF)},
    "it": {"name": "Italian",    "native": "Italiano",   "script": "latin",    "region": "international"},
    "nl": {"name": "Dutch",      "native": "Nederlands", "script": "latin",    "region": "international"},
    "tr": {"name": "Turkish",    "native": "Türkçe",     "script": "latin",    "region": "international"},
    "pl": {"name": "Polish",     "native": "Polski",     "script": "latin",    "region": "international"},
    "en": {"name": "English",    "native": "English",    "script": "latin",    "region": "international"},
}

# ─────────────────────────────────────────────
# Hinglish vocabulary (Romanised Hindi used in WhatsApp chats)
# ─────────────────────────────────────────────

HINGLISH_WORDS = {
    # Common words
    "nahi", "nahin", "haan", "yaar", "bhai", "dost", "kya", "toh", "hai",
    "mujhe", "mera", "meri", "tera", "teri", "uska", "unka", "aap", "tum",
    "main", "hum", "wo", "woh", "koi", "kuch", "sab", "bahut", "thoda",
    # Emotions / reactions
    "pagal", "accha", "theek", "bilkul", "ekdam", "zaroor", "pakka",
    "acha", "chal", "kal", "abhi", "pehle", "baad", "phir", "fir",
    "kyun", "kyunki", "isliye", "lekin", "magar", "par", "aur",
    # Sentiment words
    "khush", "dukhi", "pareshan", "tension", "mast", "bindaas", "shandar",
    "bekar", "bakwaas", "ganda", "achha", "sundar", "pyaar", "nafrat",
    "dard", "tadap", "yaad", "bhool", "maafi", "shukriya", "dhanyavaad",
    # Chat-specific
    "lol", "haha", "arrey", "arre", "oye", "ayo", "chalo", "bolo",
    "bol", "sun", "dekh", "aa", "ja", "kar", "karo", "ho", "hua",
    "raha", "rahi", "gaya", "gayi", "aaya", "aayi",
    # Common English-Hindi mashup patterns
    "kaisa", "kaisi", "kaise", "kitna", "kitni", "kitne", "kahan",
    "yahan", "wahan", "idhar", "udhar", "andar", "bahar",
    "thik", "sahi", "galat", "wala", "wali", "wale",
}

HINGLISH_POSITIVE_WORDS = {
    "khush", "mast", "bindaas", "shandar", "badiya", "zabardast", "ekdam",
    "super", "best", "accha", "achha", "theek", "bilkul", "zaroor", "pakka",
    "pyaar", "shukriya", "dhanyavaad", "waah", "wah", "arrey waah",
    "badia", "sahi", "maja", "maza", "maja aa gaya", "full on", "jhakaas",
}

HINGLISH_NEGATIVE_WORDS = {
    "bekar", "bakwaas", "ganda", "bura", "galat", "nahi", "nahin",
    "dard", "tadap", "dukhi", "pareshan", "tension", "baar baar",
    "bura laga", "dil dukha", "nafrat", "gussa", "chidchida", "tang",
    "thak", "thaka", "rona", "ro raha", "ro rahi", "aansu",
}

# ─────────────────────────────────────────────
# Multilingual positive/negative lexicons
# ─────────────────────────────────────────────

MULTILINGUAL_SENTIMENT_WORDS: Dict[str, Dict[str, List[str]]] = {
    "hi": {
        "positive": [
            "खुश", "प्रसन्न", "अच्छा", "बढ़िया", "शानदार", "प्यार", "धन्यवाद",
            "आनंद", "सुखी", "उत्साहित", "मस्त", "बेहतरीन", "जबरदस्त",
        ],
        "negative": [
            "दुखी", "परेशान", "बुरा", "नाराज़", "गुस्सा", "चिंता", "दर्द",
            "नफरत", "रोना", "तकलीफ", "बेकार", "बकवास",
        ],
    },
    "bn": {
        "positive": ["খুশি", "ভালো", "সুন্দর", "আনন্দ", "প্রেম", "ধন্যবাদ", "দারুণ"],
        "negative": ["দুঃখ", "রাগ", "ঘৃণা", "কষ্ট", "খারাপ", "বিরক্ত"],
    },
    "ta": {
        "positive": ["மகிழ்ச்சி", "அன்பு", "நல்லது", "அருமை", "நன்றி", "சந்தோஷம்"],
        "negative": ["சோகம்", "கோபம்", "வலி", "வெறுப்பு", "கஷ்டம்"],
    },
    "te": {
        "positive": ["సంతోషం", "ప్రేమ", "మంచిది", "థాంక్యూ", "అద్భుతం"],
        "negative": ["దుఃఖం", "కోపం", "నొప్పి", "అసహ్యం", "కష్టం"],
    },
    "mr": {
        "positive": ["आनंद", "छान", "प्रेम", "आभार", "शानदार", "मस्त"],
        "negative": ["दुःख", "राग", "खराब", "त्रास", "वेदना"],
    },
    "gu": {
        "positive": ["ખુશ", "સારું", "પ્રેમ", "આભાર", "અદ્ભુત", "મસ્ત"],
        "negative": ["દુઃખ", "ગુસ્સો", "ખરાબ", "તકલીફ", "ઘૃણા"],
    },
    "es": {
        "positive": ["feliz", "alegre", "amor", "gracias", "excelente", "genial", "maravilloso"],
        "negative": ["triste", "enojado", "odio", "dolor", "terrible", "malo", "peor"],
    },
    "fr": {
        "positive": ["heureux", "joyeux", "amour", "merci", "excellent", "magnifique", "super"],
        "negative": ["triste", "en colère", "haine", "douleur", "terrible", "mauvais", "pire"],
    },
    "de": {
        "positive": ["glücklich", "froh", "liebe", "danke", "ausgezeichnet", "wunderbar", "toll"],
        "negative": ["traurig", "wütend", "hass", "schmerz", "schrecklich", "schlecht", "schlimmer"],
    },
    "pt": {
        "positive": ["feliz", "alegre", "amor", "obrigado", "excelente", "maravilhoso", "ótimo"],
        "negative": ["triste", "com raiva", "ódio", "dor", "terrível", "mau", "pior"],
    },
    "ar": {
        "positive": ["سعيد", "فرح", "حب", "شكرا", "ممتاز", "رائع", "جميل"],
        "negative": ["حزين", "غاضب", "كره", "ألم", "سيء", "رهيب", "أسوأ"],
    },
    "ru": {
        "positive": ["счастливый", "радостный", "любовь", "спасибо", "отлично", "прекрасный"],
        "negative": ["грустный", "злой", "ненависть", "боль", "ужасный", "плохой"],
    },
    "it": {
        "positive": ["felice", "allegro", "amore", "grazie", "eccellente", "meraviglioso"],
        "negative": ["triste", "arrabbiato", "odio", "dolore", "terribile", "pessimo"],
    },
    "nl": {
        "positive": ["blij", "gelukkig", "liefde", "dankjewel", "uitstekend", "geweldig"],
        "negative": ["verdrietig", "boos", "haat", "pijn", "verschrikkelijk", "slecht"],
    },
    "tr": {
        "positive": ["mutlu", "sevinçli", "aşk", "teşekkür", "mükemmel", "harika"],
        "negative": ["üzgün", "kızgın", "nefret", "acı", "korkunç", "kötü"],
    },
    "pl": {
        "positive": ["szczęśliwy", "radosny", "miłość", "dziękuję", "świetny", "cudowny"],
        "negative": ["smutny", "zły", "nienawiść", "ból", "straszny", "zły"],
    },
    "ja": {
        "positive": ["嬉しい", "楽しい", "愛", "ありがとう", "素晴らしい", "最高"],
        "negative": ["悲しい", "怒り", "嫌い", "痛み", "ひどい", "最悪"],
    },
    "zh": {
        "positive": ["快乐", "高兴", "爱", "谢谢", "很好", "棒", "美好"],
        "negative": ["悲伤", "愤怒", "恨", "痛", "糟糕", "最坏"],
    },
    "ko": {
        "positive": ["행복", "기쁨", "사랑", "감사", "훌륭한", "좋아"],
        "negative": ["슬픔", "화남", "미움", "고통", "최악", "나쁜"],
    },
}


class LanguageService:
    """Language detection, identification, and multilingual sentiment vocabulary"""

    def __init__(self):
        self._langdetect_available = False
        self._langdetect = None
        self._try_init_langdetect()

    def _try_init_langdetect(self):
        """Lazily try to import langdetect / langid"""
        try:
            import langdetect as ld
            self._langdetect = ld
            self._langdetect_available = True
            logger.info("langdetect loaded successfully")
        except ImportError:
            try:
                import langid
                self._langid = langid
                self._langdetect_available = False
                self._langid_available = True
                logger.info("langid loaded as fallback (langdetect not available)")
            except ImportError:
                logger.warning("Neither langdetect nor langid available – using rule-based detection")
                self._langid_available = False

    # ─── Public API ───────────────────────────────

    def detect_language(self, text: str) -> Tuple[str, float]:
        """
        Detect the language of *text*.

        Returns (lang_code, confidence) where lang_code is one of the keys in
        SUPPORTED_LANGUAGES or 'en' as the safe fallback.
        """
        if not text or len(text.strip()) < 3:
            return "en", 0.5

        # 1. Always check Hinglish first (before any Unicode scan)
        hinglish_score = self._score_hinglish(text)
        if hinglish_score >= 0.25:
            return "hinglish", min(hinglish_score * 1.2, 0.95)

        # 2. Script-based detection (very reliable for non-Latin scripts)
        script_lang = self._detect_by_script(text)
        if script_lang:
            return script_lang, 0.92

        # 3. Library-based detection for Latin-script languages
        lib_lang, lib_conf = self._detect_by_library(text)
        if lib_lang and lib_conf > 0.5:
            # Map to supported code or keep English
            mapped = self._map_to_supported(lib_lang)
            return mapped, lib_conf

        # 4. Keyword-based fallback for Romanised Indic scripts
        romanised = self._detect_romanised_indic(text)
        if romanised:
            return romanised, 0.70

        return "en", 0.60

    def get_sentiment_words(self, lang_code: str) -> Tuple[List[str], List[str]]:
        """Return (positive_words, negative_words) for the given language."""
        if lang_code == "hinglish":
            return list(HINGLISH_POSITIVE_WORDS), list(HINGLISH_NEGATIVE_WORDS)
        words = MULTILINGUAL_SENTIMENT_WORDS.get(lang_code, {})
        pos = words.get("positive", [])
        neg = words.get("negative", [])
        # Always extend with English words so hybrid text still works
        en_words = MULTILINGUAL_SENTIMENT_WORDS.get("en", {})
        pos = pos + en_words.get("positive", [])
        neg = neg + en_words.get("negative", [])
        return pos, neg

    def get_language_info(self, lang_code: str) -> Dict:
        """Return display information for a language code."""
        return SUPPORTED_LANGUAGES.get(lang_code, SUPPORTED_LANGUAGES["en"])

    def is_supported(self, lang_code: str) -> bool:
        return lang_code in SUPPORTED_LANGUAGES

    def list_supported(self) -> List[Dict]:
        return [
            {"code": code, **info}
            for code, info in SUPPORTED_LANGUAGES.items()
        ]

    # ─── Internal helpers ─────────────────────────

    def _score_hinglish(self, text: str) -> float:
        """Return 0-1 confidence that text is Hinglish."""
        words = re.findall(r"[a-zA-Z]+", text.lower())
        if not words:
            return 0.0
        matches = sum(1 for w in words if w in HINGLISH_WORDS)
        # Also check for common Hinglish substitution patterns
        hinglish_patterns = [
            r"\b(nahi|nahin|kyun|kyu|kaise|kaisa|kaisi)\b",
            r"\b(yaar|bhai|dost|oye|arre|arrey)\b",
            r"\b(haan|bilkul|pakka|ekdum|ekdam)\b",
            r"\b(kya|toh|hai|main|hum|aap|tum)\b",
            r"\b(accha|achha|thik|theek|sahi)\b",
            r"\b(gaya|gayi|aaya|aayi|raha|rahi)\b",
        ]
        pattern_score = sum(
            1 for p in hinglish_patterns if re.search(p, text.lower())
        )
        word_ratio = matches / max(len(words), 1)
        return word_ratio * 0.7 + min(pattern_score / len(hinglish_patterns), 1.0) * 0.3

    def _detect_by_script(self, text: str) -> Optional[str]:
        """Detect language from Unicode script blocks."""
        # Count non-ASCII characters per script
        script_counts: Dict[str, int] = {}
        for ch in text:
            cp = ord(ch)
            for code, info in SUPPORTED_LANGUAGES.items():
                r = info.get("unicode_range")
                if r and r[0] <= cp <= r[1]:
                    script_counts[code] = script_counts.get(code, 0) + 1
                    break
            # CJK unified ideographs
            if 0x4E00 <= cp <= 0x9FFF:
                script_counts["zh"] = script_counts.get("zh", 0) + 1
            # Hiragana / Katakana
            elif 0x3040 <= cp <= 0x30FF:
                script_counts["ja"] = script_counts.get("ja", 0) + 1

        if not script_counts:
            return None

        # Devanagari is shared by Hindi and Marathi – use 'hi' as default
        best = max(script_counts, key=lambda k: script_counts[k])
        # Marathi and Hindi share Devanagari; treat both as 'hi' unless
        # we can differentiate by vocab (good-enough for sentiment purposes)
        return best

    def _detect_by_library(self, text: str) -> Tuple[Optional[str], float]:
        """Use langdetect or langid library."""
        try:
            if self._langdetect_available and self._langdetect:
                from langdetect import detect_langs
                results = detect_langs(text)
                if results:
                    top = results[0]
                    return top.lang, top.prob
        except Exception:
            pass
        try:
            if hasattr(self, "_langid_available") and self._langid_available:
                lang, confidence = self._langid.classify(text)
                return lang, confidence
        except Exception:
            pass
        return None, 0.0

    def _detect_romanised_indic(self, text: str) -> Optional[str]:
        """Detect Romanised Indic (mostly covers Hinglish already, but also Telugu/Tamil transliteration)."""
        text_lower = text.lower()
        # Telugu transliteration markers
        if any(word in text_lower for word in ["nenu", "meeru", "undi", "ledu", "chestanu", "akkada"]):
            return "hinglish"  # treat transliterated as hinglish-style
        # Tamil transliteration markers
        if any(word in text_lower for word in ["naan", "ungalukku", "vanakkam", "romba", "enna"]):
            return "hinglish"
        return None

    def _map_to_supported(self, lang_code: str) -> str:
        """Map library lang code to our supported keys."""
        if lang_code in SUPPORTED_LANGUAGES:
            return lang_code
        # Common aliases
        aliases = {
            "zh-cn": "zh", "zh-tw": "zh",
            "pt-br": "pt", "pt-pt": "pt",
            "nb": "nl", "da": "nl",  # rough fallbacks
        }
        return aliases.get(lang_code, "en")

    @lru_cache(maxsize=500)
    def cached_detect(self, text: str) -> Tuple[str, float]:
        return self.detect_language(text)


# ── Singleton ──────────────────────────────────────────────────────────────────
language_service = LanguageService()
