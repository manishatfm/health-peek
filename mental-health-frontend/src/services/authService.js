import { ApiService } from './base';

export class AuthService extends ApiService {
  // Authentication endpoints
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email, password, fullName = null) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ 
        email, 
        password, 
        full_name: fullName 
      }),
    });
  }

  async logout() {
    const result = await this.request('/auth/logout', {
      method: 'POST',
    });
    
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    return result;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async validateToken() {
    return this.request('/auth/validate-token');
  }

  async updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async updateProfileImage(profileImage) {
    return this.request('/auth/profile-image', {
      method: 'POST',
      body: JSON.stringify({ profile_image: profileImage }),
    });
  }

  // Local auth state management
  setAuthToken(token) {
    localStorage.setItem('authToken', token);
  }

  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  isAuthenticated() {
    return !!this.getAuthToken();
  }

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }

  clearAuth() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }
}

export const authService = new AuthService();