import apiService from './api';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const blogService = {
  // ─── Legacy hardcoded blog endpoints ───────────────────────────
  async getBlog(blogId) {
    return apiService.request(`/blogs/${blogId}`);
  },

  async getAllBlogs() {
    return apiService.request('/blogs/');
  },

  async getBlogsByCategory(category) {
    return apiService.request(`/blogs/?category=${encodeURIComponent(category)}`);
  },

  async getBlogsByTag(tag) {
    return apiService.request(`/blogs/?tag=${encodeURIComponent(tag)}`);
  },

  // ─── Admin blog CRUD ──────────────────────────────────────────
  async getAdminBlogs() {
    return apiService.request('/blogs/admin-posts');
  },

  async getAdminBlog(blogId) {
    return apiService.request(`/blogs/admin-posts/${blogId}`);
  },

  async createAdminBlog(formData) {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE}/blogs/admin-posts`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to create blog');
    }
    return res.json();
  },

  async updateAdminBlog(blogId, formData) {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE}/blogs/admin-posts/${blogId}`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to update blog');
    }
    return res.json();
  },

  async deleteAdminBlog(blogId) {
    return apiService.request(`/blogs/admin-posts/${blogId}`, { method: 'DELETE' });
  },

  async likeBlog(blogId) {
    return apiService.request(`/blogs/admin-posts/${blogId}/like`, { method: 'POST' });
  },

  // ─── RSS feed ─────────────────────────────────────────────────
  async getRssArticles() {
    return apiService.request('/blogs/rss');
  },

  // ─── Admin status ─────────────────────────────────────────────
  async checkAdmin() {
    return apiService.request('/blogs/check-admin');
  },

  async makeAdmin(email) {
    const formData = new FormData();
    formData.append('target_email', email);
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_BASE}/blogs/make-admin`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to make admin');
    }
    return res.json();
  },
};

export default blogService;
