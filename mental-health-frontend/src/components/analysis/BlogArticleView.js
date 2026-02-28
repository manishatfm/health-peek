import React from 'react';
import ReactMarkdown from 'react-markdown';
import './BlogPage.css';

const BlogArticleView = ({ blog, onClose, onLike, isLiked }) => {
  const handlePrint = () => {
    setTimeout(() => window.print(), 300);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: blog.title,
        text: blog.description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="blog-article-view">
      {/* Top bar */}
      <div className="article-view-header">
        <button className="article-back-btn" onClick={onClose}>
          ← Back to Articles
        </button>
        <div className="article-view-actions">
          <button className="article-action-btn" onClick={onLike} disabled={isLiked} title="Like">
            <span className={isLiked ? 'liked-heart' : ''}>❤</span> {blog.likes || 0}
          </button>
          <button className="article-action-btn" onClick={handlePrint} title="Print">
            🖨️
          </button>
          <button className="article-action-btn" onClick={handleShare} title="Share">
            🔗
          </button>
        </div>
      </div>

      {/* Hero image */}
      {blog.cover_image && (
        <div className="article-hero">
          <img
            src={blog.cover_image}
            alt={blog.title}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      {/* Article content */}
      <article className="article-body">
        <header className="article-body-header">
          {blog.category && <span className="article-category-tag">{blog.category}</span>}
          <h1 className="article-main-title">{blog.title}</h1>
          <p className="article-description">{blog.description}</p>
          <div className="article-meta-row">
            <span className="article-author">{blog.author_email}</span>
            <span className="article-date">
              {new Date(blog.created_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </span>
          </div>
        </header>

        <div className="article-content-body">
          <ReactMarkdown>{blog.content || ''}</ReactMarkdown>
        </div>

        <footer className="article-body-footer">
          <div className="article-disclaimer">
            <p>
              <strong>📌 Important Note:</strong> This article provides educational information on
              mental health and wellness. It is not a substitute for professional mental health care.
              If you're experiencing a crisis, please contact a mental health professional or call 988
              (Suicide & Crisis Lifeline).
            </p>
          </div>
          <button className="article-back-bottom-btn" onClick={onClose}>
            ← Back to Articles
          </button>
        </footer>
      </article>
    </div>
  );
};

export default BlogArticleView;
