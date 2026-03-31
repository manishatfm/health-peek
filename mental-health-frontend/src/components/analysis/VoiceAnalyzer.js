import React, { useState, useRef } from 'react';
import { voiceService } from '../../services';
import { useAnalysis } from '../../context/AnalysisContext';
import { LoadingSpinner, ErrorMessage } from '../common';
import './MessageAnalyzer.css';

const VoiceAnalyzer = () => {
  const { addAnalysis } = useAnalysis();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await voiceService.analyzeAudio(file);
      setResult(response);
      if (response?.text) {
        await addAnalysis(response.text, response);
      }
    } catch (err) {
      setError(err.message || 'Voice analysis failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });

        setIsProcessing(true);
        setError(null);
        try {
          const response = await voiceService.analyzeAudio(file);
          setResult(response);
          if (response?.text) {
            await addAnalysis(response.text, response);
          }
        } catch (err) {
          setError(err.message || 'Voice analysis failed');
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      setResult(null);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleClear = () => {
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
        <h3 style={{ marginBottom: '0.5rem' }}>🎤 Voice Emotion Analysis</h3>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Record your voice or upload an audio file to analyze emotions and sentiment.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={isRecording ? 'clear-button' : 'analyze-button'}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isRecording ? '⏹️ Stop Recording' : '🎙️ Record Voice'}
          </button>

          <label
            className="analyze-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            📁 Upload Audio
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              disabled={isProcessing || isRecording}
              style={{ display: 'none' }}
            />
          </label>

          {result && (
            <button onClick={handleClear} className="clear-button" disabled={isProcessing}>
              Clear
            </button>
          )}
        </div>

        {isRecording && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              animation: 'pulse 1.5s infinite',
            }} />
            <span style={{ color: '#dc2626', fontWeight: 500 }}>Recording... Speak now</span>
          </div>
        )}
      </div>

      {isProcessing && <LoadingSpinner message="Analyzing your voice..." />}
      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

      {result && (
        <div className="analysis-results">
          <h3>Voice Analysis Results</h3>

          <div className="result-card">
            {result.text && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem', color: '#374151' }}>Transcription</h4>
                <p style={{
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontStyle: 'italic',
                  color: '#4b5563',
                }}>&ldquo;{result.text}&rdquo;</p>
              </div>
            )}

            <div className="sentiment-result">
              <div className="sentiment-main">
                <span
                  className="sentiment-badge"
                  style={{ backgroundColor: getSentimentColor(result.sentiment) }}
                >
                  {result.sentiment?.charAt(0).toUpperCase() + result.sentiment?.slice(1)}
                </span>
                <span className="confidence-score">
                  Confidence: {formatConfidence(result.confidence || 0)}
                </span>
              </div>

              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{
                    width: `${(result.confidence || 0) * 100}%`,
                    backgroundColor: getSentimentColor(result.sentiment),
                  }}
                />
              </div>
            </div>

            {result.emotions && Object.keys(result.emotions).length > 0 && (
              <div className="emotions-breakdown">
                <h4>Emotion Analysis</h4>
                <div className="emotions-list">
                  {Object.entries(result.emotions)
                    .sort(([, a], [, b]) => b - a)
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
                  <span className="emoji-sentiment">{result.emoji_analysis.sentiment}</span>
                  <span className="emoji-confidence">
                    ({formatConfidence(result.emoji_analysis.confidence)})
                  </span>
                </div>
              </div>
            )}

            <div className="analysis-meta">
              <small>
                {result.analysis_id && <>Analysis ID: {result.analysis_id} | </>}
                Source: Voice {result.language ? `(${result.language})` : ''}
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceAnalyzer;
