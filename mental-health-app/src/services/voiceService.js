import api from './api';

const voiceService = {
  async analyzeAudio(filePath, mimeType = 'audio/wav') {
    const formData = new FormData();
    formData.append('file', {
      uri: filePath,
      type: mimeType,
      name: 'recording.wav',
    });
    return api.post('/api/voice/analyze', formData);
  },

  async getStatus() {
    return api.get('/api/voice/status');
  },
};

export default voiceService;
