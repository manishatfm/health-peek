// import React, { useState } from 'react';
// import axios from 'axios';

// function ChatForm() {
//   const [message, setMessage] = useState('');
//   const [result, setResult] = useState('');
//   const [loading, setLoading] = useState(false);

//   const analyzeMessage = async () => {
//     if (!message.trim()) {
//       alert('Please enter a message.');
//       return;
//     }

//     setLoading(true);
//     try {
//       const response = await axios.post('http://localhost:8000/analyze', {
//         message: message,
//       });
//       setResult(response.data.prediction);
//     } catch (error) {
//       console.error('Error:', error);
//       setResult('Failed to analyze message.');
//     }
//     setLoading(false);
//   };

//   return (
//     <div>
//       <textarea
//         rows="4"
//         cols="50"
//         placeholder="Enter your message..."
//         value={message}
//         onChange={(e) => setMessage(e.target.value)}
//       ></textarea>
//       <br />
//       <button onClick={analyzeMessage} disabled={loading}>
//         {loading ? 'Analyzing...' : 'Submit'}
//       </button>
//       <h3>Prediction: {result}</h3>
//     </div>
//   );
// }

// export default ChatForm;
import React, { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { useAnalysis } from "./context/AnalysisContext";
import { analysisService } from "./services";
import { AnalysisHistory, ChatImport, ChatHistory } from "./components/analysis";
import apiService from "./services/api";

function ChatForm() {
  const { addAnalysis } = useAnalysis();
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [chatHistoryRefresh, setChatHistoryRefresh] = useState(0);

  useEffect(() => {
    // Initialize Speech Recognition - simplified approach
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognitionInstance = new SpeechRecognition();
        
        // Configure for best reliability
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;  // Changed to false for better reliability
        recognitionInstance.lang = 'en-US';
        recognitionInstance.maxAlternatives = 1;
        
        recognitionInstance.onstart = () => {
          console.log('🎤 Recording started');
          setIsRecording(true);
          setError(null);
        };
        
        recognitionInstance.onresult = (event) => {
          console.log('✅ Speech recognized');
          let transcript = '';
          
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript + ' ';
          }
          
          if (transcript.trim()) {
            setMessage(prev => (prev + ' ' + transcript).trim());
            console.log('Transcript:', transcript);
          }
        };
        
        recognitionInstance.onerror = (event) => {
          console.error('❌ Speech error:', event.error);
          setIsRecording(false);
          
          // More user-friendly error messages
          const errorMessages = {
            'network': '⚠️ Voice recognition unavailable. This feature requires Google\'s speech service which may be blocked by your network/firewall. Please type your message instead.',
            'not-allowed': '⚠️ Microphone blocked. Click the lock icon in your browser\'s address bar, allow microphone access, and reload the page.',
            'no-speech': '⚠️ No speech detected. Please try speaking again.',
            'audio-capture': '⚠️ No microphone detected. Please connect a microphone.',
            'aborted': '⚠️ Recording stopped. Click the microphone to try again.',
            'service-not-allowed': '⚠️ Voice recognition service unavailable. Please use Chrome or Edge browser.'
          };
          
          setError(errorMessages[event.error] || `⚠️ Voice error: ${event.error}. Please type your message instead.`);
        };
        
        recognitionInstance.onend = () => {
          console.log('🔴 Recording ended');
          setIsRecording(false);
        };
        
        setRecognition(recognitionInstance);
        console.log('✅ Voice recognition initialized');
      } catch (error) {
        console.error('Failed to init speech recognition:', error);
      }
    } else {
      console.warn('⚠️ Speech recognition not supported in this browser');
    }
    
    return () => {
      // Cleanup handled by component unmount effect below
    };
  }, []);

  // Helper function to determine risk level based on sentiment and confidence
  const getRiskLevel = (sentiment, confidence) => {
    if (!sentiment || !confidence) return 'Unknown';
    
    if (sentiment === 'negative' && confidence > 0.7) {
      return 'High';
    } else if (sentiment === 'negative' && confidence > 0.5) {
      return 'Medium';
    } else if (sentiment === 'positive') {
      return 'Low';
    } else {
      return 'Low';
    }
  };

  // Helper function to calculate average confidence for bulk results
  const calculateAverageConfidence = (result) => {
    if (result.summary?.average_confidence) {
      return (result.summary.average_confidence * 100).toFixed(1) + '%';
    }
    if (result.results && Array.isArray(result.results)) {
      const avgConfidence = result.results.reduce((sum, r) => sum + (r.confidence || 0), 0) / result.results.length;
      return (avgConfidence * 100).toFixed(1) + '%';
    }
    return '0%';
  };

  // Helper function to determine overall risk level for bulk results
  const getOverallRiskLevel = (result) => {
    if (result.summary?.sentiment_distribution) {
      const dist = result.summary.sentiment_distribution;
      const total = dist.positive + dist.negative + dist.neutral;
      const negativeRatio = dist.negative / total;
      
      if (negativeRatio > 0.5) return 'High';
      if (negativeRatio > 0.3) return 'Medium';
      return 'Low';
    }
    return 'Unknown';
  };

  const handleAnalyze = async () => {
    if (!message.trim()) {
      alert("Please enter a message.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Use the analysis service directly for better integration
      const analysisResult = await analysisService.analyzeMessage(message);
      setResult(analysisResult);
      
      // Add to global analysis history via context
      await addAnalysis(message, analysisResult);
      
      // Check for crisis indicators
      if (analysisResult.sentiment === 'negative' && analysisResult.confidence > 0.7) {
        await handleCrisisDetection(analysisResult);
      }
    } catch (error) {
      setError('Analysis failed. Please try again.');
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrisisDetection = async (analysisResult) => {
    try {
      await apiService.reportCrisis({
        message: message,
        analysisResult: analysisResult,
        timestamp: new Date().toISOString()
      });
      // Show crisis support resources
      alert('Crisis indicators detected. Emergency resources have been notified.');
    } catch (error) {
      console.error('Crisis reporting failed:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    
    try {
      const bulkResult = await apiService.analyzeBulkMessages(file);
      setResult(bulkResult);
      setBulkMode(true);
    } catch (error) {
      setError(`Failed to process ${file.name}. Please check the file format and try again.`);
      console.error('Bulk analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoiceRecording = async () => {
    if (!recognition) {
      setError('⚠️ Voice recognition not available in this browser. Please use Chrome, Edge, or Safari. You can type your message instead.');
      return;
    }

    if (isRecording) {
      // Stop recording
      try {
        recognition.stop();
        console.log('⏹️ Stopping recording...');
      } catch (error) {
        console.error('Error stopping:', error);
        setIsRecording(false);
      }
      return;
    }

    // Start recording
    setError(null);
    console.log('🎤 Attempting to start voice recording...');
    
    // Check internet
    if (!navigator.onLine) {
      setError('⚠️ No internet connection. Voice recognition requires internet. Please type your message instead.');
      return;
    }
    
    try {
      // Request microphone permission
      console.log('📍 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted');
      
      // Stop stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      // Small delay before starting recognition
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Start speech recognition
      try {
        recognition.start();
        console.log('✅ Speech recognition started');
      } catch (startError) {
        console.error('❌ Start error:', startError);
        
        if (startError.name === 'InvalidStateError') {
          // Already running, stop and restart
          console.log('🔄 Restarting...');
          recognition.stop();
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              setError('⚠️ Voice recognition busy. Please wait and try again.');
            }
          }, 300);
        } else {
          setError('⚠️ Cannot start voice recognition. Please type your message instead.');
        }
      }
    } catch (micError) {
      console.error('❌ Microphone error:', micError);
      
      if (micError.name === 'NotAllowedError') {
        setError('⚠️ Microphone permission denied. Click the lock icon in the address bar, select "Site settings", allow microphone, then reload the page.');
      } else if (micError.name === 'NotFoundError') {
        setError('⚠️ No microphone found. Please connect a microphone.');
      } else {
        setError('⚠️ Cannot access microphone. Please type your message instead.');
      }
    }
  };

  // Cleanup effect for voice recognition
  useEffect(() => {
    return () => {
      if (recognition && isRecording) {
        try {
          recognition.stop();
        } catch (error) {
          console.error('Error stopping recognition on cleanup:', error);
        }
      }
    };
  }, [recognition, isRecording]);

  const clearAnalysis = () => {
    setMessage("");
    setResult(null);
    setBulkMode(false);
    setError(null);
    if (isRecording && recognition) {
      try {
        recognition.stop();
        setIsRecording(false);
      } catch (error) {
        console.error('Error stopping recognition:', error);
        setIsRecording(false);
      }
    }
  };

  return (
    <div className="chat-form">
      <div className="analysis-content">
        <div className="analysis-header">
          <h2>Message Analysis</h2>
          <div className="mode-toggle">
            <button 
              className={!bulkMode ? 'mode-btn active' : 'mode-btn'}
              onClick={() => {setBulkMode(false); setResult(null); setError(null);}}
              disabled={loading}
            >
              Single Message
            </button>
            <button 
              className={bulkMode ? 'mode-btn active' : 'mode-btn'}
              onClick={() => setBulkMode(true)}
              disabled={loading}
            >
              Bulk Import
            </button>
          </div>
        </div>

        {/* Voice Recognition Status Notice */}
        {!recognition && (
          <div className="error-message" style={{backgroundColor: '#e7f3ff', borderColor: '#2196F3', color: '#014361'}}>
            <span className="error-icon">ℹ️</span>
            <div>
              <strong>Note:</strong> Voice recognition is not available in your current setup. This is optional - you can type your messages directly in the text box below. The sentiment analysis will work the same way!
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <div>
              <strong>Please try again.</strong> {error}
            </div>
          </div>
        )}

        {!bulkMode ? (
          <div className="single-analysis">
            <div className="input-section">
              <div className="input-header">
                <label htmlFor="message-input" className="input-label">
                  Share your thoughts
                </label>
                <span className="input-hint">Your message is private and secure</span>
              </div>
              <div className="textarea-container">
                <textarea
                  id="message-input"
                  rows="6"
                  placeholder={isRecording ? "Listening... Speak now..." : "How are you feeling today? Share what's on your mind or use the microphone..."}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`message-input ${isRecording ? 'recording' : ''}`}
                  disabled={loading}
                />
                {/* <button
                  className={`voice-button ${isRecording ? 'recording' : ''}`}
                  onClick={toggleVoiceRecording}
                  disabled={loading}
                  title={isRecording ? "Stop recording" : "Start voice input"}
                >
                  {isRecording ? '⏹️' : '🎤'}
                </button> */}
              </div>
              {error && error.includes('network') && (
                <div style={{marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px', fontSize: '12px'}}>
                  <strong>🔍 Troubleshooting Tips:</strong>
                  <ul style={{marginTop: '5px', marginBottom: '0', paddingLeft: '20px'}}>
                    <li>Make sure you have internet connection</li>
                    <li>Check if firewall/VPN is blocking Google services</li>
                    <li>Open browser console (F12) to see detailed error logs</li>
                    <li>Try in incognito/private window</li>
                    <li>Try different browser (Chrome recommended)</li>
                  </ul>
                </div>
              )}
              <div className="input-footer">
                <div className="input-footer-left">
                  <span className={`char-count ${message.length > 900 ? 'warning' : ''}`}>
                    {message.length}/1000 characters
                  </span>
                  {isRecording && (
                    <span className="recording-indicator">
                      <span className="recording-dot"></span>
                      Recording...
                    </span>
                  )}
                </div>
                <div className="action-buttons">
                  <button
                    onClick={handleAnalyze}
                    className="analyze-button"
                    disabled={loading || !message.trim() || message.length > 1000 || isRecording}
                  >
                    {loading && message.trim() ? (
                      <div className="button-content">
                        <div className="loading-dot-spinner"></div>
                        Analyzing...
                      </div>
                    ) : 'Analyze Message'}
                  </button>
                  <button onClick={clearAnalysis} className="clear-button" disabled={loading}>
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <ChatImport onImportSuccess={() => setChatHistoryRefresh(prev => prev + 1)} />
            {/* Show chat import history in bulk mode */}
            <ChatHistory maxItems={3} refreshTrigger={chatHistoryRefresh} />
          </>
        )}

        {result && !bulkMode && (
          <div className="results-section">
            <div className="single-result">
              <h3>Analysis Results {result.isOffline && <span className="offline-indicator">(Offline Mode)</span>}</h3>
              <div className="result-cards">
                <div className="result-card sentiment">
                  <div className="result-label">Sentiment</div>
                  <div className={`result-value ${result.sentiment?.toLowerCase() || 'neutral'}`}>
                    {result.sentiment ? 
                      result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1) : 
                      "Unknown"}
                  </div>
                  {result.confidence && (
                    <div className="confidence">Confidence: {(result.confidence * 100).toFixed(1)}%</div>
                  )}
                </div>
                <div className="result-card risk">
                  <div className="result-label">Risk Assessment</div>
                  <div className={`result-value risk-${getRiskLevel(result.sentiment, result.confidence)?.toLowerCase() || 'unknown'}`}>
                    {getRiskLevel(result.sentiment, result.confidence)}
                  </div>
                  {getRiskLevel(result.sentiment, result.confidence) === 'High' && (
                    <div className="crisis-warning">
                      ⚠️ Crisis indicators detected. Please seek immediate help if needed.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Show analysis history ONLY in single message mode */}
        {!bulkMode && <AnalysisHistory maxItems={5} />}
      </div>
    </div>
  );
}

export default ChatForm;
