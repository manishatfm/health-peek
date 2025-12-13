from motor.motor_asyncio import AsyncIOMotorCollection
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
from ..core.database import get_database
from ..models.schemas import AnalysisResponse, MoodTrendPoint

logger = logging.getLogger(__name__)

class AnalysisService:
    def __init__(self):
        self.db = None
        self.analysis_collection: AsyncIOMotorCollection = None
    
    def _get_collections(self):
        """Get database collections"""
        if self.db is None:
            self.db = get_database()
            self.analysis_collection = self.db.analysis_history
            self.chat_analyses_collection = self.db.chat_analyses
    
    async def save_analysis(self, user_id: str, message: str, sentiment: str, 
                          confidence: float, emotions: Dict, emoji_analysis: Optional[Dict] = None) -> str:
        """Save analysis result to database"""
        self._get_collections()
        
        analysis_doc = {
            "user_id": user_id,
            "message": message,
            "sentiment": sentiment,
            "confidence": confidence,
            "emotions": emotions,
            "emoji_analysis": emoji_analysis,
            "timestamp": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }
        
        try:
            result = await self.analysis_collection.insert_one(analysis_doc)
            analysis_id = str(result.inserted_id)
            logger.info(f"✅ Saved analysis with ID: {analysis_id} for user: {user_id}")
            return analysis_id
        except Exception as e:
            logger.error(f"❌ Failed to save analysis: {e}", exc_info=True)
            raise
    
    async def get_user_analyses(self, user_id: str, limit: int = 50, offset: int = 0, time_range: Optional[str] = None) -> List[Dict]:
        """Get user's analysis history with optional time range filtering (excludes bulk imports)"""
        self._get_collections()
        
        try:
            # Build query - exclude bulk imports from single message history
            # After migration, all bulk imports will have source="bulk_import"
            # Old messages without source field are assumed to be single messages
            query = {
                "user_id": user_id,
                "$or": [
                    {"source": {"$exists": False}},  # Old single messages (no source field)
                    {"source": {"$ne": "bulk_import"}}  # Messages with source != bulk_import
                ]
            }
            
            # Add time range filter if provided
            if time_range and time_range != "all":
                days = int(time_range.replace('d', ''))
                start_date = datetime.utcnow() - timedelta(days=days)
                query["timestamp"] = {"$gte": start_date}
            
            cursor = self.analysis_collection.find(query).sort("timestamp", -1).skip(offset).limit(limit)
            
            analyses = []
            async for doc in cursor:
                doc["id"] = str(doc["_id"])
                doc["analysis_id"] = doc["id"]
                del doc["_id"]
                analyses.append(doc)
            
            logger.info(f"✅ Retrieved {len(analyses)} analyses for user: {user_id} (time_range: {time_range}, excluding bulk imports)")
            return analyses
        except Exception as e:
            logger.error(f"❌ Failed to get user analyses: {e}", exc_info=True)
            raise
    
    async def get_dashboard_data(self, user_id: str, time_range: str = "30d") -> Dict:
        """Get dashboard statistics for user including chat analyses"""
        self._get_collections()
        
        # Calculate date range
        days = int(time_range.replace('d', ''))
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Aggregation pipeline for single message analyses
        pipeline = [
            {
                "$match": {
                    "user_id": user_id,
                    "timestamp": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_analyses": {"$sum": 1},
                    "avg_confidence": {"$avg": "$confidence"},
                    "sentiments": {"$push": "$sentiment"},
                    "confidences": {"$push": "$confidence"}
                }
            }
        ]
        
        result = await self.analysis_collection.aggregate(pipeline).to_list(1)
        
        # Get chat analyses data (now we rely on individual messages saved to analysis_history)
        # The chat import now extracts individual messages and saves them to analysis_history
        # So we don't need a separate aggregation for chat_analyses
        
        # Initialize default values
        total_analyses = 0
        avg_confidence = 0.0
        sentiments = []
        
        if result:
            data = result[0]
            sentiments = data["sentiments"]
            total_analyses = data["total_analyses"]
            avg_confidence = data["avg_confidence"]
        
        # Use only the sentiments from analysis_history (which now includes bulk import data)
        all_sentiments = sentiments
        
        if not all_sentiments:
            return {
                "wellbeingScore": 0.0,
                "riskLevel": "Unknown",
                "communicationFrequency": 0,
                "description": "Start analyzing messages to see your insights",
                "totalAnalyses": 0,
                "averageConfidence": 0.0,
                "sentimentDistribution": {"positive": 0, "negative": 0, "neutral": 0},
                "isEmpty": True
            }
        
        # Calculate sentiment distribution
        sentiment_dist = {
            "positive": all_sentiments.count("positive"),
            "negative": all_sentiments.count("negative"),
            "neutral": all_sentiments.count("neutral")
        }
        
        total_count = len(all_sentiments)
        
        # Calculate wellbeing score (0-10 scale)
        positive_ratio = sentiment_dist["positive"] / total_count if total_count > 0 else 0
        negative_ratio = sentiment_dist["negative"] / total_count if total_count > 0 else 0
        
        wellbeing_score = (positive_ratio * 10) - (negative_ratio * 5) + 5
        
        # No need to adjust for concerning chats - individual messages are already in analysis_history
        wellbeing_score = max(0, min(10, wellbeing_score))
        
        # Determine risk level
        if wellbeing_score >= 7:
            risk_level = "Low"
        elif wellbeing_score >= 4:
            risk_level = "Medium"
        else:
            risk_level = "High"
        
        # Generate description
        if wellbeing_score >= 7:
            description = "Your mental health indicators look positive. Keep up the good work!"
        elif wellbeing_score >= 4:
            description = "Your mental health shows some areas for improvement. Consider self-care activities."
        else:
            description = "Your indicators suggest you might benefit from professional support."
        
        return {
            "wellbeingScore": round(wellbeing_score, 1),
            "riskLevel": risk_level,
            "communicationFrequency": total_analyses,
            "description": description,
            "totalAnalyses": total_analyses,
            "averageConfidence": round(avg_confidence, 2) if avg_confidence else 0.0,
            "sentimentDistribution": sentiment_dist
        }
    
    async def get_mood_trends(self, user_id: str, time_range: str = "30d") -> Dict:
        """Get mood trends for user (now includes bulk import data from analysis_history)"""
        self._get_collections()
        
        # Calculate date range
        days = int(time_range.replace('d', ''))
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Aggregation pipeline for all analyses (includes bulk imports)
        pipeline = [
            {
                "$match": {
                    "user_id": user_id,
                    "timestamp": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$timestamp"
                        }
                    },
                    "avg_confidence": {"$avg": "$confidence"},
                    "sentiments": {"$push": "$sentiment"},
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]
        
        # Fetch data
        cursor = self.analysis_collection.aggregate(pipeline)
        
        # Process data by date
        date_data = {}
        
        async for doc in cursor:
            date = doc["_id"]
            date_data[date] = {
                "sentiments": doc["sentiments"],
                "confidence": doc["avg_confidence"],
                "count": doc["count"]
            }
        
        # Convert to trends
        trends = []
        for date in sorted(date_data.keys()):
            data = date_data[date]
            sentiments = data["sentiments"]
            confidence = data["confidence"]
            count = data["count"]
            
            # Determine dominant sentiment for the day
            sentiment_counts = {
                "positive": sentiments.count("positive"),
                "negative": sentiments.count("negative"),
                "neutral": sentiments.count("neutral")
            }
            
            dominant_sentiment = max(sentiment_counts, key=sentiment_counts.get)
            
            trends.append(MoodTrendPoint(
                date=date,
                sentiment=dominant_sentiment,
                confidence=round(confidence, 2),
                count=count
            ))
        
        return {
            "trends": trends,
            "timeRange": time_range,
            "totalDataPoints": len(trends)
        }
    
    async def get_analysis_by_id(self, analysis_id: str, user_id: str) -> Optional[Dict]:
        """Get specific analysis by ID"""
        self._get_collections()
        
        try:
            analysis = await self.analysis_collection.find_one({
                "_id": ObjectId(analysis_id),
                "user_id": user_id
            })
            
            if analysis:
                analysis["id"] = str(analysis["_id"])
                analysis["analysis_id"] = analysis["id"]
                del analysis["_id"]
            
            return analysis
        except Exception as e:
            logger.error(f"Error getting analysis by ID: {e}")
            return None
    
    async def delete_analysis(self, analysis_id: str, user_id: str) -> bool:
        """Delete analysis"""
        self._get_collections()
        
        try:
            result = await self.analysis_collection.delete_one({
                "_id": ObjectId(analysis_id),
                "user_id": user_id
            })
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting analysis: {e}")
            return False
    
    async def get_bulk_import_analyses(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get user's bulk import analysis history (separate from single messages)"""
        self._get_collections()
        
        try:
            # Build query - only get bulk imports
            query = {
                "user_id": user_id,
                "source": "bulk_import"
            }
            
            cursor = self.analysis_collection.find(query).sort("timestamp", -1).skip(offset).limit(limit)
            
            analyses = []
            async for doc in cursor:
                doc["id"] = str(doc["_id"])
                doc["analysis_id"] = doc["id"]
                del doc["_id"]
                analyses.append(doc)
            
            logger.info(f"✅ Retrieved {len(analyses)} bulk import analyses for user: {user_id}")
            return analyses
        except Exception as e:
            logger.error(f"❌ Failed to get bulk import analyses: {e}", exc_info=True)
            raise

# Singleton instance
analysis_service = AnalysisService()