import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ErrorAlert } from './common';

const AuthForm = () => {
  const { login, register, logout, user, loading, isAuthenticated } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || (!isLogin && !formData.name)) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setAuthLoading(true);
      setError(null);
      
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.email, formData.password, formData.name);
      }
      
    } catch (error) {
      setError(error.message || 'Authentication failed. Please try again.');
      console.error('Auth error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setAuthLoading(true);
      setError(null);
      await logout();
    } catch (error) {
      setError('Logout failed. Please try again.');
      console.error('Logout error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="user-profile">
        <div className="user-info">
          <div className="user-details">
            <span className="user-name">{user.name || 'Unknown User'}</span>
            <span className="user-email">{user.email}</span>
          </div>
        </div>
        <button 
          onClick={handleLogout} 
          className="logout-btn"
          disabled={authLoading}
        >
          {authLoading ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-section">
      {error && (
        <ErrorAlert 
          error={error} 
          onClose={() => setError(null)}
        />
      )}
      
      <div className="auth-form">
        <div className="auth-tabs">
          <button 
            className={isLogin ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            className={!isLogin ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form-content">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Your name"
                disabled={authLoading}
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your@email.com"
              disabled={authLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Your password"
              disabled={authLoading}
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={authLoading}
          >
            {authLoading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
      </div>
    </div>
  );
};


export default AuthForm;
