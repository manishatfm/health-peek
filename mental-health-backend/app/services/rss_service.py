"""
RSS feed service for fetching mental health articles from public RSS feeds.
Used as fallback content when no admin blog posts exist.
"""

import logging
import httpx
import xml.etree.ElementTree as ET
from typing import List, Dict
import re
import hashlib

logger = logging.getLogger(__name__)

# Mental health RSS feed sources
RSS_FEEDS = [
    {
        "url": "https://www.psychologytoday.com/us/blog/feed",
        "source": "Psychology Today",
        "default_image": "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=250&fit=crop",
    },
    {
        "url": "https://www.helpguide.org/feed",
        "source": "HelpGuide",
        "default_image": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=250&fit=crop",
    },
    {
        "url": "https://www.nami.org/Feed",
        "source": "NAMI",
        "default_image": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&h=250&fit=crop",
    },
    {
        "url": "https://psychcentral.com/feed",
        "source": "Psych Central",
        "default_image": "https://images.unsplash.com/photo-1493836512676-0800544c5f6b?w=400&h=250&fit=crop",
    },
    {
        "url": "https://www.verywellmind.com/rss",
        "source": "Verywell Mind",
        "default_image": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=250&fit=crop",
    },
]

# Fallback curated articles when RSS feeds fail
FALLBACK_ARTICLES = [
    {
        "id": "fallback-1",
        "title": "Understanding Anxiety: Causes, Symptoms, and Coping Strategies",
        "summary": "Anxiety is one of the most common mental health conditions. Learn about its causes, recognize the symptoms, and discover evidence-based coping strategies to manage anxiety effectively in daily life.",
        "image": "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=250&fit=crop",
        "url": "https://www.helpguide.org/mental-health/anxiety/anxiety-disorders-and-anxiety-attacks",
        "source": "HelpGuide",
        "category": "Anxiety",
        "published": "2025-12-01T10:00:00Z",
    },
    {
        "id": "fallback-2",
        "title": "The Science of Mindfulness: How Meditation Changes Your Brain",
        "summary": "Research shows that regular mindfulness meditation can physically change brain structure. Discover how just 10 minutes daily can reduce stress, improve focus, and enhance emotional well-being.",
        "image": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=250&fit=crop",
        "url": "https://www.psychologytoday.com/us/basics/mindfulness",
        "source": "Psychology Today",
        "category": "Mindfulness",
        "published": "2025-11-28T09:00:00Z",
    },
    {
        "id": "fallback-3",
        "title": "Building Resilience: Bouncing Back from Life's Challenges",
        "summary": "Resilience isn't about avoiding stress but about learning to thrive despite it. Explore practical techniques to strengthen your mental resilience and face challenges with confidence.",
        "image": "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&h=250&fit=crop",
        "url": "https://www.apa.org/topics/resilience",
        "source": "American Psychological Association",
        "category": "Resilience",
        "published": "2025-11-25T14:00:00Z",
    },
    {
        "id": "fallback-4",
        "title": "Depression: Recognizing the Signs and Seeking Help",
        "summary": "Depression affects millions worldwide. Understanding the difference between sadness and clinical depression is crucial. Learn when to seek professional help and what treatments are available.",
        "image": "https://images.unsplash.com/photo-1493836512676-0800544c5f6b?w=400&h=250&fit=crop",
        "url": "https://www.nami.org/About-Mental-Illness/Mental-Health-Conditions/Depression",
        "source": "NAMI",
        "category": "Depression",
        "published": "2025-11-20T11:00:00Z",
    },
    {
        "id": "fallback-5",
        "title": "The Power of Sleep: How Rest Affects Mental Health",
        "summary": "Quality sleep is foundational to mental well-being. Explore the connection between sleep and mental health, and learn practical sleep hygiene tips for a restful night.",
        "image": "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&h=250&fit=crop",
        "url": "https://www.sleepfoundation.org/mental-health",
        "source": "Sleep Foundation",
        "category": "Wellness",
        "published": "2025-11-18T08:00:00Z",
    },
    {
        "id": "fallback-6",
        "title": "Social Connection and Mental Health: Why Relationships Matter",
        "summary": "Human beings are social creatures. Strong social bonds protect against depression and anxiety. Discover how to nurture meaningful relationships for better mental health.",
        "image": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=250&fit=crop",
        "url": "https://www.mentalhealth.org.uk/explore-mental-health/articles/how-make-friends-and-get-along-people",
        "source": "Mental Health Foundation",
        "category": "Relationships",
        "published": "2025-11-15T13:00:00Z",
    },
    {
        "id": "fallback-7",
        "title": "Stress Management Techniques That Actually Work",
        "summary": "Chronic stress can wreak havoc on your body and mind. From progressive muscle relaxation to cognitive reframing, discover proven techniques to manage stress effectively.",
        "image": "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&h=250&fit=crop",
        "url": "https://www.who.int/news-room/questions-and-answers/item/stress",
        "source": "World Health Organization",
        "category": "Stress",
        "published": "2025-11-12T10:00:00Z",
    },
    {
        "id": "fallback-8",
        "title": "Self-Care Isn't Selfish: Building a Personal Wellness Routine",
        "summary": "Self-care goes beyond bubble baths. Learn how to create a comprehensive self-care routine that addresses your physical, emotional, and mental needs for lasting well-being.",
        "image": "https://images.unsplash.com/photo-1600618528240-fb9fc964b853?w=400&h=250&fit=crop",
        "url": "https://psychcentral.com/blog/what-self-care-really-means",
        "source": "Psych Central",
        "category": "Self-Care",
        "published": "2025-11-10T09:00:00Z",
    },
    {
        "id": "fallback-9",
        "title": "Cognitive Behavioral Therapy: A Beginner's Guide",
        "summary": "CBT is one of the most effective therapeutic approaches. Learn the core principles, common techniques, and how CBT can help you change negative thought patterns.",
        "image": "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=400&h=250&fit=crop",
        "url": "https://www.verywellmind.com/what-is-cognitive-behavior-therapy-2795747",
        "source": "Verywell Mind",
        "category": "Therapy",
        "published": "2025-11-08T12:00:00Z",
    },
]


