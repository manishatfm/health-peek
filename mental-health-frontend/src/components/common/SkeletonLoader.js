import React from 'react';
import './SkeletonLoader.css';

export const DashboardSkeleton = () => (
  <div className="dashboard-cards">
    {[1, 2, 3].map((i) => (
      <div key={i} className="card skeleton-card">
        <div className="skeleton skeleton-text short"></div>
        <div className="skeleton skeleton-circle"></div>
        <div className="skeleton skeleton-text"></div>
      </div>
    ))}
  </div>
);

export const MoodTrendsSkeleton = () => (
  <div>
    <div className="skeleton-chart">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="skeleton skeleton-chart-bar"
          style={{ height: `${Math.random() * 150 + 50}px` }}
        ></div>
      ))}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton skeleton-card" style={{ height: '100px' }}></div>
      ))}
    </div>
  </div>
);

export const SuggestionsSkeleton = () => (
  <div className="suggestions-grid">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="skeleton-card">
        <div className="skeleton skeleton-text short"></div>
        <div className="skeleton skeleton-text medium"></div>
        <div className="skeleton skeleton-text"></div>
      </div>
    ))}
  </div>
);

export const ExportSkeleton = () => (
  <div className="export-options">
    {[1, 2, 3].map((i) => (
      <div key={i} className="skeleton-card">
        <div className="skeleton skeleton-text short"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-bar"></div>
      </div>
    ))}
  </div>
);