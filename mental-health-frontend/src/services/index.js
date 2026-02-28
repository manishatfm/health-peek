// Import all services first
import { authService } from './authService';
import { analysisService } from './analysisService';
import { dashboardService } from './dashboardService';
import { blogService } from './blogService';

// Export all services for easy importing
export { authService } from './authService';
export { analysisService } from './analysisService';
export { dashboardService } from './dashboardService';
export { blogService } from './blogService';
export { ApiService } from './base';

// Legacy ApiService class for backward compatibility
class LegacyApiService {
  // Authentication methods
  async login(email, password) {
    const result = await authService.login(email, password);
    if (result.access_token) {
      authService.setAuthToken(result.access_token);
    }
    return result;
  }

  async register(email, password, fullName) {
    return authService.register(email, password, fullName);
  }

  async logout() {
    return authService.logout();
  }

  // Analysis methods
  async analyzeMessage(message) {
    return analysisService.analyzeMessage(message);
  }

  async analyzeBulkMessages(messages) {
    return analysisService.analyzeBulkMessages(messages);
  }

  // Dashboard methods
  async getDashboardData(timeRange) {
    return dashboardService.getDashboardStats(timeRange);
  }

  async getMoodTrends(timeRange) {
    return dashboardService.getMoodTrends(timeRange);
  }

  async getSuggestions() {
    return dashboardService.getSuggestions();
  }

  async exportData(timeRange, format) {
    return dashboardService.exportData(timeRange, format);
  }
}

// Export legacy instance for backward compatibility
export default new LegacyApiService();