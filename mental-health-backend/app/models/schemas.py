from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# Authentication Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    profile_image: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    profile_image: Optional[str] = None
    created_at: datetime
    is_active: bool = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    profile_image: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

# Message Analysis Models
class MessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)

class BulkMessageRequest(BaseModel):
    messages: List[str] = Field(..., min_items=1, max_items=100)

class AnalysisResponse(BaseModel):
    message: str
    sentiment: str
    confidence: float
    emotions: dict
    emoji_analysis: Optional[dict] = None
    timestamp: datetime
    analysis_id: Optional[str] = None

class BulkAnalysisResponse(BaseModel):
    results: List[AnalysisResponse]
    summary: dict
    total_processed: int

# Dashboard Models
class DashboardResponse(BaseModel):
    wellbeingScore: float
    riskLevel: str
    communicationFrequency: int
    description: str
    totalAnalyses: int
    averageConfidence: float
    sentimentDistribution: dict

class MoodTrendPoint(BaseModel):
    date: str
    sentiment: str
    confidence: float
    count: int

class MoodTrendsResponse(BaseModel):
    trends: List[MoodTrendPoint]
    timeRange: str
    totalDataPoints: int

class Suggestion(BaseModel):
    title: str
    description: str
    category: str
    priority: str
    blog_id: Optional[str] = None
    external_url: Optional[str] = None

class SuggestionsResponse(BaseModel):
    suggestions: List[Suggestion]
    basedOnAnalysis: bool

# Chat Import Models
class ChatImportRequest(BaseModel):
    content: str = Field(..., min_length=10)
    format_type: Optional[str] = None  # 'whatsapp', 'telegram', 'discord', 'generic'
    current_user_name: Optional[str] = None  # To identify "you" vs "other"

class ChatMessage(BaseModel):
    timestamp: datetime
    sender: str
    message: str
    platform: str

class ChatAnalysisResponse(BaseModel):
    analysis_id: str
    participants: dict
    basic_stats: dict
    messaging_patterns: dict
    engagement_metrics: dict
    sentiment_analysis: dict
    red_flags: dict
    emoji_stats: dict
    time_analysis: dict
    conversation_period: dict
    total_messages_analyzed: int
    format_detected: str