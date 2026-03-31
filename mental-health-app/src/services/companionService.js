import api from './api';

class CompanionService {
  /**
   * Send a message to the AI companion.
   * @param {string} message
   * @param {Array<{role: string, content: string}>} history
   * @returns {Promise<string>} reply text
   */
  async chat(message, history = []) {
    const data = await api.request('/api/companion/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_history: history,
      }),
    });
    return data.reply;
  }
}

export default new CompanionService();
