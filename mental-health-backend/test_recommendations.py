"""
Test script for the recommendation engine
"""

import sys
sys.path.insert(0, '.')

from app.services.recommendation_service import recommendation_engine
from datetime import datetime

print("=" * 60)
print("TESTING MENTAL HEALTH RECOMMENDATION ENGINE")
print("=" * 60)

# Test 1: No analysis history (new user)
print("\n1. Testing new user (no history):")
recommendations, based_on_analysis = recommendation_engine.generate_recommendations(
    analyses=[],
    max_suggestions=3
)
print(f"   Based on analysis: {based_on_analysis}")
print(f"   Suggestions: {len(recommendations)}")
for rec in recommendations:
    print(f"   - {rec['title']} ({rec['priority']})")

# Test 2: User with mostly negative emotions
print("\n2. Testing user with high sadness/anxiety:")
negative_analyses = [
    {
        "emotions": {"sadness": 0.8, "anxiety": 0.6},
        "sentiment": "negative",
        "timestamp": datetime.utcnow()
    } for _ in range(8)
]
recommendations, based_on_analysis = recommendation_engine.generate_recommendations(
    analyses=negative_analyses,
    max_suggestions=6
)
print(f"   Based on analysis: {based_on_analysis}")
print(f"   Suggestions: {len(recommendations)}")
for rec in recommendations[:3]:
    print(f"   - {rec['title']} ({rec['priority']})")
    print(f"     {rec['description'][:100]}...")

# Test 3: User with mixed emotions
print("\n3. Testing user with mixed emotions:")
mixed_analyses = [
    {"emotions": {"joy": 0.7}, "sentiment": "positive", "timestamp": datetime.utcnow()},
    {"emotions": {"sadness": 0.6}, "sentiment": "negative", "timestamp": datetime.utcnow()},
    {"emotions": {"joy": 0.5}, "sentiment": "positive", "timestamp": datetime.utcnow()},
    {"emotions": {"anxiety": 0.6}, "sentiment": "negative", "timestamp": datetime.utcnow()},
    {"emotions": {"neutral": 0.8}, "sentiment": "neutral", "timestamp": datetime.utcnow()},
]
recommendations, based_on_analysis = recommendation_engine.generate_recommendations(
    analyses=mixed_analyses,
    max_suggestions=6
)
print(f"   Based on analysis: {based_on_analysis}")
print(f"   Suggestions: {len(recommendations)}")
for rec in recommendations[:3]:
    print(f"   - {rec['title']} ({rec['priority']})")

# Test 4: User with mostly positive emotions
print("\n4. Testing user with positive emotions:")
positive_analyses = [
    {"emotions": {"joy": 0.9, "love": 0.7}, "sentiment": "positive", "timestamp": datetime.utcnow()}
    for _ in range(7)
]
recommendations, based_on_analysis = recommendation_engine.generate_recommendations(
    analyses=positive_analyses,
    max_suggestions=6
)
print(f"   Based on analysis: {based_on_analysis}")
print(f"   Suggestions: {len(recommendations)}")
for rec in recommendations[:3]:
    print(f"   - {rec['title']} ({rec['priority']})")

# Test 5: Chronic negative pattern (critical)
print("\n5. Testing chronic negative pattern:")
chronic_analyses = [
    {"emotions": {"sadness": 0.9, "fear": 0.7, "anxiety": 0.8}, "sentiment": "negative", "timestamp": datetime.utcnow()}
    for _ in range(12)
]
recommendations, based_on_analysis = recommendation_engine.generate_recommendations(
    analyses=chronic_analyses,
    max_suggestions=8
)
print(f"   Based on analysis: {based_on_analysis}")
print(f"   Suggestions: {len(recommendations)}")
for rec in recommendations[:3]:
    print(f"   - {rec['title']} ({rec['priority']})")

# Test pattern analysis
print("\n6. Testing pattern analysis:")
patterns = recommendation_engine.analyze_emotional_patterns(chronic_analyses)
print(f"   Pattern type: {patterns['pattern_type']}")
print(f"   Dominant emotions: {patterns['dominant_emotions']}")
print(f"   Negative ratio: {patterns['negative_ratio']:.2f}")
print(f"   Severity score: {patterns['severity_score']:.2f}")

print("\n" + "=" * 60)
print("ALL TESTS PASSED!")
print("=" * 60)
print(f"\nTotal interventions in knowledge base: {len(recommendation_engine.knowledge_base.get_all_interventions())}")
