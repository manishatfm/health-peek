import React, { useState, useEffect } from 'react';
import ChatForm from './ChatForm';
import apiService from './services/api';
import { dashboardService } from './services';
import AuthForm from './components/GoogleAuthButton';
import { useAuth } from './context/AuthContext';
import { AnalysisProvider, useAnalysis } from './context/AnalysisContext';
import { ErrorAlert } from './components/common';
import { DashboardSkeleton, MoodTrendsSkeleton, SuggestionsSkeleton, ExportSkeleton } from './components/common/SkeletonLoader';
import BlogView from './components/analysis/BlogView';
import BlogPage from './components/analysis/BlogPage';
import SuggestionCard from './components/dashboard/SuggestionCard';
import './App.css';

function AppContent() {
  const { logout, user } = useAuth();
  const { clearHistory, loadAnalysisHistory } = useAnalysis();
  const [activeSection, setActiveSection] = useState('analyze');
  const [dashboardData, setDashboardData] = useState(null);
  const [moodData, setMoodData] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [viewingBlog, setViewingBlog] = useState(null);

  // Load analysis history when user changes (login/logout)
  useEffect(() => {
    if (user) {
      loadAnalysisHistory();
    } else {
      clearHistory();
    }
  }, [user, loadAnalysisHistory, clearHistory]);

  const handleProfileImageChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target.result;
        setProfileImage(imageData);
        
        try {
          // Save to database instead of localStorage
          await apiService.request('/auth/profile-image', {
            method: 'POST',
            body: JSON.stringify({ profile_image: imageData }),
          });
          
          // Update user context
          const updatedUser = { ...user, profile_image: imageData };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (error) {
          console.error('Failed to update profile image:', error);
          setError(error.message || 'Failed to update profile image');
          // Revert on error
          setProfileImage(user?.profile_image || null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Load profile image from user data (which comes from database)
    if (user?.profile_image) {
      setProfileImage(user.profile_image);
    }
  }, [user]);

  useEffect(() => {
    switch(activeSection) {
      case 'dashboard':
        loadDashboardData();
        break;
      case 'trends':
        loadMoodTrends();
        break;
      case 'suggestions':
        loadSuggestions();
        break;
      case 'analyze':
        // Refresh analysis history when navigating back to analyze
        if (user) {
          loadAnalysisHistory();
        }
        break;
      default:
        break;
    }
  }, [activeSection, timeRange]);

  // Helper function to convert sentiment string to numeric score for visualization
  const getSentimentScore = (sentiment, confidence) => {
    if (!sentiment || !confidence) return 0;
    
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return confidence; // Positive score (0 to 1)
      case 'negative':
        return -confidence; // Negative score (-1 to 0)
      case 'neutral':
      default:
        return 0; // Neutral
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getDashboardData(timeRange);
      setDashboardData(data);
    } catch (error) {
      setError(error.message || 'Failed to load dashboard data');
      console.error('Dashboard data error:', error);
      // Show empty state
      setDashboardData({
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

  const loadMoodTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      const trends = await apiService.getMoodTrends(timeRange);
      console.log('Mood trends response:', trends); // Debug logging
      setMoodData(trends.trends || []);
    } catch (error) {
      console.error('Mood trends error:', error);
      setError(error.message || 'Failed to load mood trends');
      setMoodData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getSuggestions();
      console.log('✅ Suggestions loaded:', data.suggestions);
      console.log('📊 Suggestions with links:', data.suggestions?.filter(s => s.blog_id || s.external_url).length, 'out of', data.suggestions?.length);
      data.suggestions?.forEach((s, i) => {
        const link = s.blog_id ? `blog_id: ${s.blog_id}` : s.external_url ? `external_url: ${s.external_url}` : '❌ NO LINK';
        console.log(`  ${i+1}. "${s.title}" - ${link}`);
      });
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Suggestions error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLearnMore = (blogId) => {
    setViewingBlog(blogId);
  };

  const handleCloseBlog = () => {
    setViewingBlog(null);
  };

  const handleExport = async (format, type) => {
    setLoading(true);
    setError(null);
    try {
      let result;
      
      if (type === 'personal') {
        // Personal Mental Health Report (PDF)
        result = await dashboardService.downloadPersonalReport(timeRange);
      } else if (type === 'clinical') {
        // Clinical Summary Report (PDF)
        result = await dashboardService.downloadClinicalSummary(timeRange);
      } else if (type === 'data' && format === 'pdf') {
        // Data Charts PDF
        result = await dashboardService.downloadDataCharts(timeRange);
      } else {
        // Regular data export (JSON/CSV)
        result = await dashboardService.downloadExport(timeRange, format);
      }
      
      if (result.success) {
        alert(`✓ ${result.filename} downloaded successfully!`);
      }
    } catch (error) {
      console.error('Export error:', error);
      const errorMsg = error.message || 'Export failed. Please try again.';
      setError(errorMsg);
      alert(`Export failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutClick = () => {
    setShowSignOutConfirm(true);
  };

  const confirmSignOut = () => {
    setShowSignOutConfirm(false);
    logout();
  };

  const cancelSignOut = () => {
    setShowSignOutConfirm(false);
  };

  const renderHeader = () => (
    <header className="app-header">
      <div className="header-left">
        <img src="/assets/navbar-logo-final.png" alt="Health Peek" className="navbar-logo-final" />
      </div>
      <div className="header-right">
        <div className="user-profile" onClick={() => setShowProfileMenu(!showProfileMenu)}>
          <div className="profile-image-container">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="profile-image" />
            ) : (
              <img src="/assets/userprofile.png" alt="Profile" className="profile-image" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleProfileImageChange}
              className="profile-image-input"
              id="profile-image-input"
            />
          </div>
          <span className="user-name">{user?.name || user?.email}</span>
        </div>
        <button 
          className="sign-out-btn"
          onClick={handleSignOutClick}
          title="Sign Out"
        >
          <img src="/assets/signout.png" alt="Sign Out" className="sign-out-icon" />
        </button>
      </div>
    </header>
  );

  const renderNavigation = () => (
    <nav className="sidebar">
      <div className="nav-menu">
        <button 
          className={activeSection === 'analyze' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('analyze')}
        >
          <img src="/assets/analyze.png" alt="Analyze" className="nav-icon" />
          Analyze Chat
        </button>
        <button 
          className={activeSection === 'dashboard' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('dashboard')}
        >
          <img src="/assets/dashboard.png" alt="Dashboard" className="nav-icon" />
          Dashboard
        </button>
        <button 
          className={activeSection === 'trends' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('trends')}
        >
          <img src="/assets/moodtrend.png" alt="Mood Trends" className="nav-icon" />
          Mood Trends & Patterns
        </button>
        <button 
          className={activeSection === 'suggestions' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('suggestions')}
        >
          <img src="/assets/recommendation.png" alt="Recommendations" className="nav-icon" />
          Personalized Recommendations
        </button>
        <button 
          className={activeSection === 'blogs' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('blogs')}
        >
          <span className="nav-icon nav-icon-emoji">📰</span>
          Wellbeing Articles
        </button>
        <button 
          className={activeSection === 'export' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('export')}
        >
          <img src="/assets/exportreport.png" alt="Export" className="nav-icon" />
          Export & Reports
        </button>
      </div>
      <div className="sidebar-footer">
        <div className="app-description">
          <p>🌸 Supporting your journey with care and understanding</p>
        </div>
      </div>
    </nav>
  );

  const renderDashboard = () => (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Mental Health Dashboard</h2>
        <div className="time-range-selector">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
            {/* <option value="1y">Last year</option> */}
          </select>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      {loading ? <DashboardSkeleton /> : dashboardData && (
        <div className="dashboard-cards">
          {dashboardData.isEmpty ? (
            <div className="empty-state">
              <h3>No Data Available</h3>
              <p>Start by analyzing some messages to see your insights here.</p>
              <button 
                className="start-analysis-btn"
                onClick={() => setActiveSection('analyze')}
              >
                Start Analysis
              </button>
            </div>
          ) : (
            <>
              <div className="card">
                <h3>Overall Wellbeing</h3>
                <div className="score-circle positive">{dashboardData.wellbeingScore}/10</div>
                <p>{dashboardData.description}</p>
              </div>
              <div className="card">
                <h3>Risk Level</h3>
                <div className={`risk-indicator ${dashboardData.riskLevel.toLowerCase()}`}>
                  {dashboardData.riskLevel}
                </div>
                <p>Based on recent communication patterns</p>
              </div>
              <div className="card">
                <h3>Communication Frequency</h3>
                <div className="frequency-bar">
                  <div className="frequency-fill" style={{width: `${dashboardData.communicationFrequency}%`}}></div>
                </div>
                <p>{dashboardData.communicationFrequency}% above average this period</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderMoodTrends = () => (
    <div className="mood-trends">
      <div className="trends-header">
        <h2>Mood Trends Analysis</h2>
        <div className="time-range-selector">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
          </select>
        </div>
      </div>
      {error && <div className="error-message">Error: {error}</div>}
      {loading ? <MoodTrendsSkeleton /> : moodData.length > 0 ? (
        <>
          <div className="chart-container">
            <div className="chart">
              {moodData.map((item, index) => {
                // Convert confidence to a score for visualization
                const score = getSentimentScore(item.sentiment, item.confidence);
                return (
                  <div key={index} className="chart-bar">
                    <div 
                      className={`bar ${item.sentiment?.toLowerCase() || 'neutral'}`}
                      style={{height: `${Math.abs(score) * 100 + 20}px`}}
                      title={`${item.date}: ${item.sentiment} (${item.confidence?.toFixed(2) || 0})`}
                    ></div>
                    <span className="chart-date">{new Date(item.date).getDate()}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="trend-summary">
            <div className="trend-card">
              <h4>Positive Days</h4>
              <span className="trend-number">
                {Math.round((moodData.filter(d => d.sentiment === 'positive').length / moodData.length) * 100)}%
              </span>
            </div>
            <div className="trend-card">
              <h4>Neutral Days</h4>
              <span className="trend-number">
                {Math.round((moodData.filter(d => d.sentiment === 'neutral').length / moodData.length) * 100)}%
              </span>
            </div>
            <div className="trend-card">
              <h4>Negative Days</h4>
              <span className="trend-number">
                {Math.round((moodData.filter(d => d.sentiment === 'negative').length / moodData.length) * 100)}%
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h3>No Mood Data Available</h3>
          <p>Analyze some messages to start tracking your mood trends.</p>
        </div>
      )}
    </div>
  );

  const renderSuggestions = () => {
    if (viewingBlog) {
      return <BlogView blogId={viewingBlog} onClose={handleCloseBlog} />;
    }

    return (
      <div className="suggestions">
        <h2>Personalized Recommendations</h2>
        {loading ? (
          <SuggestionsSkeleton />
        ) : suggestions.length === 0 ? (
          <div className="empty-state">
            <h3>No Recommendations Right Now</h3>
            <p>We don't have enough analysis data yet to generate personalized suggestions. Analyze some messages to get tailored recommendations.</p>
          </div>
        ) : (
          <div className="suggestions-grid">
            {suggestions.map((suggestion, index) => (
              <SuggestionCard 
                key={suggestion.id || index} 
                suggestion={suggestion}
                onLearnMore={handleLearnMore}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderExport = () => (
    <div className="export-section">
      <h2>Export & Reports</h2>
      <div className="time-range-selector" style={{marginBottom: '20px'}}>
        <label style={{marginRight: '10px', fontWeight: 'bold'}}>Time Period:</label>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 3 months</option>
          <option value="all">All time</option>
        </select>
      </div>
      
      <div className="export-options">
        <div className="export-card">
          <div className="export-icon">📄</div>
          <h4>Personal Report</h4>
          <p>Comprehensive mental health report with mood trends, emotional patterns, and personalized recommendations for self-reflection.</p>
          <button 
            className="export-btn personal"
            onClick={() => handleExport('pdf', 'personal')}
            disabled={loading}
          >
            {loading ? '⏳ Generating...' : '📥 Download PDF Report'}
          </button>
        </div>
        
        <div className="export-card">
          <div className="export-icon">🏥</div>
          <h4>Clinical Summary</h4>
          <p>Professional clinical summary with statistical analysis, risk assessment, and treatment recommendations for healthcare providers.</p>
          <button 
            className="export-btn clinical"
            onClick={() => handleExport('pdf', 'clinical')}
            disabled={loading}
          >
            {loading ? '⏳ Generating...' : '📥 Download Clinical Summary'}
          </button>
        </div>
        
        <div className="export-card">
          <div className="export-icon">📊</div>
          <h4>Data Charts</h4>
          <p>Visual data analysis with comprehensive charts, graphs, and statistical summaries in professional PDF format.</p>
          <button 
            className="export-btn data"
            onClick={() => handleExport('pdf', 'data')}
            disabled={loading}
          >
            {loading ? '⏳ Generating...' : '📥 Download Data Charts PDF'}
          </button>
        </div>
        
        <div className="export-card">
          <div className="export-icon">💾</div>
          <h4>Raw Data Export</h4>
          <p>Export your complete analysis data in CSV or JSON format for external analysis or record keeping.</p>
          <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px'}}>
            <button 
              className="export-btn data"
              onClick={() => handleExport('csv', 'data')}
              disabled={loading}
              style={{flex: 1}}
            >
              {loading ? '⏳' : '📥'} CSV
            </button>
            <button 
              className="export-btn data"
              onClick={() => handleExport('json', 'data')}
              disabled={loading}
              style={{flex: 1}}
            >
              {loading ? '⏳' : '📥'} JSON
            </button>
          </div>
        </div>
      </div>
      
      <div style={{marginTop: '30px', padding: '15px', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #b3d9ff'}}>
        <p style={{margin: 0, fontSize: '14px', color: '#333'}}>
          <strong>📌 Note:</strong> All reports are generated based on your complete mental health analysis history 
          for the selected time period. Reports include professional visualizations, statistical analysis, 
          and evidence-based recommendations.
        </p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch(activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'analyze':
        return <ChatForm />;
      case 'trends':
        return renderMoodTrends();
      case 'suggestions':
        return renderSuggestions();
      case 'blogs':
        return <BlogPage />;
      case 'export':
        return renderExport();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="App">
      {renderHeader()}
      <div className="app-layout">
        {renderNavigation()}
        <main className="main-content">
          {error && (
            <ErrorAlert 
              error={error} 
              onClose={() => setError(null)}
            />
          )}
          {renderContent()}
        </main>
      </div>
      
      {/* Sign Out Confirmation Popup */}
      {showSignOutConfirm && (
        <div className="popup-overlay">
          <div className="popup-modal">
            <div className="popup-header">
              <h3>Confirm Sign Out</h3>
            </div>
            <div className="popup-content">
              <p>Are you sure you want to sign out?</p>
            </div>
            <div className="popup-actions">
              <button className="popup-btn confirm-btn" onClick={confirmSignOut}>
                Yes
              </button>
              <button className="popup-btn cancel-btn" onClick={cancelSignOut}>
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="App">
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="App">
        <div className="login-split-container">
          <div className="login-left-panel">
            <div className="login-branding">
              <img src="/assets/logo.png" alt="Mental Health Analyzer" className="login-logo" />
              <h1 className="login-title">Health Peek</h1>
              <p className="login-subtitle">Supporting your journey with care and understanding</p>
              <div className="login-features">
                <div className="feature-item">
                  <span>Mental Health Analysis</span>
                </div>
                <div className="feature-item">
                  <span>Secure & Private</span>
                </div>
                <div className="feature-item">
                  <span>See Insights</span>
                </div>
              </div>
            </div>
          </div>
          <div className="login-right-panel">
            <div className="auth-form-container">
              <div className="auth-header">
                <h2>Welcome Back</h2>
                <p>Sign in to continue your mental health journey</p>
              </div>
              <AuthForm />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnalysisProvider>
      <AppContent />
    </AnalysisProvider>
  );
}

export default App;
