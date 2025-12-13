"""
Blog router for serving mental health blog articles
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict
import logging

from app.data.blog_data import get_blog_by_id, get_all_blogs, get_blogs_by_category, get_blogs_by_tag

router = APIRouter(prefix="/blogs", tags=["blogs"])
logger = logging.getLogger(__name__)


@router.get("/{blog_id}")
async def get_blog(blog_id: str) -> Dict:
    """
    Get a specific blog article by ID
    """
    try:
        blog = get_blog_by_id(blog_id)
        
        if not blog:
            raise HTTPException(status_code=404, detail=f"Blog article '{blog_id}' not found")
        
        return {
            "success": True,
            "blog": blog
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching blog {blog_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch blog article")


@router.get("/")
async def list_blogs(
    category: str = None,
    tag: str = None
) -> Dict:
    """
    List all blog articles, optionally filtered by category or tag
    """
    try:
        if category:
            blogs = get_blogs_by_category(category)
        elif tag:
            blogs = get_blogs_by_tag(tag)
        else:
            blogs = get_all_blogs()
        
        return {
            "success": True,
            "count": len(blogs),
            "blogs": blogs
        }
    
    except Exception as e:
        logger.error(f"Error listing blogs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch blog list")
