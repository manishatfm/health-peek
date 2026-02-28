import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services';
import { LoadingSpinner, ErrorMessage } from '../common';
import './DashboardStats.css';

const DashboardStats = ({ timeRange = '30d' }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await dashboardService.getDashboardStats(timeRange);
      setStats(data);
    } catch (err) {
      setError(err.message);
      // Show empty state for errors
      setStats({
        wellbeingScore: 0,
        riskLevel: 'Unknown',
        communicationFrequency: 0,
        description: 'Start analyzing messages to see your insights',
        isEmpty: true
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return '#22c55e';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getWellbeingColor = (score) => {
    if (score >= 7) return '#22c55e';
    if (score >= 4) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard statistics..." />;
  }

  return (
    <div className="dashboard-stats">
      {error && (
        <ErrorMessage 
          message="Failed to load dashboard data" 
          details={error}
          onClose={() => setError(null)} 
        />
      )}
      
      <div className="stats-grid">
        <div className="stat-card wellbeing">
          <div className="stat-header">
            <h3>Wellbeing Score</h3>
            <div 
              className="score-circle"
              style={{ borderColor: getWellbeingColor(stats?.wellbeingScore || 0) }}
            >
              <span className="score-value">
                {stats?.wellbeingScore?.toFixed(1) || '0.0'}
              </span>
              <span className="score-max">/10</span>
            </div>
          </div>
          <p className="stat-description">
            {stats?.description || 'No data available'}
          </p>
        </div>

        <div className="stat-card risk-level">
          <div className="stat-header">
            <h3>Risk Level</h3>
            <span 
              className="risk-badge"
              style={{ backgroundColor: getRiskLevelColor(stats?.riskLevel) }}
            >
              {stats?.riskLevel || 'Unknown'}
            </span>
          </div>
          <p className="stat-description">
            Based on recent communication patterns
          </p>
        </div>

        <div className="stat-card frequency">
          <div className="stat-header">
            <h3>Communication Frequency</h3>
            <span className="frequency-number">
              {stats?.communicationFrequency || 0}
            </span>
          </div>
          <p className="stat-description">
            Messages analyzed in the last {timeRange.replace('d', ' days')}
          </p>
        </div>

        <div className="stat-card confidence">
          <div className="stat-header">
            <h3>Average Confidence</h3>
            <span className="confidence-percentage">
              {stats?.averageConfidence ? `${(stats.averageConfidence * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
          <p className="stat-description">
            Average confidence in analysis results
          </p>
        </div>
      </div>

      {stats?.sentimentDistribution && (
        <div className="sentiment-distribution">
          <h3>Sentiment Distribution</h3>
          <div className="sentiment-chart">
            {Object.entries(stats.sentimentDistribution).map(([sentiment, count]) => {
              const total = Object.values(stats.sentimentDistribution).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              return (
                <div key={sentiment} className="sentiment-bar">
                  <div className="sentiment-label">
                    <span className="sentiment-name">
                      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                    </span>
                    <span className="sentiment-count">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="bar-container">
                    <div 
                      className={`bar-fill ${sentiment}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats?.isEmpty && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Data Yet</h3>
          <p>Start analyzing some messages to see your mental health insights here.</p>
        </div>
      )}
    </div>
  );
};

export default DashboardStats;