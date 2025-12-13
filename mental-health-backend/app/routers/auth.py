from fastapi import APIRouter, HTTPException, Depends, status
from ..models.schemas import UserCreate, UserLogin, UserResponse, UserUpdate, Token
from ..services.user_service import user_service
from ..core.security import create_access_token, get_current_user
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        user = await user_service.create_user(user_data)
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user["id"], "email": user["email"]}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user.get("full_name"),
                "profile_image": user.get("profile_image")
            }
        }
    except ValueError as e:
        error_msg = str(e)
        if "email already exists" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists. Please try logging in instead."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We're experiencing technical difficulties. Please try again in a moment."
        )

@router.post("/login")
async def login(credentials: UserLogin):
    """Authenticate user and return access token"""
    try:
        user = await user_service.authenticate_user(credentials.email, credentials.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password. Please check your credentials and try again."
            )
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user["id"], "email": user["email"]}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user.get("full_name"),
                "profile_image": user.get("profile_image")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We're experiencing technical difficulties. Please try again in a moment."
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    try:
        user = await user_service.get_user_by_id(current_user["user_id"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name"),
            created_at=user["created_at"],
            is_active=user.get("is_active", True)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user info error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user information"
        )

@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Successfully logged out"}

@router.get("/users/list")
async def list_all_users():
    """Development endpoint to list all users - Remove in production!"""
    try:
        users = await user_service.get_all_users()
        return {
            "success": True,
            "count": len(users),
            "users": users
        }
    except Exception as e:
        logger.error(f"List users error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users"
        )

@router.get("/debug/database")
async def debug_database():
    """Debug endpoint to test database connection"""
    try:
        from ..core.database import get_database
        db = get_database()
        
        # Test database connection
        collections = await db.list_collection_names()
        
        # Count users
        users_count = await db.users.count_documents({})
        
        # Get user emails only (avoid ObjectId issues)
        user_emails = []
        async for user in db.users.find({}, {"email": 1, "_id": 0}):
            user_emails.append(user.get("email"))
        
        return {
            "success": True,
            "database_name": db.name,
            "collections": collections,
            "users_count": users_count,
            "user_emails": user_emails,
            "connection_info": "Connected to MongoDB Atlas"
        }
    except Exception as e:
        logger.error(f"Database debug error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database debug failed: {str(e)}"
        )

@router.get("/validate-token")
async def validate_token(current_user: dict = Depends(get_current_user)):
    """Validate current token"""
    return {"valid": True, "user_id": current_user["user_id"]}

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile information"""
    try:
        # Update user profile
        success = await user_service.update_user(
            current_user["user_id"], 
            user_update.dict(exclude_unset=True)
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update profile"
            )
        
        # Get updated user info
        user = await user_service.get_user_by_id(current_user["user_id"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name"),
            profile_image=user.get("profile_image"),
            created_at=user["created_at"],
            is_active=user.get("is_active", True)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update profile error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.post("/profile-image")
async def update_profile_image(
    profile_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile image"""
    try:
        profile_image = profile_data.get("profile_image")
        if not profile_image:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile image is required"
            )
        
        # Update only the profile image
        success = await user_service.update_user(
            current_user["user_id"], 
            {"profile_image": profile_image}
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update profile image"
            )
        
        return {"message": "Profile image updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update profile image error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile image"
        )