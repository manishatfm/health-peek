import React, { useState, useEffect } from 'react';
import { blogService } from '../../services';
import { LoadingSpinner, ErrorMessage } from '../common';
import ReactMarkdown from 'react-markdown';
import './BlogView.css';

const BlogView = ({ blogId, onClose }) => {
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBlog();
    
    // Add print event listeners to ensure content is visible
    const beforePrint = () => {
      document.body.style.overflow = 'visible';
      const article = document.querySelector('.article-content');
      if (article) {
        article.style.overflow = 'visible';
        article.style.height = 'auto';
        article.style.maxHeight = 'none';
      }
    };

    window.addEventListener('beforeprint', beforePrint);

    return () => {
      window.removeEventListener('beforeprint', beforePrint);
    };
  }, [blogId]);

  const loadBlog = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await blogService.getBlog(blogId);
      if (response.success) {
        setBlog(response.blog);
      } else {
        throw new Error('Failed to load blog article');
      }
    } catch (err) {
      console.error('Error loading blog:', err);
      setError(err.message || 'Failed to load blog article');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Ensure all content is loaded before printing
    const articleContent = document.querySelector('.article-content');
    const blogArticle = document.querySelector('.blog-article');
    
    if (!articleContent || !blogArticle) {
      alert('Please wait for the article to load completely before printing.');
      return;
    }

    // Force all content to be visible
    const elements = [
      document.body,
      document.querySelector('.App'),
      document.querySelector('.main-content'),
      document.querySelector('.blog-view'),
      blogArticle,
      articleContent
    ];

    elements.forEach(el => {
      if (el) {
        el.style.overflow = 'visible';
        el.style.height = 'auto';
        el.style.maxHeight = 'none';
      }
    });
    
    // Small delay to ensure styles are applied and content is rendered
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: blog.title,
        text: blog.summary,
        url: window.location.href,
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="blog-view">
        <LoadingSpinner message="Loading article..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="blog-view">
        <ErrorMessage message={error} onClose={onClose} />
        <button className="btn-close" onClick={onClose}>
          ← Back to Recommendations
        </button>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="blog-view">
        <div className="error">Blog article not found</div>
        <button className="btn-close" onClick={onClose}>
          ← Back to Recommendations
        </button>
      </div>
    );
  }

  return (
    <div className="blog-view">
      <div className="blog-header">
        <button className="btn-back" onClick={onClose} title="Back to Recommendations">
          ← Back
        </button>
        <div className="blog-actions">
          <button className="btn-icon" onClick={handlePrint} title="Print Article">
            🖨️
          </button>
          <button className="btn-icon" onClick={handleShare} title="Share Article">
            🔗
          </button>
        </div>
      </div>

      <article className="blog-article">
        <header className="article-header">
          <div className="article-meta">
            <span className="category-badge">{blog.category}</span>
            <span className="read-time">{blog.read_time}</span>
          </div>
          <h1 className="article-title">{blog.title}</h1>
          <p className="article-summary">{blog.summary}</p>
          <div className="article-author">
            <span>By {blog.author}</span>
          </div>
        </header>

        {blog.image && (
          <div className="article-image">
            <img src={blog.image} alt={blog.title} onError={(e) => e.target.style.display = 'none'} />
          </div>
        )}

        <div className="article-content">
          <ReactMarkdown>{blog.content}</ReactMarkdown>
        </div>

        <footer className="article-footer">
          <div className="article-tags">
            <strong>Topics:</strong>
            {blog.tags && blog.tags.map((tag, index) => (
              <span key={index} className="tag">
                {tag}
              </span>
            ))}
          </div>
          
          <div className="article-disclaimer">
            <p>
              <strong>📌 Important Note:</strong> This article provides educational information based on evidence-based 
              therapeutic approaches. It is not a substitute for professional mental health care. If you're experiencing 
              severe symptoms or crisis, please contact a mental health professional or call 988 (Suicide & Crisis Lifeline).
            </p>
          </div>

          <div className="article-actions">
            <button className="btn-primary" onClick={onClose}>
              ← Back to Recommendations
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
};

export default BlogView;
