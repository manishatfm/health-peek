import { ApiService } from './base';

export class AnalysisService extends ApiService {
  // Single message analysis
  async analyzeMessage(message) {
    return this.request('/analysis/analyze', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Bulk message analysis
  async analyzeBulkMessages(messages) {
    return this.request('/analysis/analyze-bulk', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
  }

  // Analysis history
  async getAnalysisHistory(limit = 50, offset = 0) {
    const params = new URLSearchParams({ 
      limit: limit.toString(), 
      offset: offset.toString() 
    });
    return this.request(`/analysis/history?${params}`);
  }

  // Get specific analysis
  async getAnalysisById(analysisId) {
    return this.request(`/analysis/history/${analysisId}`);
  }

  // Delete analysis
  async deleteAnalysis(analysisId) {
    return this.request(`/analysis/history/${analysisId}`, {
      method: 'DELETE',
    });
  }

  // Delete all analyses for a specific date
  async deleteAnalysesByDate(date) {
    // date should be in format: YYYY-MM-DD (e.g., "2025-11-07")
    return this.request(`/analysis/history/by-date/${date}`, {
      method: 'DELETE',
    });
  }

  // Batch delete analyses
  async deleteMultipleAnalyses(analysisIds) {
    const deletePromises = analysisIds.map(id => this.deleteAnalysis(id));
    return Promise.allSettled(deletePromises);
  }

  // Chat import and analysis
  async importChat(data) {
    return this.request('/analysis/import-chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get chat analysis history
  async getChatAnalysisHistory(limit = 20, offset = 0) {
    const params = new URLSearchParams({ 
      limit: limit.toString(), 
      offset: offset.toString() 
    });
    return this.request(`/analysis/chat-history?${params}`);
  }

  // Get specific chat analysis
  async getChatAnalysisById(analysisId) {
    return this.request(`/analysis/chat-history/${analysisId}`);
  }

  // Delete specific chat import by ID
  async deleteChatImport(chatId) {
    return this.request(`/analysis/chat-history/${chatId}`, {
      method: 'DELETE',
    });
  }

  // Delete recent bulk import (legacy - use deleteChatImport instead)
  async deleteRecentBulkImport() {
    return this.request('/analysis/bulk-import/recent', {
      method: 'DELETE',
    });
  }

  // Migrate old bulk imports to add source field
  async migrateBulkImports() {
    return this.request('/analysis/migrate-bulk-imports', {
      method: 'POST',
    });
  }
}

export const analysisService = new AnalysisService();