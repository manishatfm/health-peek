import { ApiService } from './base';

export class CompanionService extends ApiService {
  /**
   * Send a message to the AI companion.
   * @param {string} message - The user's message.
   * @param {Array<{role: string, content: string}>} history - Prior conversation turns.
   * @returns {Promise<string>} - The companion's reply text.
   */
  async chat(message, history = []) {
    const data = await this.request('/api/companion/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_history: history,
      }),
    });
    return data.reply;
  }
}

export const companionService = new CompanionService();
