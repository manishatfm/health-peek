const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
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

    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Debug logging
    console.log(`API Request: ${config.method || 'GET'} ${url}`);
    if (token) {
      console.log(`Token: ${token.substring(0, 20)}...`);
    }

    try {
      const response = await fetch(url, config);
      
      console.log(`API Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error Response: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('API Result:', result);
      return result;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email, password, name) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // Analysis endpoints
  async analyzeMessage(message) {
    return this.request('/analysis/analyze', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async analyzeBulkMessages(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request('/analysis/analyze-bulk', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  async getDashboardData(timeRange = '30d') {
    console.log(`Requesting dashboard data with timeRange: ${timeRange}`);
    try {
      const result = await this.request(`/dashboard/stats?time_range=${timeRange}`);
      console.log('Dashboard data response:', result);
      return result;
    } catch (error) {
      console.error('Dashboard data request failed:', error);
      throw error;
    }
  }

  async getMoodTrends(timeRange = '30d') {
    return this.request(`/dashboard/mood-trends?time_range=${timeRange}`);
  }

  async getAnalysisHistory(limit = 10) {
    return this.request(`/analysis/history?limit=${limit}`);
  }

  // Suggestions endpoints
  async getSuggestions() {
    return this.request('/suggestions');
  }

  async markSuggestionRead(suggestionId) {
    return this.request(`/suggestions/${suggestionId}/read`, {
      method: 'POST',
    });
  }

  // Export endpoints
  async exportAnalysis(format = 'pdf', type = 'personal', dateRange = null) {
    const params = new URLSearchParams({ format });
    if (dateRange) {
      params.append('startDate', dateRange.start);
      params.append('endDate', dateRange.end);
    }
    
    return this.request(`/export/${type}?${params.toString()}`, {
      method: 'POST',
    });
  }

  // Emergency response
  async reportCrisis(data) {
    return this.request('/emergency/report', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Data management
  async clearUserData() {
    return this.request('/user/data', {
      method: 'DELETE',
    });
  }

  async exportUserData() {
    return this.request('/user/data/export');
  }
}

export default new ApiService();
