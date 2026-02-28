import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { CONFIG } from '../config';

const authService = {
  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    await this.setAuth(data.access_token, data.user);
    return data;
  },

  async register(email, password, full_name) {
    const data = await api.post('/auth/register', { email, password, full_name });
    await this.setAuth(data.access_token, data.user);
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore server errors on logout
    }
    await this.clearAuth();
  },

  async getCurrentUser() {
    return api.get('/auth/me');
  },

  async validateToken() {
    return api.get('/auth/validate-token');
  },

  async updateProfile(data) {
    return api.put('/auth/profile', data);
  },

  async updateProfileImage(base64Image) {
    return api.post('/auth/profile-image', { profile_image: base64Image });
  },

  // Local storage helpers
  async setAuth(token, user) {
    await AsyncStorage.setItem(CONFIG.TOKEN_KEY, token);
    await AsyncStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },

  async getToken() {
    return AsyncStorage.getItem(CONFIG.TOKEN_KEY);
  },

  async getUser() {
    const user = await AsyncStorage.getItem(CONFIG.USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  },

  async clearAuth() {
    await AsyncStorage.multiRemove([CONFIG.TOKEN_KEY, CONFIG.USER_KEY]);
  },
};

export default authService;
