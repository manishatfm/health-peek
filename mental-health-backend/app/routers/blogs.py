"""
Blog router for serving mental health blog articles.
Supports admin CRUD operations with MongoDB storage,
hardcoded fallback articles, and RSS feed aggregation.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Dict, Optional
from datetime import datetime
import logging
import base64

from app.data.blog_data import get_blog_by_id, get_all_blogs, get_blogs_by_category, get_blogs_by_tag
from app.core.database import get_database
from app.core.security import get_current_user
from app.services.rss_service import fetch_mental_health_rss

router = APIRouter(prefix="/blogs", tags=["blogs"])
logger = logging.getLogger(__name__)


async def _require_admin(current_user: dict):
    """Check if the current user has admin role."""
    db = get_database()
    user = await db.users.find_one({"email": current_user["email"]})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/rss")
async def get_rss_articles():
    """Get mental-health RSS feed articles as fallback content."""
    try:
        articles = await fetch_mental_health_rss()
        return {"success": True, "count": len(articles), "articles": articles}
    except Exception as e:
        logger.error(f"RSS fetch error: {e}")
        return {"success": True, "count": 0, "articles": []}


@router.get("/admin-posts")
async def list_admin_blogs():
    """List all admin-posted blogs from MongoDB."""
    try:
        db = get_database()
        blogs = []
        cursor = db.blog_posts.find().sort("created_at", -1)
        async for doc in cursor:
            blogs.append(_serialize_blog(doc))
        return {"success": True, "count": len(blogs), "blogs": blogs}
    except Exception as e:
        logger.error(f"Error listing admin blogs: {e}")
        raise HTTPException(status_code=500, detail="Failed to list blogs")


@router.get("/admin-posts/{blog_id}")
async def get_admin_blog(blog_id: str):
    """Get a single admin blog post by ID."""
    try:
        from bson import ObjectId
        db = get_database()
        doc = await db.blog_posts.find_one({"_id": ObjectId(blog_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Blog not found")
        return {"success": True, "blog": _serialize_blog(doc)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admin blog {blog_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch blog")


@router.post("/admin-posts")
async def create_blog(
    title: str = Form(...),
    description: str = Form(...),
    content: str = Form(""),
    category: str = Form("Mental Health"),
    cover_image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    """Create a new blog post (admin only)."""
    await _require_admin(current_user)
    db = get_database()

    cover_image_data = None
    if cover_image and cover_image.filename:
        img_bytes = await cover_image.read()
        content_type = cover_image.content_type or "image/jpeg"
        cover_image_data = f"data:{content_type};base64,{base64.b64encode(img_bytes).decode()}"

    blog_doc = {
        "title": title,
        "description": description,
        "content": content,
        "category": category,
        "cover_image": cover_image_data,
        "author_email": current_user["email"],
        "likes": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await db.blog_posts.insert_one(blog_doc)
    blog_doc["_id"] = result.inserted_id
    return {"success": True, "message": "Blog created", "blog": _serialize_blog(blog_doc)}


@router.put("/admin-posts/{blog_id}")
async def update_blog(
    blog_id: str,
    title: str = Form(...),
    description: str = Form(...),
    content: str = Form(""),
    category: str = Form("Mental Health"),
    cover_image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    """Update a blog post (admin only)."""
    await _require_admin(current_user)
    from bson import ObjectId
    db = get_database()

    update_data = {
        "title": title,
        "description": description,
        "content": content,
        "category": category,
        "updated_at": datetime.utcnow(),
    }

    if cover_image and cover_image.filename:
        img_bytes = await cover_image.read()
        content_type = cover_image.content_type or "image/jpeg"
        update_data["cover_image"] = f"data:{content_type};base64,{base64.b64encode(img_bytes).decode()}"

    result = await db.blog_posts.update_one({"_id": ObjectId(blog_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")

    doc = await db.blog_posts.find_one({"_id": ObjectId(blog_id)})
    return {"success": True, "message": "Blog updated", "blog": _serialize_blog(doc)}


@router.delete("/admin-posts/{blog_id}")
async def delete_blog(
    blog_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a blog post (admin only)."""
    await _require_admin(current_user)
    from bson import ObjectId
    db = get_database()
    result = await db.blog_posts.delete_one({"_id": ObjectId(blog_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {"success": True, "message": "Blog deleted"}


@router.post("/admin-posts/{blog_id}/like")
async def like_blog(blog_id: str):
    """Increment like count on a blog post."""
    from bson import ObjectId
    db = get_database()
    result = await db.blog_posts.update_one(
        {"_id": ObjectId(blog_id)},
        {"$inc": {"likes": 1}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    doc = await db.blog_posts.find_one({"_id": ObjectId(blog_id)})
    return {"success": True, "likes": doc.get("likes", 0)}


@router.post("/make-admin")
async def make_admin(
    target_email: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    """Promote a user to admin. If no admin exists yet, any authenticated user can become the first."""
    db = get_database()
    admin_count = await db.users.count_documents({"is_admin": True})
    if admin_count > 0:
        await _require_admin(current_user)

    result = await db.users.update_one(
        {"email": target_email},
        {"$set": {"is_admin": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": f"{target_email} is now an admin"}


@router.get("/check-admin")
async def check_admin(current_user: dict = Depends(get_current_user)):
    """Check if the current user is an admin."""
    db = get_database()
    user = await db.users.find_one({"email": current_user["email"]})
    is_admin = user.get("is_admin", False) if user else False
    return {"success": True, "is_admin": is_admin}


# Legacy endpoints (hardcoded blog data for recommendations)

@router.get("/{blog_id}")
async def get_blog(blog_id: str) -> Dict:
    """Get a specific blog article by ID (hardcoded data)."""
    try:
        blog = get_blog_by_id(blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail=f"Blog article '{blog_id}' not found")
        return {"success": True, "blog": blog}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching blog {blog_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch blog article")


@router.get("/")
async def list_blogs(category: str = None, tag: str = None) -> Dict:
    """List all blog articles (hardcoded data), optionally filtered."""
    try:
        if category:
            blogs = get_blogs_by_category(category)
        elif tag:
            blogs = get_blogs_by_tag(tag)
        else:
            blogs = get_all_blogs()
        return {"success": True, "count": len(blogs), "blogs": blogs}
    except Exception as e:
        logger.error(f"Error listing blogs: {e}")
        raise HTTPException(status_code=500, detail="Failed to list blog articles")


def _serialize_blog(doc: dict) -> dict:
    """Convert a MongoDB blog document to a JSON-safe dict."""
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", ""),
        "description": doc.get("description", ""),
        "content": doc.get("content", ""),
        "category": doc.get("category", "Mental Health"),
        "cover_image": doc.get("cover_image"),
        "author_email": doc.get("author_email", ""),
        "likes": doc.get("likes", 0),
        "created_at": doc.get("created_at", datetime.utcnow()).isoformat(),
        "updated_at": doc.get("updated_at", datetime.utcnow()).isoformat(),
    }
