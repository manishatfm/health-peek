import React from 'react';
import './ErrorMessage.css';

const ErrorMessage = ({ 
  message, 
  type = 'error', 
  onClose, 
  details,
  showDetails = false 
}) => {
  const [showFullDetails, setShowFullDetails] = React.useState(showDetails);

  return (
    <div className={`error-message ${type}`}>
      <div className="error-content">
        <div className="error-icon">
          {type === 'error' && '⚠️'}
          {type === 'warning' && '⚠️'}
          {type === 'info' && 'ℹ️'}
          {type === 'success' && '✅'}
        </div>
        <div className="error-text">
          <p className="error-main">{message}</p>
          {details && (
            <div className="error-details">
              <button 
                className="details-toggle"
                onClick={() => setShowFullDetails(!showFullDetails)}
              >
                {showFullDetails ? 'Hide Details' : 'Show Details'}
              </button>
              {showFullDetails && (
                <pre className="details-content">{details}</pre>
              )}
            </div>
          )}
        </div>
        {onClose && (
          <button className="error-close" onClick={onClose}>
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;