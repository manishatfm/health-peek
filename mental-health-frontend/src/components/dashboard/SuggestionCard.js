import React from 'react';
import './SuggestionCard.css';

const SuggestionCard = ({ suggestion, onLearnMore }) => {
  const handleLearnMoreClick = () => {
    console.log('Learn More clicked! Suggestion:', suggestion);
    console.log('Blog ID:', suggestion.blog_id);
    console.log('External URL:', suggestion.external_url);
    
    if (suggestion.blog_id && onLearnMore) {
      // Internal blog article
      onLearnMore(suggestion.blog_id);
    } else if (suggestion.external_url) {
      // External link - open in new tab
      window.open(suggestion.external_url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('No blog_id or external_url found');
    }
  };

  const hasLink = suggestion.blog_id || suggestion.external_url;

  return (
    <div className={`suggestion-card ${suggestion.category}`}>
      <div className="suggestion-header">
        <h3>{suggestion.title}</h3>
        <span className={`priority-badge ${suggestion.priority}`}>
          {suggestion.priority === 'critical' && '⚠️ '}
          {suggestion.priority}
        </span>
      </div>
      <p>{suggestion.description}</p>
      {hasLink && (
        <button 
          className="learn-more-btn"
          onClick={handleLearnMoreClick}
          title={suggestion.blog_id ? "Read full article" : "Learn more online"}
        >
          {suggestion.blog_id ? 'Read Article →' : 'Learn More →'}
        </button>
      )}
    </div>
  );
};

export const NoSuggestionsCard = () => {
  return (
    <div className="no-suggestions">
      <h3>Start Your Mental Health Journey</h3>
      <p>Analyze some messages to receive personalized suggestions based on your emotional patterns.</p>
    </div>
  );
};

export default SuggestionCard;