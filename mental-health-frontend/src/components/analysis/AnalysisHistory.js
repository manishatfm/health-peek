import React, { useEffect, useState, useRef } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import { ErrorMessage } from '../common';
import '../common/SkeletonLoader.css';
import './AnalysisHistory.css';

const AnalysisHistory = ({ maxItems = 4, showTitle = true }) => {
  const { analysisHistory, isLoading, error, refreshHistory } = useAnalysis();
  const [localError, setLocalError] = useState(null);
  const [showAllItems, setShowAllItems] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeletingByDate, setIsDeletingByDate] = useState(false);

  const handleDelete = async (analysisId) => {
    if (!window.confirm('⚠️ Delete this analysis? This action cannot be undone.')) {
      return;
    }

    setDeletingId(analysisId);
    
    try {
      const { analysisService } = await import('../../services');
      await analysisService.deleteAnalysis(analysisId);
      
      // Refresh the history after deletion
      await refreshHistory();
    } catch (err) {
      setLocalError(err.message || 'Failed to delete analysis');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteByDate = async (date) => {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const confirmMsg = `⚠️ Delete ALL single message analyses for ${dateStr}?\n\nThis will delete all individual message analyses from this date (excluding bulk imports).\n\nThis action cannot be undone!`;
    
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsDeletingByDate(true);
    setLocalError(null);
    
    try {
      const { analysisService } = await import('../../services');
      const result = await analysisService.deleteAnalysesByDate(dateStr);
      
      // Show success message
      setMigrationMessage(`✅ Deleted ${result.deleted_count} analyses from ${dateStr}`);
      setTimeout(() => setMigrationMessage(null), 5000);
      
      // Refresh the history after deletion
      await refreshHistory();
    } catch (err) {
      setLocalError(err.message || 'Failed to delete analyses by date');
    } finally {
      setIsDeletingByDate(false);
    }
  };

  // Only attempt an automatic refresh once per mount when history is empty.
  // Avoid re-triggering refresh when `isLoading` flips (prevents an infinite loop
  // when the backend returns an empty array and `analysisHistory.length` stays 0).
  const attemptedRefreshRef = useRef(false);
  useEffect(() => {
    if (!attemptedRefreshRef.current && Array.isArray(analysisHistory) && analysisHistory.length === 0) {
      attemptedRefreshRef.current = true;
      // don't block render; handle errors locally
      refreshHistory().catch(err => {
        setLocalError(err.message || String(err));
      });
    }
    // Intentionally run only on mount or when analysisHistory reference changes.
    // We don't include `isLoading` here to avoid refresh loops.
  }, [analysisHistory, refreshHistory]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const truncateMessage = (message) => {
    if (!message) return 'No message';
    return message;
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😞';
      case 'neutral':
        return '😐';
      default:
        return '❓';
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return '#22c55e';
      case 'negative':
        return '#ef4444';
      case 'neutral':
        return '#6b7280';
      default:
        return '#9ca3af';
    }
  };

  // Render a stable container to avoid layout shifts when switching tabs.
  // Show a skeleton while loading, an empty state when there's no history,
  // or the real list when data is available. Errors are shown inline.

  const renderSkeleton = () => (
    <div className="history-list">
      {[1, 2, 3].map((i) => (
        <div key={i} className="history-item skeleton-card" style={{minHeight: '88px'}}>
          <div className="skeleton skeleton-text short" style={{height: '14px'}}></div>
          <div className="skeleton skeleton-text" style={{height: '12px', marginTop: '10px'}}></div>
        </div>
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div className="empty-history">
      <p>No analysis history yet. Start analyzing messages to see your insights!</p>
      
      {/* Migration button for fixing old bulk imports */}
      <button
        onClick={handleMigrateBulkImports}
        disabled={isMigrating}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isMigrating ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          opacity: isMigrating ? 0.6 : 1
        }}
      >
        {isMigrating ? '🔄 Migrating...' : '🔧 Fix Bulk Import Display'}
      </button>
      
      {migrationMessage && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          borderRadius: '4px',
          backgroundColor: migrationMessage.type === 'success' ? '#d4edda' : '#f8d7da',
          color: migrationMessage.type === 'success' ? '#155724' : '#721c24',
          fontSize: '0.875rem'
        }}>
          {migrationMessage.text}
        </div>
      )}
    </div>
  );

  const handleMigrateBulkImports = async () => {
    setIsMigrating(true);
    setMigrationMessage(null);
    
    try {
      const { analysisService } = await import('../../services');
      const result = await analysisService.migrateBulkImports();
      setMigrationMessage({
        type: 'success',
        text: `✅ Fixed ${result.updated_count} bulk import messages. Refresh to see clean history!`
      });
      
      // Refresh history after migration
      setTimeout(() => {
        refreshHistory();
      }, 1000);
    } catch (err) {
      setMigrationMessage({
        type: 'error',
        text: err.message || 'Failed to migrate bulk imports'
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const hasHistory = Array.isArray(analysisHistory) && analysisHistory.length > 0;

  const displayHistory = showAllItems ? analysisHistory : (analysisHistory || []).slice(0, maxItems);

  return (
    <div className="analysis-history">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {showTitle && <h3>Recent Analysis</h3>}
        
        {/* Migration button (always visible if bulk imports might exist) */}
        {hasHistory && (
          <button
            onClick={handleMigrateBulkImports}
            disabled={isMigrating}
            style={{
              padding: '0.4rem 0.8rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isMigrating ? 'not-allowed' : 'pointer',
              fontSize: '0.75rem',
              opacity: isMigrating ? 0.6 : 1
            }}
            title="Fix bulk imports showing in single message history"
          >
            {isMigrating ? '🔄' : '🔧 Fix Display'}
          </button>
        )}
      </div>
      
      {migrationMessage && (
        <div style={{
          marginTop: '0.5rem',
          marginBottom: '0.5rem',
          padding: '0.5rem',
          borderRadius: '4px',
          backgroundColor: '#d4edda',
          color: '#155724',
          fontSize: '0.875rem'
        }}>
          {migrationMessage}
        </div>
      )}

      {/* Error state */}
      {(error || localError) && (
        <ErrorMessage
          message="Failed to load analysis history"
          details={error || localError}
          onClose={() => setLocalError(null)}
        />
      )}

      {/* Loading skeleton */}
      {isLoading && renderSkeleton()}

      {/* Empty state when not loading and no history */}
      {!isLoading && !hasHistory && renderEmpty()}

      {/* Actual history list */}
      {!isLoading && hasHistory && (
        <div className="history-list">
          {displayHistory.map((entry, index) => (
            <div key={entry.analysis_id || entry.id || index} className="history-item">
              <div className="history-header">
                <span className="sentiment-icon">
                  {getSentimentIcon(entry.sentiment)}
                </span>
                <span 
                  className="sentiment-badge"
                  style={{ backgroundColor: getSentimentColor(entry.sentiment) }}
                >
                  {entry.sentiment ? 
                    entry.sentiment.charAt(0).toUpperCase() + entry.sentiment.slice(1) : 
                    'Unknown'
                  }
                </span>
                {entry.confidence && (
                  <span className="confidence-score">
                    {(entry.confidence * 100).toFixed(1)}%
                  </span>
                )}
                <button
                  className="history-delete-btn"
                  title="Delete this analysis"
                  onClick={() => handleDelete(entry.analysis_id)}
                  disabled={deletingId === entry.analysis_id}
                >
                  {deletingId === entry.analysis_id ? '⌛' : '🗑️'}
                </button>
              </div>
              
              <div className="history-message">
                {truncateMessage(entry.message)}
              </div>
              
              <div className="history-meta">
                <span className="timestamp">
                  {formatTimestamp(entry.created_at || entry.timestamp)}
                </span>
                {entry.emotions && Object.keys(entry.emotions).length > 0 && (
                  <span className="emotions-count">
                    {Object.keys(entry.emotions).length} emotions detected
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer only when we have history */}
      {!isLoading && hasHistory && analysisHistory.length > maxItems && (
        <div className="history-footer">
          <button 
            className="show-more-button"
            onClick={() => setShowAllItems(!showAllItems)}
          >
            {showAllItems ? 'Show Less' : 'Show More'}
          </button>
          <small>Showing {displayHistory.length} of {analysisHistory.length} analyses</small>
        </div>
      )}
    </div>
  );
};

export default AnalysisHistory;