import React, { useState } from 'react';
import { analysisService } from '../../services';
import { useAnalysis } from '../../context/AnalysisContext';
import { LoadingSpinner, ErrorMessage } from '../common';
import './ChatImport.css';

const ChatImport = ({ onImportSuccess }) => {
  const [chatContent, setChatContent] = useState('');
  const [formatType, setFormatType] = useState('');
  const [userName, setUserName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileInfo({
      name: file.name,
      size: (file.size / 1024).toFixed(2) + ' KB'
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      setChatContent(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleTextInput = (e) => {
    setChatContent(e.target.value);
    setFileInfo(null);
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    
    if (!chatContent.trim()) {
      setError('Please provide chat content');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analysisService.importChat({
        content: chatContent,
        format_type: formatType || null,
        current_user_name: userName.trim() || null
      });

      setAnalysis(result);
      
      // Notify parent component to refresh chat history
      if (onImportSuccess) {
        setTimeout(() => {
          onImportSuccess();
        }, 500);
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze chat');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setChatContent('');
    setFormatType('');
    setUserName('');
    setFileInfo(null);
    setAnalysis(null);
    setError(null);
  };

  const formatNumber = (num) => {
    return num?.toLocaleString() || 0;
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(1)} hrs`;
    return `${(minutes / 1440).toFixed(1)} days`;
  };

  return (
    <div className="chat-import">
      <div className="import-header">
        <h2>Import Chat History</h2>
        <p>Analyze your conversations from WhatsApp, Telegram, Discord, and more!</p>
      </div>

      {!analysis && (
        <div className="import-form">
          <form onSubmit={handleAnalyze}>
            <div className="upload-section">
              <label className="file-upload-label">
                <input
                  type="file"
                  accept=".txt,.csv,.log"
                  onChange={handleFileUpload}
                  disabled={isAnalyzing}
                />
                <span className="upload-button">
                  📁 Choose Chat Export File
                </span>
              </label>
              
              {fileInfo && (
                <div className="file-info">
                  <span>✓ {fileInfo.name}</span>
                  <span className="file-size">{fileInfo.size}</span>
                </div>
              )}
            </div>

            <div className="divider">
              <span>OR</span>
            </div>

            <div className="input-group">
              <label>Paste Chat Content:</label>
              <textarea
                value={chatContent}
                onChange={handleTextInput}
                placeholder={`Paste your chat history here...

Examples:
• WhatsApp: 12/31/2023, 10:30 PM - John: Hello!
• Telegram: 31.12.2023 22:30 - Jane: Hi there!
• Generic: John: Hello! / Jane: Hi!`}
                rows={12}
                disabled={isAnalyzing}
              />
              <div className="char-count">{chatContent.length} characters</div>
            </div>

            <div className="options-row">
              <div className="input-group small">
                <label>Chat Format (optional):</label>
                <select
                  value={formatType}
                  onChange={(e) => setFormatType(e.target.value)}
                  disabled={isAnalyzing}
                >
                  <option value="">Auto-detect</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="discord">Discord</option>
                  <option value="imessage">iMessage</option>
                  <option value="generic">Generic</option>
                </select>
              </div>

              <div className="input-group small">
                <label>Your Name (optional):</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your name in chat"
                  disabled={isAnalyzing}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                disabled={!chatContent.trim() || isAnalyzing}
                className="analyze-button"
              >
                {isAnalyzing ? (
                  <>
                    <div className="button-spinner"></div>
                    Analyzing...
                  </>
                ) : (
                  '🔍 Analyze Chat'
                )}
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
      )}

      {isAnalyzing && (
        <div className="analysis-loading">
          <LoadingSpinner message="Analyzing your conversation..." />
        </div>
      )}

      {error && (
        <ErrorMessage
          message="Analysis Failed"
          details={error}
          onClose={() => setError(null)}
        />
      )}

      {analysis && (
        <div className="chat-analysis-results">
          <div className="results-header">
            <h3>📊 Chat Analysis Results</h3>
            <button onClick={handleClear} className="new-analysis-btn">
              ➕ New Analysis
            </button>
          </div>

          {/* Format Detection */}
          <div className="info-badge">
            Detected Format: <strong>{analysis.format_detected}</strong> | 
            Messages Analyzed: <strong>{formatNumber(analysis.total_messages_analyzed)}</strong>
          </div>

          {/* Conversation Period */}
          {analysis.conversation_period && (
            <div className="result-card">
              <h4>📅 Conversation Period</h4>
              <div className="period-info">
                <div>
                  <strong>Duration:</strong> {analysis.conversation_period.duration_days} days
                </div>
                <div className="date-range">
                  {new Date(analysis.conversation_period.start).toLocaleDateString()} → 
                  {new Date(analysis.conversation_period.end).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          {/* Participants */}
          {analysis.participants && Object.keys(analysis.participants).length > 0 && (
            <div className="result-card">
              <h4>👥 Participants</h4>
              <div className="participants-list">
                {Object.values(analysis.participants).map((p, idx) => (
                  <div key={idx} className="participant-item">
                    <span className={`participant-badge ${p.role}`}>
                      {p.role === 'you' ? '👤 You' : '👤 Other'}
                    </span>
                    <strong>{p.name}</strong>
                    <span className="msg-count">{formatNumber(p.message_count)} messages</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Basic Stats */}
          {analysis.basic_stats && (
            <div className="result-card">
              <h4>📈 Basic Statistics</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{formatNumber(analysis.basic_stats.total_messages)}</div>
                  <div className="stat-label">Total Messages</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{analysis.basic_stats.average_message_length}</div>
                  <div className="stat-label">Avg Length (chars)</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{analysis.basic_stats.longest_message?.length || 0}</div>
                  <div className="stat-label">Longest Message</div>
                </div>
              </div>

              {analysis.basic_stats.messages_per_participant && (
                <div className="message-distribution">
                  <h5>Messages per Participant:</h5>
                  {Object.entries(analysis.basic_stats.messages_per_participant).map(([name, count]) => (
                    <div key={name} className="distribution-bar">
                      <span className="name">{name}</span>
                      <div className="bar-container">
                        <div 
                          className="bar-fill"
                          style={{ 
                            width: `${(count / analysis.basic_stats.total_messages) * 100}%`
                          }}
                        />
                      </div>
                      <span className="count">{formatNumber(count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messaging Patterns */}
          {analysis.messaging_patterns && (
            <div className="result-card">
              <h4>⏰ Messaging Patterns</h4>
              
              {analysis.messaging_patterns.most_active_hours && (
                <div className="pattern-section">
                  <h5>Most Active Hours:</h5>
                  <div className="hours-list">
                    {analysis.messaging_patterns.most_active_hours.slice(0, 5).map((h, idx) => (
                      <span key={idx} className="hour-badge">
                        🕐 {h.hour} ({h.count} msgs)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.messaging_patterns.day_of_week_distribution && (
                <div className="pattern-section">
                  <h5>Day of Week Activity:</h5>
                  <div className="day-bars">
                    {Object.entries(analysis.messaging_patterns.day_of_week_distribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([day, count]) => (
                        <div key={day} className="day-bar">
                          <span className="day-name">{day}</span>
                          <div className="bar-container">
                            <div 
                              className="bar-fill"
                              style={{ width: `${(count / analysis.basic_stats.total_messages) * 100}%` }}
                            />
                          </div>
                          <span className="count">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Engagement Metrics */}
          {analysis.engagement_metrics && (
            <div className="result-card">
              <h4>💬 Engagement Metrics</h4>
              
              {analysis.engagement_metrics.response_time_analysis && (
                <div className="engagement-section">
                  <h5>Response Times:</h5>
                  {Object.entries(analysis.engagement_metrics.response_time_analysis).map(([name, times]) => (
                    <div key={name} className="response-item">
                      <strong>{name}:</strong>
                      <span>Avg: {formatDuration(times.average_minutes)}</span>
                      <span>Fastest: {formatDuration(times.fastest_minutes)}</span>
                    </div>
                  ))}
                </div>
              )}

              {analysis.engagement_metrics.conversation_initiations && (
                <div className="engagement-section">
                  <h5>Conversation Initiations:</h5>
                  <div className="initiation-bars">
                    {Object.entries(analysis.engagement_metrics.conversation_initiations).map(([name, count]) => {
                      const total = Object.values(analysis.engagement_metrics.conversation_initiations).reduce((a, b) => a + b, 0);
                      return (
                        <div key={name} className="initiation-bar">
                          <span>{name}</span>
                          <div className="bar-container">
                            <div className="bar-fill" style={{ width: `${(count / total) * 100}%` }} />
                          </div>
                          <span>{count} times</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {analysis.engagement_metrics.back_and_forth_metrics && (
                <div className="engagement-section">
                  <h5>Back-and-Forth:</h5>
                  <div className="metric-row">
                    <span>Total Exchanges: {analysis.engagement_metrics.back_and_forth_metrics.total_exchanges}</span>
                    <span>Avg Length: {analysis.engagement_metrics.back_and_forth_metrics.average_exchange_length} messages</span>
                    <span>Longest: {analysis.engagement_metrics.back_and_forth_metrics.longest_exchange} messages</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sentiment Analysis */}
          {analysis.sentiment_analysis && (
            <div className="result-card">
              <h4>😊 Sentiment Analysis</h4>
              {Object.entries(analysis.sentiment_analysis).map(([name, sentiment]) => (
                <div key={name} className="sentiment-section">
                  <h5>{name}:</h5>
                  <div className="sentiment-bars">
                    <div className="sentiment-bar positive">
                      <span>Positive</span>
                      <div className="bar-container">
                        <div 
                          className="bar-fill positive"
                          style={{ width: `${sentiment.positive_ratio * 100}%` }}
                        />
                      </div>
                      <span>{(sentiment.positive_ratio * 100).toFixed(1)}%</span>
                    </div>
                    <div className="sentiment-bar neutral">
                      <span>Neutral</span>
                      <div className="bar-container">
                        <div 
                          className="bar-fill neutral"
                          style={{ width: `${sentiment.neutral_ratio * 100}%` }}
                        />
                      </div>
                      <span>{(sentiment.neutral_ratio * 100).toFixed(1)}%</span>
                    </div>
                    <div className="sentiment-bar negative">
                      <span>Negative</span>
                      <div className="bar-container">
                        <div 
                          className="bar-fill negative"
                          style={{ width: `${sentiment.negative_ratio * 100}%` }}
                        />
                      </div>
                      <span>{(sentiment.negative_ratio * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Emoji Stats */}
          {analysis.emoji_stats && Object.keys(analysis.emoji_stats).length > 0 && (
            <div className="result-card">
              <h4>😀 Emoji Usage</h4>
              {Object.entries(analysis.emoji_stats).map(([name, stats]) => (
                <div key={name} className="emoji-section">
                  <h5>{name}:</h5>
                  <div className="emoji-stats">
                    <span>{stats.total_emojis} total emojis</span>
                    <span>{stats.emojis_per_message} per message</span>
                  </div>
                  {stats.most_used_emojis && stats.most_used_emojis.length > 0 && (
                    <div className="emoji-list">
                      {stats.most_used_emojis.slice(0, 10).map((e, idx) => (
                        <span key={idx} className="emoji-item">
                          {e.emoji} <small>×{e.count}</small>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Red Flags */}
          {analysis.red_flags && (
            <div className={`result-card red-flags ${analysis.red_flags.overall_health}`}>
              <h4>🚩 Communication Health</h4>
              <div className={`health-badge ${analysis.red_flags.overall_health}`}>
                Overall: {analysis.red_flags.overall_health.toUpperCase()}
              </div>

              {analysis.red_flags.red_flags && analysis.red_flags.red_flags.length > 0 && (
                <div className="flags-section">
                  <h5>⚠️ Red Flags ({analysis.red_flags.total_red_flags}):</h5>
                  {analysis.red_flags.red_flags.map((flag, idx) => (
                    <div key={idx} className={`flag-item ${flag.severity}`}>
                      <div className="flag-header">
                        <span className="flag-type">{flag.type.replace(/_/g, ' ')}</span>
                        <span className={`severity-badge ${flag.severity}`}>{flag.severity}</span>
                      </div>
                      <p className="flag-description">{flag.description}</p>
                      <p className="flag-suggestion">💡 {flag.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}

              {analysis.red_flags.warnings && analysis.red_flags.warnings.length > 0 && (
                <div className="flags-section">
                  <h5>⚡ Warnings ({analysis.red_flags.total_warnings}):</h5>
                  {analysis.red_flags.warnings.map((warning, idx) => (
                    <div key={idx} className={`flag-item ${warning.severity}`}>
                      <div className="flag-header">
                        <span className="flag-type">{warning.type.replace(/_/g, ' ')}</span>
                        <span className={`severity-badge ${warning.severity}`}>{warning.severity}</span>
                      </div>
                      <p className="flag-description">{warning.description}</p>
                      <p className="flag-suggestion">💡 {warning.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}

              {analysis.red_flags.total_red_flags === 0 && analysis.red_flags.total_warnings === 0 && (
                <div className="no-flags">
                  <p>✅ No significant issues detected in your conversation patterns!</p>
                  <p>Your communication appears healthy and balanced.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatImport;
