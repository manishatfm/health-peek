"""AI Emotional Companion Service - context builder + LLM integration"""
import logging
import httpx
import os
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from typing import List, Dict

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


class CompanionService:

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "")

    def _get_db(self):
        from ..core.database import get_database
        return get_database()

    # ------------------------------------------------------------------ #
    #  Context builder                                                     #
    # ------------------------------------------------------------------ #

    async def get_user_context(self, user_id: str) -> dict:
        """Pull recent analysis data and distil it into an emotional context object"""
        db = self._get_db()
        seven_days_ago = datetime.utcnow() - timedelta(days=7)

        cursor = db.analysis_history.find(
            {"user_id": user_id, "timestamp": {"$gte": seven_days_ago}}
        ).sort("timestamp", -1).limit(200)

        docs = await cursor.to_list(200)

        if not docs:
            return {
                "last_3_days": [],
                "dominant_emotions": [],
                "patterns": [],
                "risk_level": "low",
                "negative_ratio": 0.0,
                "total_recent": 0,
            }

        # --- daily mood breakdown ---
        daily: dict = defaultdict(list)
        for doc in docs:
            day = doc["timestamp"].strftime("%Y-%m-%d")
            daily[day].append(doc.get("sentiment", "neutral"))

        sorted_days = sorted(daily.keys(), reverse=True)
        last_3_days = []
        for day in sorted_days[:3]:
            dominant = Counter(daily[day]).most_common(1)[0][0]
            last_3_days.append(dominant)

        # --- emotion frequency ---
        emotion_counts: dict = defaultdict(int)
        for doc in docs:
            for emotion, score in (doc.get("emotions") or {}).items():
                if score > 0.35:
                    emotion_counts[emotion] += 1
        top_emotions = [e for e, _ in sorted(emotion_counts.items(), key=lambda x: -x[1])[:4]]

        # --- late-night activity (after 10 pm or before 4 am) ---
        late_night = sum(
            1 for d in docs
            if d.get("timestamp") and (d["timestamp"].hour >= 22 or d["timestamp"].hour < 4)
        )

        # --- frequency change: compare last 3 days vs prev 4 days ---
        three_days_ago = datetime.utcnow() - timedelta(days=3)
        recent_3 = sum(1 for d in docs if d["timestamp"] >= three_days_ago)
        older_4 = len(docs) - recent_3
        avg_older = older_4 / 4 if older_4 else 0
        avg_recent = recent_3 / 3 if recent_3 else 0

        # --- patterns ---
        patterns = []
        if late_night >= 3:
            patterns.append("late night activity")
        if len(docs) == 0:
            patterns.append("recent inactivity")
        if avg_recent < avg_older * 0.4 and avg_older > 0:
            patterns.append("sudden decrease in activity")
        if avg_recent > avg_older * 2 and avg_older > 0:
            patterns.append("sudden spike in activity")

        # --- risk level ---
        sentiments = [d.get("sentiment", "neutral") for d in docs]
        total = len(sentiments) or 1
        neg_ratio = sentiments.count("negative") / total

        if neg_ratio > 0.6:
            risk_level = "high"
        elif neg_ratio > 0.35:
            risk_level = "moderate"
        else:
            risk_level = "low"

        return {
            "last_3_days": last_3_days,
            "dominant_emotions": top_emotions,
            "patterns": patterns,
            "risk_level": risk_level,
            "negative_ratio": round(neg_ratio, 2),
            "total_recent": len(docs),
        }

    # ------------------------------------------------------------------ #
    #  System prompt builder                                               #
    # ------------------------------------------------------------------ #

    def build_system_prompt(self, context: dict) -> str:
        """Translate raw context into a natural-language brief for the LLM"""
        lines = []
        last_3 = context.get("last_3_days", [])
        neg_count = last_3.count("negative")
        pos_count = last_3.count("positive")

        # mood summary
        if neg_count >= 2:
            lines.append("The user has been in a low mood for the past few days.")
        elif neg_count == 1:
            lines.append("The user has had some low moments recently.")
        elif pos_count >= 2:
            lines.append("The user has been in a generally positive mood lately.")
        else:
            lines.append("The user's mood has been mixed or neutral recently.")

        # dominant emotions → soft signals
        emotions = context.get("dominant_emotions", [])
        if any(e in emotions for e in ["sadness", "grief", "remorse"]):
            lines.append("There are signs of sadness underneath the surface.")
        if any(e in emotions for e in ["anger", "annoyance", "disgust"]):
            lines.append("There's some frustration or irritability present.")
        if any(e in emotions for e in ["fear", "nervousness", "worry"]):
            lines.append("There's some anxiety or restlessness in their recent state.")
        if "joy" in emotions and neg_count == 0:
            lines.append("Overall the user seems to be in an upbeat place.")

        # patterns
        if "late night activity" in context.get("patterns", []):
            lines.append(
                "The user has been active late at night — this may hint at sleep issues or restlessness."
            )
        if "sudden decrease in activity" in context.get("patterns", []):
            lines.append("They've been quieter than usual lately.")
        if "sudden spike in activity" in context.get("patterns", []):
            lines.append("They've been more expressive than usual — possibly going through something.")

        # risk
        risk = context.get("risk_level", "low")
        if risk == "high":
            lines.append(
                "Emotional risk indicators are elevated — be especially warm and, when appropriate, "
                "calmly suggest they talk to someone they trust or a professional."
            )
        elif risk == "moderate":
            lines.append(
                "There are moderate emotional risk indicators — be supportive and check in gently."
            )

        context_text = " ".join(lines) if lines else "The user seems to be doing reasonably okay."

        return f"""You are an AI emotional companion inside a mental wellbeing app.

Internal context about this user (do NOT reveal this to them):
{context_text}

Your personality & rules:
- Talk like a caring friend texting — casual, short, warm
- Short to medium replies — never long paragraphs or lists
- Empathy always comes before advice
- Reference what the user says naturally
- Ask one gentle follow-up at a time
- Never say "your sentiment is...", "data shows...", or mention any system/AI
- Never give more than one suggestion in a reply
- If risk is elevated, gently and calmly encourage talking to someone — never alarming
- Keep replies open-ended so the conversation keeps flowing

Tone examples:
"hmm that sounds rough, what's been going on?"
"yeah I get that feeling... has this been building up for a while?"
"sounds like a lot on your plate lately"
"that makes sense honestly"
"""

    # ------------------------------------------------------------------ #
    #  LLM call                                                            #
    # ------------------------------------------------------------------ #

    async def chat(
        self,
        user_id: str,
        message: str,
        conversation_history: List[Dict],
    ) -> str:
        """Build context, compose prompt, call Groq, return reply text"""
        if not self.api_key:
            logger.warning("GROQ_API_KEY not set — companion unavailable")
            return "I'm having a bit of trouble connecting right now. Try again in a moment?"

        context = await self.get_user_context(user_id)
        system_prompt = self.build_system_prompt(context)

        # Build messages array: system + history + new user message
        messages = [{"role": "system", "content": system_prompt}]

        # Keep last 10 turns to stay within token limits
        for turn in conversation_history[-10:]:
            if turn.get("role") in ("user", "assistant") and turn.get("content"):
                messages.append({"role": turn["role"], "content": turn["content"]})

        messages.append({"role": "user", "content": message})

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    GROQ_API_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": GROQ_MODEL,
                        "messages": messages,
                        "max_tokens": 200,
                        "temperature": 0.85,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                reply = data["choices"][0]["message"]["content"].strip()
                logger.info(f"Companion reply generated for user {user_id}")
                return reply

        except httpx.HTTPStatusError as e:
            logger.error(f"Groq API error {e.response.status_code}: {e.response.text}")
            return "hmm, something went wrong on my end. want to try again?"
        except Exception as e:
            logger.error(f"Companion chat error: {e}")
            return "I'm here, just having a little trouble. try again?"


companion_service = CompanionService()
