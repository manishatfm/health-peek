import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings:
    # API Configuration
    API_TITLE = "Mental Health Chat Analyzer API"
    API_VERSION = "1.0.0"
    API_DESCRIPTION = "AI-powered mental health chat analysis platform"
    
    # Database Configuration
    DATABASE_URL = os.getenv("DATABASE_URL", "mongodb://localhost:27017")
    DATABASE_NAME = os.getenv("DATABASE_NAME", "mental_health_db")
    
    # Security Configuration
    JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-here")
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_HOURS = 24
    
    # CORS Configuration
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000"
    ]
    
    # Server Configuration
    HOST = "0.0.0.0"
    PORT = 8000
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    
    # AI Model Configuration
    SENTIMENT_MODEL = "j-hartmann/emotion-english-distilroberta-base"
    EMOTION_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"
    
    # File Upload Configuration
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_FILE_TYPES = ["text/plain", "application/json", "text/csv"]

settings = Settings()