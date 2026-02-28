const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get authentication token from localStorage
  getToken() {
    return localStorage.getItem('authToken');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authentication token if available
    const token = this.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Debug logging (can be disabled in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method || 'GET'} ${url}`);
      if (token) {
        console.log(`Token: ${token.substring(0, 20)}...`);
      }
    }

    try {
      const response = await fetch(url, config);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`API Response: ${response.status} ${response.statusText}`);
      }
      
      // Handle different response types
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = await response.text();
      }
      
      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          // Clear invalid token
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          
          // Redirect to login if not already there
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        
        const errorMessage = typeof result === 'object' ? result.detail || result.message : result;
        throw new Error(`HTTP ${response.status}: ${errorMessage}`);
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('API Result:', result);
      }
      
      return result;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Helper methods for common HTTP methods
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url);
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}