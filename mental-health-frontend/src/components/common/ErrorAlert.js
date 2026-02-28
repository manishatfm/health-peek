import React from 'react';
import './ErrorAlert.css';

const ErrorAlert = ({ error, onClose }) => {
  if (!error) return null;

  const getErrorMessage = (error) => {
    // Handle different types of errors with user-friendly messages
    if (typeof error === 'string') {
      if (error.includes('422')) {
        return {
          title: 'Input Validation Error',
          message: 'Please check your input and try again. Make sure your password is at least 6 characters long.',
          type: 'warning'
        };
      }
      if (error.includes('401')) {
        return {
          title: 'Authentication Failed',
          message: 'Invalid email or password. Please check your credentials and try again.',
          type: 'error'
        };
      }
      if (error.includes('400')) {
        return {
          title: 'Invalid Request',
          message: 'The information provided is not valid. Please check and try again.',
          type: 'warning'
        };
      }
      if (error.includes('500')) {
        return {
          title: 'Server Error',
          message: 'Something went wrong on our end. Please try again in a moment.',
          type: 'error'
        };
      }
      if (error.toLowerCase().includes('fetch')) {
        return {
          title: 'Connection Error',
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          type: 'error'
        };
      }
    }

    // Try to parse backend error details
    try {
      const errorObj = JSON.parse(error);
      if (errorObj.detail) {
        if (Array.isArray(errorObj.detail)) {
          const firstError = errorObj.detail[0];
          if (firstError.type === 'string_too_short' && firstError.loc.includes('password')) {
            return {
              title: 'Password Too Short',
              message: 'Your password must be at least 6 characters long.',
              type: 'warning'
            };
          }
          if (firstError.type === 'value_error' && firstError.loc.includes('email')) {
            return {
              title: 'Invalid Email',
              message: 'Please enter a valid email address.',
              type: 'warning'
            };
          }
        }
        return {
          title: 'Validation Error',
          message: errorObj.detail,
          type: 'warning'
        };
      }
    } catch (e) {
      // Not a JSON error, continue with generic handling
    }

    return {
      title: 'Something went wrong',
      message: 'Please try again. If the problem persists, contact support.',
      type: 'error'
    };
  };

  const { title, message, type } = getErrorMessage(error);

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '⚠️';
    }
  };

  return (
    <div className={`error-alert error-alert--${type}`}>
      <div className="error-alert__content">
        <div className="error-alert__icon">
          {getIcon(type)}
        </div>
        <div className="error-alert__text">
          <h4 className="error-alert__title">{title}</h4>
          <p className="error-alert__message">{message}</p>
        </div>
        {onClose && (
          <button className="error-alert__close" onClick={onClose}>
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;