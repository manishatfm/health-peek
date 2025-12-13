"""
Mental Health Recommendation Service
Provides evidence-based, personalized mental health recommendations based on user's emotional patterns
"""

from typing import List, Dict, Tuple
from datetime import datetime, timedelta
import logging
from collections import Counter
import asyncio

logger = logging.getLogger(__name__)

class MentalHealthKnowledgeBase:
    """
    Evidence-based mental health interventions mapped to emotional patterns
    Based on CBT, DBT, ACT, and other validated therapeutic approaches
    """
    
    # Evidence-based interventions for different emotional patterns
    INTERVENTIONS = {
        # High negative emotions (sadness, anxiety, fear, anger)
        "high_negative": [
            {
                "title": "Practice Cognitive Restructuring",
                "description": "Challenge negative thoughts by examining evidence for and against them. Ask yourself: 'Is this thought based on facts or feelings?' This CBT technique helps break patterns of negative thinking.",
                "category": "cognitive-behavioral",
                "priority": "high",
                "conditions": ["sadness", "anxiety", "fear"],
                "severity_threshold": 0.6,
                "blog_id": "cognitive-restructuring"
            },
            {
                "title": "Use the STOP Skill for Emotional Regulation",
                "description": "When overwhelmed: Stop what you're doing, Take a step back, Observe your thoughts and feelings, Proceed mindfully. This DBT technique prevents impulsive reactions to difficult emotions.",
                "category": "emotional-regulation",
                "priority": "high",
                "conditions": ["anger", "anxiety", "fear"],
                "severity_threshold": 0.5,
                "blog_id": "dbt-stop-skill"
            },
            {
                "title": "Progressive Muscle Relaxation",
                "description": "Systematically tense and relax different muscle groups to reduce physical anxiety. Start with your toes and work up to your head, holding tension for 5 seconds then releasing.",
                "category": "anxiety-management",
                "priority": "high",
                "conditions": ["anxiety", "fear", "nervousness"],
                "severity_threshold": 0.5,
                "blog_id": "progressive-muscle-relaxation"
            },
            {
                "title": "Behavioral Activation for Depression",
                "description": "Schedule and engage in activities you used to enjoy, even if you don't feel like it. Start small with achievable goals. Activity itself can improve mood through action, not motivation.",
                "category": "depression-treatment",
                "priority": "high",
                "conditions": ["sadness", "grief", "disappointment"],
                "severity_threshold": 0.6,
                "blog_id": "behavioral-activation"
            },
            {
                "title": "Grounding Technique (5-4-3-2-1)",
                "description": "For anxiety or panic: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste. This anchors you to the present moment and reduces emotional overwhelm.",
                "category": "crisis-management",
                "priority": "critical",
                "conditions": ["anxiety", "fear", "panic"],
                "severity_threshold": 0.7,
                "blog_id": "grounding-5-4-3-2-1"
            },
        ],
        
        # Persistent negative patterns
        "chronic_negative": [
            {
                "title": "Consider Professional Mental Health Support",
                "description": "Your patterns suggest persistent emotional difficulties. A licensed therapist can provide personalized strategies and support. Many offer online sessions and sliding scale fees.",
                "category": "professional-help",
                "priority": "critical",
                "conditions": ["persistent_negative"],
                "severity_threshold": 0.5,
                "external_url": "https://www.psychologytoday.com/us/therapists"
            },
            {
                "title": "Depression Screening and Resources",
                "description": "Persistent sadness may indicate clinical depression. Consider taking a PHQ-9 screening and reaching out to mental health services. Crisis resources: National Suicide Prevention Lifeline (988).",
                "category": "crisis-support",
                "priority": "critical",
                "conditions": ["chronic_sadness"],
                "severity_threshold": 0.6,
                "external_url": "https://988lifeline.org/"
            },
            {
                "title": "Build a Safety Plan",
                "description": "Create a written plan for managing intense emotions: warning signs, coping strategies, people to contact, safe environment steps, and crisis resources. Keep it accessible.",
                "category": "safety-planning",
                "priority": "critical",
                "conditions": ["crisis_pattern"],
                "severity_threshold": 0.7,
                "external_url": "https://www.suicidesafetyplan.com/"
            },
        ],
        
        # Mixed emotions (both positive and negative)
        "mixed_emotions": [
            {
                "title": "Practice Radical Acceptance",
                "description": "Acknowledge and accept reality as it is, without judgment. This doesn't mean approval, but reducing suffering by accepting what you cannot change while working on what you can.",
                "category": "acceptance-commitment",
                "priority": "medium",
                "conditions": ["mixed", "confusion", "ambivalence"],
                "severity_threshold": 0.4,
                "external_url": "https://www.verywellmind.com/what-is-radical-acceptance-5120614"
            },
            {
                "title": "Dialectical Thinking Exercises",
                "description": "Practice holding two truths simultaneously: 'I'm struggling AND I'm doing my best.' This DBT principle helps navigate complex emotions without black-and-white thinking.",
                "category": "dialectical-behavioral",
                "priority": "medium",
                "conditions": ["mixed", "confusion"],
                "severity_threshold": 0.4,
                "external_url": "https://dialecticalbehaviortherapy.com/mindfulness/dialectics/"
            },
            {
                "title": "Values Clarification Exercise",
                "description": "Identify your core values (e.g., connection, growth, creativity). Rate how your recent actions align with these values. Use this to guide decisions toward meaningful activities.",
                "category": "values-based",
                "priority": "medium",
                "conditions": ["mixed", "uncertainty"],
                "severity_threshold": 0.3,
                "external_url": "https://www.therapistaid.com/therapy-worksheet/values-clarification"
            },
        ],
        
        # Positive emotions (maintain and enhance)
        "positive": [
            {
                "title": "Gratitude Journaling",
                "description": "Write down 3 specific things you're grateful for each day, including why. Research shows this practice significantly boosts wellbeing and resilience over time.",
                "category": "positive-psychology",
                "priority": "low",
                "conditions": ["joy", "gratitude", "happiness"],
                "severity_threshold": 0.3,
                "external_url": "https://positivepsychology.com/gratitude-journal/"
            },
            {
                "title": "Savor Positive Experiences",
                "description": "When something good happens, pause to fully experience it. Share it with others, replay it mentally, and celebrate small wins. This amplifies positive emotions and builds resilience.",
                "category": "positive-psychology",
                "priority": "low",
                "conditions": ["joy", "love", "pride"],
                "severity_threshold": 0.3,
                "external_url": "https://www.psychologytoday.com/us/blog/click-here-happiness/201906/the-power-savoring"
            },
            {
                "title": "Build Social Connections",
                "description": "Your positive state is ideal for strengthening relationships. Reach out to friends, join community activities, or volunteer. Social connection is a key protective factor for mental health.",
                "category": "social-support",
                "priority": "low",
                "conditions": ["joy", "love", "excitement"],
                "severity_threshold": 0.3,
                "external_url": "https://www.helpguide.org/articles/mental-health/social-connection.htm"
            },
            {
                "title": "Establish Routine Protective Practices",
                "description": "Maintain your mental wellness by establishing routines: regular sleep schedule, daily movement, healthy eating, and time for activities you enjoy. Prevention is key.",
                "category": "maintenance",
                "priority": "medium",
                "conditions": ["positive_stable"],
                "severity_threshold": 0.2,
                "external_url": "https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/physical-health-and-mental-health"
            },
        ],
        
        # General self-care and skill-building
        "general": [
            {
                "title": "Daily Mindfulness Practice",
                "description": "Spend 5-10 minutes daily observing your breath without judgment. Mindfulness reduces stress, improves emotional regulation, and increases self-awareness. Apps like Insight Timer are free.",
                "category": "mindfulness",
                "priority": "medium",
                "conditions": ["any"],
                "severity_threshold": 0.0,
                "blog_id": "mindfulness-meditation"
            },
            {
                "title": "Sleep Hygiene Optimization",
                "description": "Maintain consistent sleep/wake times, avoid screens 1hr before bed, keep room cool and dark. Poor sleep significantly worsens mental health symptoms.",
                "category": "lifestyle",
                "priority": "medium",
                "conditions": ["any"],
                "severity_threshold": 0.0,
                "external_url": "https://www.sleepfoundation.org/sleep-hygiene"
            },
            {
                "title": "Physical Exercise for Mental Health",
                "description": "Aim for 30 minutes of moderate activity most days. Exercise is as effective as medication for mild-moderate depression and reduces anxiety. Start small and build gradually.",
                "category": "lifestyle",
                "priority": "medium",
                "conditions": ["any"],
                "severity_threshold": 0.0,
                "external_url": "https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/exercise-and-mental-health"
            },
            {
                "title": "Emotion Tracking and Awareness",
                "description": "Continue monitoring your emotional patterns. Awareness is the first step in emotional regulation. Notice triggers, patterns, and what helps you feel better.",
                "category": "self-awareness",
                "priority": "low",
                "conditions": ["any"],
                "severity_threshold": 0.0,
                "external_url": "https://www.psychologytoday.com/us/blog/click-here-happiness/201711/emotional-awareness"
            },
            {
                "title": "Creative Expression for Processing Emotions",
                "description": "Engage in art, music, writing, or other creative activities. Creative expression provides a healthy outlet for processing complex emotions and reduces stress.",
                "category": "creative-therapy",
                "priority": "low",
                "conditions": ["any"],
                "severity_threshold": 0.0,
                "external_url": "https://www.verywellmind.com/the-benefits-of-art-therapy-5191294"
            },
        ],
        
        # Anxiety-specific interventions
        "anxiety_focused": [
            {
                "title": "Worry Time Technique",
                "description": "Schedule 15 minutes daily for worrying. When anxious thoughts arise outside this time, postpone them. This prevents rumination from taking over your day.",
                "category": "anxiety-management",
                "priority": "high",
                "conditions": ["anxiety", "worry"],
                "severity_threshold": 0.5,
                "external_url": "https://www.anxietycanada.com/articles/how-to-do-worry-time/"
            },
            {
                "title": "Exposure Hierarchy for Fears",
                "description": "List feared situations from least to most anxiety-provoking. Gradually expose yourself to them starting with the easiest. This evidence-based approach reduces avoidance.",
                "category": "exposure-therapy",
                "priority": "high",
                "conditions": ["anxiety", "fear"],
                "severity_threshold": 0.6,
                "external_url": "https://www.verywellmind.com/exposure-therapy-definition-techniques-2671773"
            },
            {
                "title": "Box Breathing for Anxiety",
                "description": "Breathe in for 4 counts, hold 4, out 4, hold 4. Repeat for 5 minutes. This activates your parasympathetic nervous system, naturally reducing anxiety symptoms.",
                "category": "breathing-techniques",
                "priority": "high",
                "conditions": ["anxiety", "panic"],
                "severity_threshold": 0.5,
                "external_url": "https://www.healthline.com/health/box-breathing"
            },
        ],
        
        # Anger management
        "anger_management": [
            {
                "title": "Anger Iceberg Exploration",
                "description": "Anger often masks other emotions (hurt, fear, disappointment). Ask: 'What's beneath my anger?' Addressing root emotions leads to better resolution.",
                "category": "emotional-awareness",
                "priority": "high",
                "conditions": ["anger", "frustration", "annoyance"],
                "severity_threshold": 0.5,
                "external_url": "https://www.therapistaid.com/therapy-worksheet/anger-iceberg"
            },
            {
                "title": "Time-Out and Cool-Down Strategy",
                "description": "When anger rises, take a pre-agreed break (20-30 minutes). Use this time for physical activity or calming techniques, not rumination. Return when calmer.",
                "category": "anger-management",
                "priority": "high",
                "conditions": ["anger", "rage"],
                "severity_threshold": 0.6,
                "blog_id": "dbt-stop-skill"
            },
            {
                "title": "Assertive Communication Practice",
                "description": "Express needs using 'I' statements: 'I feel [emotion] when [situation] because [reason]. I need [request].' This reduces conflict while honoring your needs.",
                "category": "communication-skills",
                "priority": "medium",
                "conditions": ["anger", "frustration"],
                "severity_threshold": 0.4,
                "external_url": "https://www.verywellmind.com/assertive-communication-2795401"
            },
        ],
    }
    
    @classmethod
    def get_all_interventions(cls) -> List[Dict]:
        """Get all interventions flattened into a single list"""
        all_interventions = []
        for category_interventions in cls.INTERVENTIONS.values():
            all_interventions.extend(category_interventions)
        return all_interventions