def _clean_html(text: str) -> str:
    """Strip HTML tags from text."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", "", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def _extract_image_from_content(content: str) -> str | None:
    """Try to extract an image URL from HTML content."""
    if not content:
        return None
    match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', content)
    if match:
        return match.group(1)
    # Try media:content or enclosure
    match = re.search(r'url=["\']([^"\']+\.(?:jpg|jpeg|png|webp|gif))["\']', content, re.IGNORECASE)
    return match.group(1) if match else None


def _truncate(text: str, max_words: int = 35) -> str:
    """Truncate text to max_words."""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "..."


async def _fetch_single_feed(client: httpx.AsyncClient, feed: dict) -> List[Dict]:
    """Fetch and parse a single RSS/Atom feed."""
    articles = []
    try:
        resp = await client.get(feed["url"], timeout=8.0, follow_redirects=True)
        if resp.status_code != 200:
            return articles

        root = ET.fromstring(resp.text)

        # Handle both RSS 2.0 and Atom feeds
        ns = {"atom": "http://www.w3.org/2005/Atom",
              "media": "http://search.yahoo.com/mrss/",
              "content": "http://purl.org/rss/1.0/modules/content/",
              "dc": "http://purl.org/dc/elements/1.1/"}

        items = root.findall(".//item") or root.findall(".//atom:entry", ns)

        for item in items[:6]:  # Max 6 articles per feed
            # Title
            title_el = item.find("title") or item.find("atom:title", ns)
            title = title_el.text.strip() if title_el is not None and title_el.text else ""
            if not title:
                continue

            # Link
            link_el = item.find("link") or item.find("atom:link", ns)
            if link_el is not None:
                link = link_el.text or link_el.get("href", "")
            else:
                link = ""
            link = link.strip()

            # Description / summary
            desc_el = (
                item.find("description")
                or item.find("atom:summary", ns)
                or item.find("atom:content", ns)
                or item.find("content:encoded", ns)
            )
            raw_desc = desc_el.text if desc_el is not None and desc_el.text else ""
            summary = _truncate(_clean_html(raw_desc))

            # Image
            image = None
            media_el = item.find("media:content", ns) or item.find("media:thumbnail", ns)
            if media_el is not None:
                image = media_el.get("url")
            if not image:
                enclosure = item.find("enclosure")
                if enclosure is not None and "image" in (enclosure.get("type", "")):
                    image = enclosure.get("url")
            if not image:
                image = _extract_image_from_content(raw_desc)
            if not image:
                image = feed["default_image"]

            # Published date
            pub_el = item.find("pubDate") or item.find("atom:published", ns) or item.find("dc:date", ns)
            published = pub_el.text.strip() if pub_el is not None and pub_el.text else ""

            # Category
            cat_el = item.find("category") or item.find("atom:category", ns)
            category = ""
            if cat_el is not None:
                category = cat_el.text or cat_el.get("term", "") or ""

            article_id = hashlib.md5(f"{feed['source']}-{title}".encode()).hexdigest()[:12]

            articles.append({
                "id": f"rss-{article_id}",
                "title": title,
                "summary": summary if summary else "Click to read the full article.",
                "image": image,
                "url": link,
                "source": feed["source"],
                "category": category or "Mental Health",
                "published": published,
            })

    except Exception as e:
        logger.warning(f"Failed to fetch feed {feed['url']}: {e}")

    return articles


async def fetch_mental_health_rss() -> List[Dict]:
    """Fetch articles from multiple mental health RSS feeds.
    Falls back to curated articles if all feeds fail."""
    all_articles: List[Dict] = []

    async with httpx.AsyncClient() as client:
        for feed in RSS_FEEDS:
            articles = await _fetch_single_feed(client, feed)
            all_articles.extend(articles)

    # If no RSS articles, return curated fallback
    if not all_articles:
        logger.info("All RSS feeds failed, returning fallback articles")
        return FALLBACK_ARTICLES

    # De-duplicate by title (case-insensitive)
    seen_titles = set()
    unique = []
    for a in all_articles:
        key = a["title"].lower().strip()
        if key not in seen_titles:
            seen_titles.add(key)
            unique.append(a)

    # Return max 12 articles
    return unique[:12]
