import React, { useState } from 'react';
import { analysisService } from '../../services';
import { useAnalysis } from '../../context/AnalysisContext';
import { LoadingSpinner, ErrorMessage } from '../common';
import './MessageAnalyzer.css';

const LANGUAGE_OPTIONS = [
  { code: '', label: '🌐 Auto-detect' },
  { code: 'hinglish', label: '🇮🇳 Hinglish' },
  { code: 'hi', label: '🇮🇳 Hindi (हिन्दी)' },
  { code: 'bn', label: '🇮🇳 Bengali (বাংলা)' },
  { code: 'ta', label: '🇮🇳 Tamil (தமிழ்)' },
  { code: 'te', label: '🇮🇳 Telugu (తెలుగు)' },
  { code: 'mr', label: '🇮🇳 Marathi (मराठी)' },
  { code: 'gu', label: '🇮🇳 Gujarati (ગુજરાતી)' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'es', label: '🇪🇸 Spanish' },
  { code: 'fr', label: '🇫🇷 French' },
  { code: 'de', label: '🇩🇪 German' },
  { code: 'pt', label: '🇧🇷 Portuguese' },
  { code: 'ar', label: '🇸🇦 Arabic' },
  { code: 'ru', label: '🇷🇺 Russian' },
  { code: 'ja', label: '🇯🇵 Japanese' },
  { code: 'zh', label: '🇨🇳 Chinese' },
  { code: 'ko', label: '🇰🇷 Korean' },
  { code: 'it', label: '🇮🇹 Italian' },
  { code: 'nl', label: '🇳🇱 Dutch' },
  { code: 'tr', label: '🇹🇷 Turkish' },
  { code: 'pl', label: '🇵🇱 Polish' },
];

const MessageAnalyzer = ({ onAnalysisComplete }) => {
  const { addAnalysis } = useAnalysis();
  const [message, setMessage] = useState('');
  const [language, setLanguage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const analysis = await analysisService.analyzeMessage(message, language || null);
      setResult(analysis);
      
      // Add to global analysis history
      await addAnalysis(message, analysis);
      
      // Clear message after successful analysis
      setMessage('');
      
      if (onAnalysisComplete) {
        onAnalysisComplete(analysis);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setMessage('');
    setLanguage('');
    setResult(null);
    setError(null);
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '#22c55e';
      case 'negative': return '#ef4444';
      case 'neutral': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatConfidence = (confidence) => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  return (
    <div className="message-analyzer">
      <div className="analyzer-form">
        <form onSubmit={handleAnalyze}>
          <div className="input-group">
            <label htmlFor="message-input">Enter your message:</label>
            <textarea
              id="message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              maxLength={5000}
              disabled={isAnalyzing}
            />
            <div className="character-count">
              {message.length}/5000
            </div>
          </div>
          
          <div className="input-group language-select-group">
            <label htmlFor="language-select">🌐 Language (optional):</label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isAnalyzing}
              className="language-select"
            >
              {LANGUAGE_OPTIONS.map(opt => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              disabled={!message.trim() || isAnalyzing}
              className="analyze-button"
            >
              {isAnalyzing && message.trim() ? (
                <div className="button-content">
                  <div className="loading-dot-spinner"></div>
                  Analyzing...
                </div>
              ) : 'Analyze Message'}
            </button>
            
            <button 
              type="button" 
              onClick={handleClear}
              className="clear-button"
              disabled={isAnalyzing}
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {isAnalyzing && <div className="analysis-loading">
        <LoadingSpinner message="Analyzing your message..." />
      </div>}

      {error && (
        <ErrorMessage 
          message="Analysis failed" 
          details={error}
          onClose={() => setError(null)} 
        />
      )}

      {result && (
        <div className="analysis-results">
          <h3>Analysis Results</h3>
          
          <div className="result-card">
            <div className="sentiment-result">
              <div className="sentiment-main">
                <span 
                  className="sentiment-badge"
                  style={{ backgroundColor: getSentimentColor(result.sentiment) }}
                >
                  {result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1)}
                </span>
                <span className="confidence-score">
                  Confidence: {formatConfidence(result.confidence)}
                </span>
              </div>
              
              <div className="confidence-bar">
                <div 
                  className="confidence-fill"
                  style={{ 
                    width: `${result.confidence * 100}%`,
                    backgroundColor: getSentimentColor(result.sentiment)
                  }}
                />
              </div>
            </div>

            {result.emotions && Object.keys(result.emotions).length > 0 && (
              <div className="emotions-breakdown">
                <h4>Emotion Analysis</h4>
                <div className="emotions-list">
                  {Object.entries(result.emotions)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([emotion, score]) => (
                      <div key={emotion} className="emotion-item">
                        <span className="emotion-name">
                          {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                        </span>
                        <div className="emotion-bar">
                          <div 
                            className="emotion-fill"
                            style={{ width: `${score * 100}%` }}
                          />
                        </div>
                        <span className="emotion-score">
                          {formatConfidence(score)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {result.emoji_analysis && (
              <div className="emoji-analysis">
                <h4>Emoji Analysis</h4>
                <div className="emoji-result">
                  <span className="emoji-sentiment">
                    {result.emoji_analysis.sentiment}
                  </span>
                  <span className="emoji-confidence">
                    ({formatConfidence(result.emoji_analysis.confidence)})
                  </span>
                </div>
              </div>
            )}

            <div className="analysis-meta">
              <small>
                Analysis ID: {result.analysis_id} | 
                Analyzed at: {new Date(result.timestamp).toLocaleString()}
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageAnalyzer;