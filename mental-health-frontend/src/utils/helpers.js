// Date formatting utilities
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return new Date(date).toLocaleDateString(undefined, defaultOptions);
};

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString();
};

export const formatTimeAgo = (date) => {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now - then) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(date);
};

// Number formatting utilities
export const formatPercentage = (value, decimals = 1) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatConfidence = (confidence) => {
  return formatPercentage(confidence, 1);
};

export const formatScore = (score, max = 10, decimals = 1) => {
  return `${score.toFixed(decimals)}/${max}`;
};

// Text utilities
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const sanitizeText = (text) => {
  return text
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
};

// Color utilities for sentiment
export const getSentimentColor = (sentiment) => {
  switch (sentiment?.toLowerCase()) {
    case 'positive': return '#22c55e';
    case 'negative': return '#ef4444';
    case 'neutral': return '#6b7280';
    default: return '#6b7280';
  }
};

export const getRiskLevelColor = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case 'low': return '#22c55e';
    case 'medium': return '#f59e0b';
    case 'high': return '#ef4444';
    default: return '#6b7280';
  }
};

export const getWellbeingColor = (score) => {
  if (score >= 7) return '#22c55e';
  if (score >= 4) return '#f59e0b';
  return '#ef4444';
};

// Validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateMessage = (message) => {
  return message.trim().length > 0 && message.length <= 5000;
};

// Storage utilities
export const saveToLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
};

export const getFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to get from localStorage:', error);
    return defaultValue;
  }
};

export const removeFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
    return false;
  }
};

// File utilities
export const downloadFile = (content, filename, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadJSON = (data, filename) => {
  const content = JSON.stringify(data, null, 2);
  downloadFile(content, filename, 'application/json');
};

// Error handling utilities
export const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.detail) return error.detail;
  return 'An unexpected error occurred';
};

export const isNetworkError = (error) => {
  return error.message?.includes('fetch') || 
         error.message?.includes('network') ||
         error.message?.includes('Network');
};