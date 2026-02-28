/**
 * Voice Recognition Helper
 * Provides utilities for checking and debugging voice recognition issues
 */

export const VoiceRecognitionHelper = {
  /**
   * Check if voice recognition is supported
   */
  isSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  },

  /**
   * Check if in secure context
   */
  isSecureContext() {
    return (
      window.isSecureContext ||
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
  },

  /**
   * Check browser compatibility
   */
  getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let isSupported = false;

    if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
      browserName = 'Chrome';
      isSupported = true;
    } else if (userAgent.indexOf('Edg') > -1) {
      browserName = 'Edge';
      isSupported = true;
    } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
      browserName = 'Safari';
      isSupported = true;
    } else if (userAgent.indexOf('Firefox') > -1) {
      browserName = 'Firefox';
      isSupported = false;
    } else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
      browserName = 'Opera';
      isSupported = true;
    }

    return { browserName, isSupported };
  },

  /**
   * Check microphone permission status
   */
  async checkMicrophonePermission() {
    try {
      if (!navigator.permissions) {
        return { status: 'unknown', message: 'Permissions API not available' };
      }

      const result = await navigator.permissions.query({ name: 'microphone' });
      return {
        status: result.state,
        message: result.state === 'granted' 
          ? 'Microphone access granted' 
          : result.state === 'denied'
          ? 'Microphone access denied'
          : 'Microphone permission not yet requested'
      };
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      return { status: 'error', message: 'Could not check microphone permission' };
    }
  },

  /**
   * Request microphone permission
   */
  async requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
      return { success: true, message: 'Microphone permission granted' };
    } catch (error) {
      return { 
        success: false, 
        message: error.name === 'NotAllowedError' 
          ? 'Microphone permission denied by user'
          : error.name === 'NotFoundError'
          ? 'No microphone found'
          : `Error: ${error.message}`
      };
    }
  },

  /**
   * Get comprehensive diagnostic info
   */
  async getDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      isSecureContext: this.isSecureContext(),
      windowIsSecureContext: window.isSecureContext,
      speechRecognitionAvailable: this.isSupported(),
      browser: this.getBrowserInfo(),
      microphone: await this.checkMicrophonePermission(),
      userAgent: navigator.userAgent
    };

    console.log('=== Voice Recognition Diagnostics ===');
    console.table(diagnostics);
    console.log('Full diagnostics:', diagnostics);
    
    return diagnostics;
  },

  /**
   * Get user-friendly error message with fixes
   */
  getErrorSolution(errorType) {
    const solutions = {
      'network': {
        title: 'Network Error',
        problem: 'Voice recognition requires internet connection',
        solutions: [
          'Make sure you have an active internet connection',
          'Access via localhost instead of 127.0.0.1',
          'Try using Chrome or Edge browser',
          'Reload the page (press F5) and try again',
          'Clear browser cache and cookies'
        ]
      },
      'not-allowed': {
        title: 'Permission Denied',
        problem: 'Microphone access is blocked',
        solutions: [
          'Click the lock/info icon in the browser address bar',
          'Go to Site Settings',
          'Find Microphone and change to "Allow"',
          'Reload the page (press F5)',
          'Try the microphone button again'
        ]
      },
      'no-speech': {
        title: 'No Speech Detected',
        problem: 'No audio input detected',
        solutions: [
          'Speak louder and clearer',
          'Move closer to your microphone',
          'Check if microphone is muted',
          'Test microphone in system settings',
          'Try a different microphone'
        ]
      },
      'audio-capture': {
        title: 'No Microphone Found',
        problem: 'No audio input device detected',
        solutions: [
          'Connect a microphone to your computer',
          'Check if microphone is properly plugged in',
          'Verify microphone is enabled in system settings',
          'Try a different USB port (for USB microphones)',
          'Reload the page after connecting microphone'
        ]
      },
      'service-not-allowed': {
        title: 'Service Not Available',
        problem: 'Speech recognition service is blocked',
        solutions: [
          'Use Chrome, Edge, or Safari browser',
          'Access via localhost (not 127.0.0.1)',
          'Enable speech recognition in browser settings',
          'Check if you\'re behind a firewall that blocks the service'
        ]
      }
    };

    return solutions[errorType] || {
      title: 'Unknown Error',
      problem: `Voice recognition error: ${errorType}`,
      solutions: [
        'Reload the page and try again',
        'Use Chrome or Edge browser',
        'Check internet connection',
        'Ensure microphone is connected and working'
      ]
    };
  },

  /**
   * Format URL to use localhost instead of 127.0.0.1
   */
  getLocalhostUrl() {
    if (window.location.hostname === '127.0.0.1') {
      return window.location.href.replace('127.0.0.1', 'localhost');
    }
    return window.location.href;
  }
};

export default VoiceRecognitionHelper;