class RecommendationEngine:
    """
    Intelligent recommendation engine that analyzes user's emotional history
    and provides personalized, evidence-based mental health suggestions
    """
    
    def __init__(self):
        self.knowledge_base = MentalHealthKnowledgeBase()
    
    def analyze_emotional_patterns(self, analyses: List[Dict]) -> Dict:
        """
        Analyze user's emotional patterns from their analysis history
        
        Returns:
            Dictionary with emotional pattern analysis
        """
        if not analyses:
            return {
                "has_data": False,
                "pattern_type": "no_data",
                "dominant_emotions": [],
                "sentiment_trend": "neutral",
                "severity_score": 0.0,
                "negative_ratio": 0.0,
                "positive_ratio": 0.0,
                "emotional_volatility": 0.0
            }
        
        # Collect all emotions and sentiments
        all_emotions = []
        sentiments = []
        emotion_scores = []
        
        for analysis in analyses:
            emotions = analysis.get("emotions", {})
            sentiment = analysis.get("sentiment", "neutral")
            
            # Collect emotions with their scores
            for emotion, score in emotions.items():
                all_emotions.append(emotion.lower())
                emotion_scores.append(score)
            
            sentiments.append(sentiment)
        
        # Calculate emotion frequency
        emotion_counter = Counter(all_emotions)
        dominant_emotions = [emotion for emotion, count in emotion_counter.most_common(5)]
        
        # Calculate sentiment distribution
        sentiment_counter = Counter(sentiments)
        total_sentiments = len(sentiments)
        
        negative_ratio = sentiment_counter.get("negative", 0) / max(total_sentiments, 1)
        positive_ratio = sentiment_counter.get("positive", 0) / max(total_sentiments, 1)
        neutral_ratio = sentiment_counter.get("neutral", 0) / max(total_sentiments, 1)
        
        # Determine sentiment trend (looking at most recent vs older)
        recent_sentiments = sentiments[:len(sentiments)//3] if len(sentiments) > 3 else sentiments
        recent_negative_ratio = recent_sentiments.count("negative") / max(len(recent_sentiments), 1)
        
        if recent_negative_ratio > 0.6:
            sentiment_trend = "declining"
        elif recent_negative_ratio < 0.2 and positive_ratio > 0.4:
            sentiment_trend = "improving"
        else:
            sentiment_trend = "stable"
        
        # Calculate severity score (0-1 scale based on negative emotions and frequency)
        severity_score = min(1.0, negative_ratio * 1.5)
        
        # Calculate emotional volatility (standard deviation of sentiment)
        sentiment_values = [1 if s == "positive" else (-1 if s == "negative" else 0) for s in sentiments]
        if len(sentiment_values) > 1:
            mean_sentiment = sum(sentiment_values) / len(sentiment_values)
            variance = sum((x - mean_sentiment) ** 2 for x in sentiment_values) / len(sentiment_values)
            volatility = variance ** 0.5
        else:
            volatility = 0.0
        
        # Determine pattern type
        pattern_type = self._determine_pattern_type(
            dominant_emotions,
            negative_ratio,
            positive_ratio,
            sentiment_trend,
            len(analyses)
        )
        
        return {
            "has_data": True,
            "pattern_type": pattern_type,
            "dominant_emotions": dominant_emotions,
            "sentiment_trend": sentiment_trend,
            "severity_score": severity_score,
            "negative_ratio": negative_ratio,
            "positive_ratio": positive_ratio,
            "neutral_ratio": neutral_ratio,
            "emotional_volatility": volatility,
            "total_analyses": len(analyses)
        }
    
    def _determine_pattern_type(
        self,
        dominant_emotions: List[str],
        negative_ratio: float,
        positive_ratio: float,
        sentiment_trend: str,
        total_analyses: int
    ) -> str:
        """Determine the overall emotional pattern type"""
        
        # Check for crisis patterns
        crisis_emotions = {"sadness", "fear", "anxiety", "panic", "grief"}
        crisis_count = sum(1 for e in dominant_emotions if e in crisis_emotions)
        
        if negative_ratio > 0.7 and crisis_count >= 2:
            return "chronic_negative"
        
        if negative_ratio > 0.6 and total_analyses >= 5:
            return "high_negative"
        
        # Check for anxiety patterns
        anxiety_emotions = {"anxiety", "fear", "nervousness", "worry", "panic"}
        anxiety_count = sum(1 for e in dominant_emotions if e in anxiety_emotions)
        
        if anxiety_count >= 2:
            return "anxiety_focused"
        
        # Check for anger patterns
        anger_emotions = {"anger", "rage", "frustration", "annoyance"}
        anger_count = sum(1 for e in dominant_emotions if e in anger_emotions)
        
        if anger_count >= 2:
            return "anger_management"
        
        # Mixed emotions
        if 0.3 <= negative_ratio <= 0.6:
            return "mixed_emotions"
        
        # Positive patterns
        if positive_ratio > 0.5:
            return "positive"
        
        # Default to general
        return "general"
    
    def generate_recommendations(
        self,
        analyses: List[Dict],
        max_suggestions: int = 8
    ) -> Tuple[List[Dict], bool]:
        """
        Generate personalized recommendations based on user's analysis history
        
        Args:
            analyses: List of user's recent analyses
            max_suggestions: Maximum number of suggestions to return
        
        Returns:
            Tuple of (list of recommendations, whether based on analysis)
        """
        
        # Handle case with no data
        if not analyses:
            return self._get_starter_suggestions(), False
        
        # Analyze patterns
        patterns = self.analyze_emotional_patterns(analyses)
        
        # Get relevant interventions
        recommendations = []
        
        # 1. Add pattern-specific interventions
        pattern_type = patterns["pattern_type"]
        if pattern_type in self.knowledge_base.INTERVENTIONS:
            pattern_interventions = self.knowledge_base.INTERVENTIONS[pattern_type]
            recommendations.extend(self._score_interventions(
                pattern_interventions,
                patterns
            ))
        
        # 2. Add general interventions
        general_interventions = self.knowledge_base.INTERVENTIONS["general"]
        recommendations.extend(self._score_interventions(
            general_interventions,
            patterns
        ))
        
        # 3. Sort by priority and score
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        recommendations.sort(
            key=lambda x: (
                priority_order.get(x["priority"], 3),
                -x.get("relevance_score", 0)
            )
        )
        
        # 4. Remove duplicates and limit
        seen_titles = set()
        unique_recommendations = []
        for rec in recommendations:
            if rec["title"] not in seen_titles:
                seen_titles.add(rec["title"])
                # Remove the internal scoring fields
                rec_clean = {k: v for k, v in rec.items() if k != "relevance_score"}
                unique_recommendations.append(rec_clean)
        
        return unique_recommendations[:max_suggestions], True
    
    def _score_interventions(
        self,
        interventions: List[Dict],
        patterns: Dict
    ) -> List[Dict]:
        """
        Score interventions based on relevance to user's patterns
        """
        scored = []
        
        for intervention in interventions:
            # Calculate relevance score
            score = 0.0
            
            # Check if conditions match dominant emotions
            conditions = intervention.get("conditions", [])
            dominant_emotions = patterns["dominant_emotions"]
            
            for condition in conditions:
                if condition == "any":
                    score += 0.2
                elif condition in dominant_emotions:
                    score += 0.5
                elif condition == "persistent_negative" and patterns["pattern_type"] == "chronic_negative":
                    score += 1.0
                elif condition == "chronic_sadness" and "sadness" in dominant_emotions:
                    score += 0.8
                elif condition == "crisis_pattern" and patterns["severity_score"] > 0.7:
                    score += 1.0
                elif condition == "positive_stable" and patterns["positive_ratio"] > 0.5:
                    score += 0.6
                elif condition == "mixed" and patterns["pattern_type"] == "mixed_emotions":
                    score += 0.5
            
            # Check severity threshold
            if patterns["severity_score"] >= intervention.get("severity_threshold", 0):
                score += 0.3
            
            # Bonus for critical priority items if severity is high
            if intervention["priority"] == "critical" and patterns["severity_score"] > 0.6:
                score += 0.5
            
            if score > 0:
                intervention_copy = intervention.copy()
                intervention_copy["relevance_score"] = score
                scored.append(intervention_copy)
        
        return scored
    
    def _get_starter_suggestions(self) -> List[Dict]:
        """Get starter suggestions for users with no analysis history"""
        return [
            {
                "title": "Welcome to Your Mental Health Journey",
                "description": "Start analyzing your messages to receive personalized, evidence-based mental health recommendations tailored to your emotional patterns.",
                "category": "getting-started",
                "priority": "low"
            },
            {
                "title": "Begin Emotion Tracking",
                "description": "Regular message analysis helps you identify patterns in your emotions. Self-awareness is the foundation of emotional wellbeing.",
                "category": "self-awareness",
                "priority": "low"
            },
            {
                "title": "Learn About the Tool",
                "description": "Our recommendations are based on Cognitive Behavioral Therapy (CBT), Dialectical Behavior Therapy (DBT), and other evidence-based approaches proven to improve mental health.",
                "category": "education",
                "priority": "low"
            }
        ]


# Singleton instance
recommendation_engine = RecommendationEngine()
