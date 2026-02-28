import api from './api';

const blogService = {
  async getAllBlogs() {
    return api.get('/blogs/');
  },

  async getBlog(id) {
    return api.get(`/blogs/${id}`);
  },

  async getBlogsByCategory(category) {
    return api.get('/blogs/', { category });
  },

  async getBlogsByTag(tag) {
    return api.get('/blogs/', { tag });
  },

  async getRssArticles() {
    return api.get('/blogs/rss');
  },

  async getAdminBlogs() {
    return api.get('/blogs/admin-posts');
  },

  async getAdminBlog(id) {
    return api.get(`/blogs/admin-posts/${id}`);
  },

  async createAdminBlog(formData) {
    return api.post('/blogs/admin-posts', formData);
  },

  async updateAdminBlog(id, formData) {
    return api.put(`/blogs/admin-posts/${id}`, formData);
  },

  async deleteAdminBlog(id) {
    return api.delete(`/blogs/admin-posts/${id}`);
  },

  async likeBlog(id) {
    return api.post(`/blogs/admin-posts/${id}/like`);
  },

  async checkAdmin() {
    return api.get('/blogs/check-admin');
  },
};

export default blogService;
