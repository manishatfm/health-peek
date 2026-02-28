import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

class ApiService {
  constructor() {
    this.baseURL = CONFIG.API_URL;
  }

  async getToken() {
    try {
      return await AsyncStorage.getItem(CONFIG.TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async request(endpoint, options = {}) {
    const token = await this.getToken();
    const url = `${this.baseURL}${endpoint}`;

    const headers = {
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        await AsyncStorage.multiRemove([CONFIG.TOKEN_KEY, CONFIG.USER_KEY]);
        throw new Error('UNAUTHORIZED');
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      }

      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      if (!response.ok) {
        const message = data?.detail || data?.message || `HTTP ${response.status}`;
        throw new Error(message);
      }

      return data;
    } catch (error) {
      if (error.message === 'UNAUTHORIZED') throw error;
      if (error.message?.startsWith('HTTP')) throw error;
      throw new Error(`Network error: ${error.message}`);
    }
  }

  async get(endpoint, params = {}) {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, body) {
    const options = { method: 'POST' };
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.body = JSON.stringify(body);
    }
    return this.request(endpoint, options);
  }

  async put(endpoint, body) {
    const options = { method: 'PUT' };
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.body = JSON.stringify(body);
    }
    return this.request(endpoint, options);
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default new ApiService();
