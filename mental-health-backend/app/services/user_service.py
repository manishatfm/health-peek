from motor.motor_asyncio import AsyncIOMotorCollection
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
from ..core.database import get_database
from ..models.schemas import UserCreate, UserResponse
from ..core.security import hash_password, verify_password

logger = logging.getLogger(__name__)

class UserService:
    def __init__(self):
        self.db = None
        self.users_collection: AsyncIOMotorCollection = None
    
    def _get_collections(self):
        """Get database collections"""
        if self.db is None:
            self.db = get_database()
            self.users_collection = self.db.users
    
    async def create_user(self, user_data: UserCreate) -> UserResponse:
        """Create a new user"""
        self._get_collections()
        
        logger.info(f"Attempting to create user with email: {user_data.email}")
        logger.info(f"Database connection: {self.db}")
        logger.info(f"Users collection: {self.users_collection}")
        
        # Check if user already exists
        existing_user = await self.users_collection.find_one({"email": user_data.email})
        if existing_user:
            logger.warning(f"User with email {user_data.email} already exists")
            raise ValueError("User with this email already exists")
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user document
        user_doc = {
            "email": user_data.email,
            "password": hashed_password,
            "full_name": user_data.full_name,
            "profile_image": user_data.profile_image,
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        
        logger.info(f"Inserting user document: {user_doc}")
        
        # Insert user
        result = await self.users_collection.insert_one(user_doc)
        
        logger.info(f"Insert result: {result}")
        logger.info(f"Inserted ID: {result.inserted_id}")
        logger.info(f"Acknowledged: {result.acknowledged}")
        
        # Return user dict
        return {
            "id": str(result.inserted_id),
            "email": user_data.email,
            "full_name": user_data.full_name,
            "profile_image": user_data.profile_image,
            "created_at": user_doc["created_at"],
            "is_active": True
        }
    
    async def authenticate_user(self, email: str, password: str) -> Optional[Dict]:
        """Authenticate user credentials"""
        self._get_collections()
        
        user = await self.users_collection.find_one({"email": email})
        if not user:
            return None
        
        if not verify_password(password, user["password"]):
            return None
        
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "full_name": user.get("full_name"),
            "profile_image": user.get("profile_image"),
            "is_active": user.get("is_active", True)
        }
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        self._get_collections()
        
        try:
            user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
            if user:
                user["id"] = str(user["_id"])
                del user["_id"]
                del user["password"]  # Don't return password
            return user
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None
    
    async def update_user(self, user_id: str, update_data: Dict) -> bool:
        """Update user information"""
        self._get_collections()
        
        try:
            # Remove sensitive fields that shouldn't be updated directly
            update_data.pop("password", None)
            update_data.pop("email", None)  # Email changes need special handling
            
            if not update_data:
                return True
            
            update_data["updated_at"] = datetime.utcnow()
            
            result = await self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            return False

    async def get_all_users(self) -> List[Dict]:
        """Get all users (development only - remove in production!)"""
        self._get_collections()
        
        try:
            cursor = self.users_collection.find({}, {"password": 0})  # Exclude password field
            users = []
            async for user in cursor:
                users.append({
                    "id": str(user["_id"]),
                    "email": user["email"],
                    "full_name": user.get("full_name"),
                    "profile_image": user.get("profile_image"),
                    "created_at": user["created_at"],
                    "is_active": user.get("is_active", True)
                })
            return users
        except Exception as e:
            logger.error(f"Error getting all users: {e}")
            return []

# Singleton instance
user_service = UserService()