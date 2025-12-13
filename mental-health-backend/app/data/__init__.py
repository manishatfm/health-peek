"""
Data module for blog articles and other static content
"""

from .blog_data import get_blog_by_id, get_all_blogs, get_blogs_by_category, get_blogs_by_tag

__all__ = [
    'get_blog_by_id',
    'get_all_blogs', 
    'get_blogs_by_category',
    'get_blogs_by_tag'
]
