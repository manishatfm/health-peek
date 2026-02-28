import React, { useState } from 'react';
import { blogService } from '../../services';
import './BlogPage.css';

const AdminBlogForm = ({ blog, onClose, onSuccess }) => {
  const [title, setTitle] = useState(blog?.title || '');
  const [description, setDescription] = useState(blog?.description || '');
  const [content, setContent] = useState(blog?.content || '');
  const [category, setCategory] = useState(blog?.category || 'Mental Health');
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(blog?.cover_image || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = !!blog;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('content', content);
      formData.append('category', category);
      if (coverImage) {
        formData.append('cover_image', coverImage);
      }

      if (isEditing) {
        await blogService.updateAdminBlog(blog.id, formData);
      } else {
        await blogService.createAdminBlog(formData);
      }

      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to save blog');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    'Mental Health',
    'Anxiety',
    'Depression',
    'Mindfulness',
    'Self-Care',
    'Stress Management',
    'Relationships',
    'Therapy',
    'Wellness',
    'Crisis Support',
    'Cognitive Behavioral',
    'Resilience',
  ];

  return (
    <div className="admin-blog-form">
      <div className="admin-form-header">
        <button className="article-back-btn" onClick={onClose}>
          ← Back
        </button>
        <h2>{isEditing ? 'Edit Article' : 'Publish New Article'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="admin-form-body">
        {error && <div className="admin-form-error">{error}</div>}

        {/* Cover Image */}
        <div className="form-group">
          <label>Cover Image</label>
          <div className="image-upload-area" onClick={() => document.getElementById('cover-image-input').click()}>
            {coverPreview ? (
              <img src={coverPreview} alt="Cover preview" className="cover-preview" />
            ) : (
              <div className="upload-placeholder">
                <span className="upload-icon">📷</span>
                <span>Click to upload cover image</span>
              </div>
            )}
            <input
              id="cover-image-input"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />
          </div>
        </div>

        {/* Title */}
        <div className="form-group">
          <label htmlFor="blog-title">Title *</label>
          <input
            id="blog-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter article title..."
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="blog-desc">Short Description *</label>
          <textarea
            id="blog-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief summary of the article..."
            rows={3}
            required
          />
        </div>

        {/* Category */}
        <div className="form-group">
          <label htmlFor="blog-category">Category</label>
          <select
            id="blog-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Content (Markdown) */}
        <div className="form-group">
          <label htmlFor="blog-content">
            Content <span className="label-hint">(Markdown supported)</span>
          </label>
          <textarea
            id="blog-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your article content here... (Markdown supported)"
            rows={15}
          />
        </div>

        {/* Submit */}
        <div className="admin-form-actions">
          <button type="button" className="admin-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="admin-submit-btn" disabled={submitting}>
            {submitting ? (
              <>
                <span className="submit-spinner"></span>
                {isEditing ? 'Updating...' : 'Publishing...'}
              </>
            ) : (
              isEditing ? 'Update Article' : 'Publish Article'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminBlogForm;
