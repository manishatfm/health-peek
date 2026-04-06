import api from './api';

const analysisService = {
  async analyzeMessage(message, language = null) {
    const body = { message };
    if (language) body.language = language;
    return api.post('/analysis/analyze', body);
  },

  async analyzeBulkMessages(messages) {
    return api.post('/analysis/analyze-bulk', { messages });
  },

  async getAnalysisHistory(limit = 50, offset = 0) {
    return api.get('/analysis/history', { limit, offset });
  },

  async getAnalysisById(id) {
    return api.get(`/analysis/history/${id}`);
  },

  async deleteAnalysis(id) {
    return api.delete(`/analysis/history/${id}`);
  },

  async deleteAnalysesByDate(date) {
    return api.delete(`/analysis/history/by-date/${date}`);
  },

  async importChat(content, formatType, currentUserName, language = null) {
    const body = {
      content,
      format_type: formatType,
      current_user_name: currentUserName,
    };
    if (language) body.language = language;
    return api.post('/analysis/import-chat', body);
  },

  async getChatHistory(limit = 20, offset = 0) {
    return api.get('/analysis/chat-history', { limit, offset });
  },

  async getChatAnalysisById(id) {
    return api.get(`/analysis/chat-history/${id}`);
  },

  async deleteChatImport(chatId) {
    return api.delete(`/analysis/chat-history/${chatId}`);
  },
};

export default analysisService;
