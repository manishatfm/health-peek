import apiService from './services/api';

export async function analyzeMessage(message) {
  try {
    const result = await apiService.analyzeMessage(message);
    
    // Transform backend response to match frontend expectations
    return {
      sentiment: result.sentiment === 'positive' ? result.confidence : 
                 result.sentiment === 'negative' ? -result.confidence : 0,
      riskLevel: result.sentiment === 'negative' && result.confidence > 0.7 ? 'High' :
                 result.sentiment === 'positive' ? 'Low' : 'Medium',
      confidence: result.confidence,
      suggestions: result.suggestions,
      timestamp: result.timestamp,
      isOffline: false
    };
  } catch (error) {
    console.error('Analysis failed:', error);
    // Fallback to local analysis if API fails
    return fallbackAnalysis(message);
  }
}

// Fallback analysis function (existing logic as backup)
function fallbackAnalysis(message) {
  const text = message.toLowerCase();
  
  const positiveWords = [
    'happy', 'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
    'love', 'joy', 'excited', 'grateful', 'blessed', 'awesome', 'perfect',
    'beautiful', 'smile', 'laugh', 'peace', 'calm', 'relaxed'
  ];
  
  const negativeWords = [
    'sad', 'depressed', 'angry', 'hate', 'terrible', 'awful', 'horrible',
    'anxious', 'worried', 'scared', 'fear', 'panic', 'stress', 'pain',
    'hurt', 'cry', 'lonely', 'hopeless', 'tired', 'exhausted'
  ];
  
  const riskWords = [
    'suicide', 'kill myself', 'end it all', 'worthless', 'hopeless',
    'can\'t go on', 'want to die', 'self harm', 'hurt myself'
  ];
  
  let sentimentScore = 0;
  let wordCount = 0;
  
  const words = text.split(/\s+/);
  
  words.forEach(word => {
    if (positiveWords.includes(word)) {
      sentimentScore += 1;
      wordCount++;
    } else if (negativeWords.includes(word)) {
      sentimentScore -= 1;
      wordCount++;
    }
  });
  
  let riskLevel = 'Low';
  riskWords.forEach(phrase => {
    if (text.includes(phrase)) {
      riskLevel = 'High';
    }
  });
  
  if (riskLevel === 'Low' && sentimentScore < -2) {
    riskLevel = 'Medium';
  }
  
  const normalizedSentiment = wordCount > 0 ? sentimentScore / wordCount : 0;
  
  return {
    sentiment: normalizedSentiment,
    riskLevel: riskLevel,
    confidence: 0.6, // Lower confidence for fallback
    isOffline: true
  };
}
