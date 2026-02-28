import React, { useState, useEffect, useCallback } from 'react';
import { blogService } from '../../services';
import BlogArticleView from './BlogArticleView';
import AdminBlogForm from './AdminBlogForm';
import './BlogPage.css';

const BlogPage = () => {
  const [adminBlogs, setAdminBlogs] = useState([]);
  const [rssArticles, setRssArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewingBlog, setViewingBlog] = useState(null); // { type: 'admin'|'rss', data: ... }
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Check admin status
      try {
        const adminCheck = await blogService.checkAdmin();
        setIsAdmin(adminCheck.is_admin);
      } catch {
        setIsAdmin(false);
      }

      // Load admin blogs
      const adminRes = await blogService.getAdminBlogs();
      setAdminBlogs(adminRes.blogs || []);

      // If no admin blogs, load RSS
      if (!adminRes.blogs || adminRes.blogs.length === 0) {
        const rssRes = await blogService.getRssArticles();
        setRssArticles(rssRes.articles || []);
      } else {
        setRssArticles([]);
      }
    } catch (err) {
      console.error('Failed to load blog data:', err);
      // Try RSS as fallback
      try {
        const rssRes = await blogService.getRssArticles();
        setRssArticles(rssRes.articles || []);
      } catch {
        setRssArticles([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBlogCreated = () => {
    setShowAdminForm(false);
    setEditingBlog(null);
    loadData();
    showToast('Blog published successfully!');
  };

  const handleDelete = async (blogId) => {
    try {
      await blogService.deleteAdminBlog(blogId);
      setDeleteConfirm(null);
      loadData();
      showToast('Blog deleted successfully!');
    } catch (err) {
      showToast('Failed to delete blog', 'error');
    }
  };

  const handleLike = async (blogId) => {
    const liked = JSON.parse(localStorage.getItem('likedBlogs') || '[]');
    if (liked.includes(blogId)) return;
    try {
      await blogService.likeBlog(blogId);
      localStorage.setItem('likedBlogs', JSON.stringify([...liked, blogId]));
      setAdminBlogs(prev =>
        prev.map(b => (b.id === blogId ? { ...b, likes: (b.likes || 0) + 1 } : b))
      );
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  // Viewing a single blog article
  if (viewingBlog) {
    if (viewingBlog.type === 'admin') {
      return (
        <BlogArticleView
          blog={viewingBlog.data}
          onClose={() => setViewingBlog(null)}
          onLike={() => handleLike(viewingBlog.data.id)}
          isLiked={JSON.parse(localStorage.getItem('likedBlogs') || '[]').includes(viewingBlog.data.id)}
        />
      );
    }
    // RSS articles open in new tab; this shouldn't normally be reached
    return null;
  }

  // Admin blog form
  if (showAdminForm) {
    return (
      <AdminBlogForm
        blog={editingBlog}
        onClose={() => { setShowAdminForm(false); setEditingBlog(null); }}
        onSuccess={handleBlogCreated}
      />
    );
  }

  const hasAdminBlogs = adminBlogs.length > 0;
  const displayArticles = hasAdminBlogs ? adminBlogs : rssArticles;

  return (
    <div className="blog-page">
      {/* Header */}
      <div className="blog-page-header">
        <div className="blog-page-title-area">
          <h2 className="blog-page-title">Wellbeing Articles</h2>
          <p className="blog-page-subtitle">
            {hasAdminBlogs
              ? 'Curated articles on mental health and wellness'
              : 'Latest mental health articles from trusted sources'}
          </p>
        </div>
        {isAdmin && (
          <button
            className="admin-publish-btn"
            onClick={() => { setEditingBlog(null); setShowAdminForm(true); }}
          >
            <span className="publish-icon">+</span>
            Publish Article
          </button>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="blog-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="blog-card skeleton-card">
              <div className="skeleton-image" />
              <div className="skeleton-content">
                <div className="skeleton-line title" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            </div>
          ))}
        </div>
      ) : displayArticles.length === 0 ? (
        <div className="blog-empty-state">
          <div className="empty-icon">📝</div>
          <h3>No Articles Yet</h3>
          <p>
            {isAdmin
              ? "You haven't published any articles yet. Click 'Publish Article' to get started!"
              : 'Articles will appear here once published. Check back soon!'}
          </p>
        </div>
      ) : (
        <>
          {/* RSS badge */}
          {!hasAdminBlogs && rssArticles.length > 0 && (
            <div className="rss-notice">
              <span className="rss-badge">RSS</span>
              Showing curated articles from trusted mental health sources
            </div>
          )}

          {/* Blog grid */}
          <div className="blog-grid">
            {displayArticles.map((article) => {
              const isRss = !hasAdminBlogs;
              const imgSrc = isRss
                ? article.image
                : article.cover_image || 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=250&fit=crop';

              return (
                <div
                  key={article.id}
                  className="blog-card"
                  onClick={() => {
                    if (isRss) {
                      window.open(article.url, '_blank', 'noopener,noreferrer');
                    } else {
                      setViewingBlog({ type: 'admin', data: article });
                    }
                  }}
                >
                  <div className="blog-card-image">
                    <img
                      src={imgSrc}
                      alt={article.title}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=250&fit=crop';
                      }}
                    />
                    {isRss && (
                      <span className="card-source-badge">{article.source}</span>
                    )}
                    {article.category && (
                      <span className="card-category-badge">{article.category}</span>
                    )}
                  </div>
                  <div className="blog-card-body">
                    <h3 className="blog-card-title">{article.title}</h3>
                    <p className="blog-card-desc">
                      {_truncate(article.description || article.summary || '', 18)}
                    </p>
                    <div className="blog-card-footer">
                      <span className="blog-card-date">
                        {_formatDate(isRss ? article.published : article.created_at)}
                      </span>
                      {!isRss && (
                        <div className="blog-card-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className={`like-btn ${JSON.parse(localStorage.getItem('likedBlogs') || '[]').includes(article.id) ? 'liked' : ''}`}
                            onClick={() => handleLike(article.id)}
                            title="Like"
                          >
                            ❤ {article.likes || 0}
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                className="edit-btn"
                                onClick={() => { setEditingBlog(article); setShowAdminForm(true); }}
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                className="delete-btn"
                                onClick={() => setDeleteConfirm(article)}
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {isRss && (
                        <span className="read-more-link">Read Article →</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="blog-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="blog-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Article</h3>
            <p>Are you sure you want to delete "<strong>{deleteConfirm.title}</strong>"? This action cannot be undone.</p>
            <div className="blog-modal-actions">
              <button className="modal-cancel-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="modal-delete-btn" onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`blog-toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}
    </div>
  );
};

// Helpers
function _truncate(text, maxWords = 18) {
  if (!text) return '';
  const words = text.split(/\s+/);
  return words.length <= maxWords ? text : words.slice(0, maxWords).join(' ') + '...';
}

function _formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default BlogPage;
