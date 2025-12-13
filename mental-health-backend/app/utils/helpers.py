from typing import Any, Dict, Optional
import json
from datetime import datetime

class APIResponse:
    """Standardized API response format"""
    
    @staticmethod
    def success(data: Any = None, message: str = "Success") -> Dict:
        """Create successful response"""
        return {
            "success": True,
            "message": message,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def error(message: str = "An error occurred", code: Optional[str] = None, details: Any = None) -> Dict:
        """Create error response"""
        response = {
            "success": False,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if code:
            response["error_code"] = code
            
        if details:
            response["details"] = details
            
        return response
    
    @staticmethod
    def paginated(data: list, total: int, page: int = 1, limit: int = 50) -> Dict:
        """Create paginated response"""
        return {
            "success": True,
            "data": data,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "has_next": (page * limit) < total,
                "has_prev": page > 1
            },
            "timestamp": datetime.utcnow().isoformat()
        }

def sanitize_input(text: str, max_length: int = 5000) -> str:
    """Sanitize user input text"""
    if not text:
        return ""
    
    # Remove null bytes and control characters
    text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\r\t')
    
    # Truncate if too long
    if len(text) > max_length:
        text = text[:max_length]
    
    return text.strip()

def format_confidence(confidence: float) -> float:
    """Format confidence score to 3 decimal places"""
    return round(confidence, 3)