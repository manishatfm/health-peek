import React, { useEffect, useState } from 'react';
import { analysisService } from '../../services';
import { ErrorMessage, LoadingSpinner } from '../common';
import './ChatHistory.css';

const ChatHistory = ({ maxItems = 3, refreshTrigger = 0 }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [allHistory, setAllHistory] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState(null);

  useEffect(() => {
    loadChatHistory();
  }, [refreshTrigger]); // Reload when refreshTrigger changes

  const loadChatHistory = async (loadAll = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const limit = loadAll ? 100 : maxItems; // Load more items when showing all
      const response = await analysisService.getChatAnalysisHistory(limit);
      const analyses = response.analyses || [];
      
      if (loadAll) {
        setAllHistory(analyses);
        setChatHistory(analyses);
      } else {
        setChatHistory(analyses);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setError(err.message || 'Failed to load chat history');
      setChatHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAll = async () => {
    if (!showAll) {
      // Load all analyses
      await loadChatHistory(true);
      setShowAll(true);
    } else {
      // Go back to showing limited items
      setShowAll(false);
      await loadChatHistory(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatNumber = (num) => {
    return num?.toLocaleString() || 0;
  };

  const getHealthColor = (health) => {
    switch (health?.toLowerCase()) {
      case 'healthy':
        return '#22c55e';
      case 'moderate':
        return '#f59e0b';
      case 'concerning':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const handleChatClick = (chat) => {
    setSelectedChat(chat);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedChat(null);
  };

  const handleDeleteBulkImport = async (chatId, e) => {
    e.stopPropagation(); // Prevent opening the modal
    
    if (!window.confirm('⚠️ Are you sure you want to delete this bulk import? This will remove all messages from this import.')) {
      return;
    }

    setDeletingChatId(chatId);
    
    try {
      const result = await analysisService.deleteChatImport(chatId);
      console.log(`✅ Deleted chat import: ${result.deleted_messages} messages`);
      
      // Reload the chat history
      await loadChatHistory(showAll);
    } catch (err) {
      console.error('Failed to delete bulk import:', err);
      setError(err.message || 'Failed to delete bulk import');
    } finally {
      setDeletingChatId(null);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(1)} hrs`;
    return `${(minutes / 1440).toFixed(1)} days`;
  };

  if (isLoading) {
    return (
      <div className="chat-history">
        <h3> Recent Chat Analyses</h3>
        <LoadingSpinner message="Loading chat history..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-history">
        <h3> Recent Chat Analyses</h3>
        <ErrorMessage 
          message="Failed to load chat history" 
          details={error}
          onClose={() => setError(null)} 
        />
      </div>
    );
  }

  if (!chatHistory || chatHistory.length === 0) {
    return (
      <div className="chat-history">
        <h3> Recent Chat Analyses</h3>
        <div className="empty-chat-history">
          <p>No chat imports yet. Import a conversation to see analysis here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-history">
      <h3>📱 Recent Chat Analyses</h3>
      <div className="chat-history-list">
        {chatHistory.map((chat, index) => (
          <div 
            key={chat.id || index} 
            className="chat-history-item"
          >
            <div
              onClick={() => handleChatClick(chat)}
              style={{ flex: 1, cursor: 'pointer' }}
              title="Click to view full analysis"
            >
              <div className="chat-history-header">
                <span className="chat-format-badge">
                  {chat.format_detected || 'Unknown'}
                </span>
                <span className="chat-messages-count">
                  {formatNumber(chat.total_messages)} messages
                </span>
                {chat.analysis?.red_flags?.overall_health && (
                  <span 
                    className="chat-health-badge"
                    style={{ backgroundColor: getHealthColor(chat.analysis.red_flags.overall_health) }}
                  >
                    {chat.analysis.red_flags.overall_health}
                  </span>
                )}
              </div>
              
              <div className="chat-history-meta">
                <span className="chat-timestamp">
                  {formatDate(chat.created_at)}
                </span>
                {chat.analysis?.conversation_period && (
                  <span className="chat-duration">
                    {chat.analysis.conversation_period.duration_days} days
                  </span>
                )}
              </div>

              {chat.analysis?.participants && (
                <div className="chat-participants">
                  {Object.values(chat.analysis.participants).map((p, idx) => (
                    <span key={idx} className="participant-tag">
                      {p.name} ({p.message_count})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Delete Button */}
            <button
              onClick={(e) => handleDeleteBulkImport(chat.id, e)}
              disabled={deletingChatId === chat.id}
              className="delete-chat-button"
              title="Delete this bulk import"
            >
              {deletingChatId === chat.id ? '⏳' : '🗑️'}
            </button>
          </div>
        ))}
      </div>
      
      {chatHistory.length >= maxItems && (
        <div className="chat-history-footer">
          <button 
            className="view-all-chats-button"
            onClick={handleViewAll}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : (showAll ? 'Show Less' : 'View All Chat Analyses')}
          </button>
          {showAll && (
            <small>Showing all {chatHistory.length} chat analyses</small>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedChat && (
        <div className="chat-detail-modal-overlay" onClick={handleCloseModal}>
          <div className="chat-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Chat Analysis Details</h2>
              <button className="modal-close-btn" onClick={handleCloseModal}>✕</button>
            </div>

            <div className="modal-content">
              {/* Format & Basic Info */}
              <div className="info-badge">
                Detected Format: <strong>{selectedChat.format_detected}</strong> | 
                Messages: <strong>{formatNumber(selectedChat.total_messages)}</strong>
              </div>

              {/* Conversation Period */}
              {selectedChat.analysis?.conversation_period && (
                <div className="result-card">
                  <h4>📅 Conversation Period</h4>
                  <div className="period-info">
                    <div>
                      <strong>Duration:</strong> {selectedChat.analysis.conversation_period.duration_days} days
                    </div>
                    <div className="date-range">
                      {new Date(selectedChat.analysis.conversation_period.start).toLocaleDateString()} → 
                      {new Date(selectedChat.analysis.conversation_period.end).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Participants */}
              {selectedChat.analysis?.participants && Object.keys(selectedChat.analysis.participants).length > 0 && (
                <div className="result-card">
                  <h4>👥 Participants</h4>
                  <div className="participants-list">
                    {Object.values(selectedChat.analysis.participants).map((p, idx) => (
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
              {selectedChat.analysis?.basic_stats && (
                <div className="result-card">
                  <h4>📈 Basic Statistics</h4>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <div className="stat-value">{formatNumber(selectedChat.analysis.basic_stats.total_messages)}</div>
                      <div className="stat-label">Total Messages</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">{selectedChat.analysis.basic_stats.average_message_length}</div>
                      <div className="stat-label">Avg Length</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">{selectedChat.analysis.basic_stats.longest_message?.length || 0}</div>
                      <div className="stat-label">Longest Message</div>
                    </div>
                  </div>

                  {selectedChat.analysis.basic_stats.messages_per_participant && (
                    <div className="message-distribution">
                      <h5>Messages per Participant:</h5>
                      {Object.entries(selectedChat.analysis.basic_stats.messages_per_participant).map(([name, count]) => (
                        <div key={name} className="distribution-bar">
                          <span className="name">{name}</span>
                          <div className="bar-container">
                            <div 
                              className="bar-fill"
                              style={{ 
                                width: `${(count / selectedChat.analysis.basic_stats.total_messages) * 100}%`
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
              {selectedChat.analysis?.messaging_patterns && (
                <div className="result-card">
                  <h4>⏰ Messaging Patterns</h4>
                  
                  {selectedChat.analysis.messaging_patterns.most_active_hours && (
                    <div className="pattern-section">
                      <h5>Most Active Hours:</h5>
                      <div className="hours-list">
                        {selectedChat.analysis.messaging_patterns.most_active_hours.slice(0, 5).map((h, idx) => (
                          <span key={idx} className="hour-badge">
                            🕐 {h.hour}:00 ({h.count} msgs)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedChat.analysis.messaging_patterns.day_of_week_distribution && (
                    <div className="pattern-section">
                      <h5>Day of Week Activity:</h5>
                      <div className="day-bars">
                        {Object.entries(selectedChat.analysis.messaging_patterns.day_of_week_distribution)
                          .sort((a, b) => b[1] - a[1])
                          .map(([day, count]) => (
                            <div key={day} className="day-bar">
                              <span className="day-name">{day}</span>
                              <div className="bar-container">
                                <div 
                                  className="bar-fill"
                                  style={{ width: `${(count / selectedChat.analysis.basic_stats.total_messages) * 100}%` }}
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
              {selectedChat.analysis?.engagement_metrics && (
                <div className="result-card">
                  <h4>💬 Engagement Metrics</h4>
                  
                  {selectedChat.analysis.engagement_metrics.response_time_analysis && (
                    <div className="engagement-section">
                      <h5>Response Times:</h5>
                      {Object.entries(selectedChat.analysis.engagement_metrics.response_time_analysis).map(([name, times]) => (
                        <div key={name} className="response-item">
                          <strong>{name}:</strong>
                          <span>Avg: {formatDuration(times.average_minutes)}</span>
                          <span>Fastest: {formatDuration(times.fastest_minutes)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedChat.analysis.engagement_metrics.conversation_initiations && (
                    <div className="engagement-section">
                      <h5>Conversation Initiations:</h5>
                      <div className="initiation-bars">
                        {Object.entries(selectedChat.analysis.engagement_metrics.conversation_initiations).map(([name, count]) => {
                          const total = Object.values(selectedChat.analysis.engagement_metrics.conversation_initiations).reduce((a, b) => a + b, 0);
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
                </div>
              )}

              {/* Sentiment Analysis */}
              {selectedChat.analysis?.sentiment_analysis && (
                <div className="result-card">
                  <h4>😊 Sentiment Analysis</h4>
                  {Object.entries(selectedChat.analysis.sentiment_analysis).map(([name, sentiment]) => (
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
              {selectedChat.analysis?.emoji_stats && Object.keys(selectedChat.analysis.emoji_stats).length > 0 && (
                <div className="result-card">
                  <h4>😀 Emoji Usage</h4>
                  {Object.entries(selectedChat.analysis.emoji_stats).map(([name, stats]) => (
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
              {selectedChat.analysis?.red_flags && (
                <div className={`result-card red-flags ${selectedChat.analysis.red_flags.overall_health}`}>
                  <h4>🚩 Communication Health</h4>
                  <div className={`health-badge ${selectedChat.analysis.red_flags.overall_health}`}>
                    Overall: {selectedChat.analysis.red_flags.overall_health?.toUpperCase()}
                  </div>

                  {selectedChat.analysis.red_flags.red_flags && selectedChat.analysis.red_flags.red_flags.length > 0 && (
                    <div className="flags-section">
                      <h5>⚠️ Red Flags ({selectedChat.analysis.red_flags.total_red_flags}):</h5>
                      {selectedChat.analysis.red_flags.red_flags.map((flag, idx) => (
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

                  {selectedChat.analysis.red_flags.warnings && selectedChat.analysis.red_flags.warnings.length > 0 && (
                    <div className="flags-section">
                      <h5>⚡ Warnings ({selectedChat.analysis.red_flags.total_warnings}):</h5>
                      {selectedChat.analysis.red_flags.warnings.map((warning, idx) => (
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

                  {selectedChat.analysis.red_flags.total_red_flags === 0 && selectedChat.analysis.red_flags.total_warnings === 0 && (
                    <div className="no-flags">
                      <p>✅ No significant issues detected in your conversation patterns!</p>
                      <p>Your communication appears healthy and balanced.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-footer">
                <button className="close-modal-btn" onClick={handleCloseModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
