import React, { createContext, useContext, useState, useCallback } from 'react';
import { analysisService } from '../services';

const AnalysisContext = createContext();

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};

export const AnalysisProvider = ({ children }) => {
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load analysis history from backend
  const loadAnalysisHistory = useCallback(async (limit = 50) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await analysisService.getAnalysisHistory(limit);
      const history = response.analyses || response || [];
      setAnalysisHistory(Array.isArray(history) ? history : []);
      return history;
    } catch (error) {
      console.error('Failed to load analysis history:', error);
      setError(error.message);
      setAnalysisHistory([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add new analysis to history (both local and backend)
  const addAnalysis = useCallback(async (message, analysisResult) => {
    try {
      // The analysis is already saved to backend by the analysis service
      // We just need to add it to local state for immediate UI update
      const newEntry = {
        analysis_id: analysisResult.analysis_id,
        message: message,
        sentiment: analysisResult.sentiment,
        confidence: analysisResult.confidence,
        emotions: analysisResult.emotions,
        emoji_analysis: analysisResult.emoji_analysis,
        timestamp: analysisResult.timestamp || new Date().toISOString(),
        created_at: analysisResult.timestamp || new Date().toISOString()
      };

      setAnalysisHistory(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        // Check if this analysis already exists (avoid duplicates)
        const exists = prevArray.some(item => item.analysis_id === newEntry.analysis_id);
        if (exists) {
          return prevArray;
        }
        // Add to beginning and limit to prevent memory issues
        return [newEntry, ...prevArray].slice(0, 100);
      });

      return newEntry;
    } catch (error) {
      console.error('Failed to add analysis to history:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // Remove analysis from history
  const removeAnalysis = useCallback(async (analysisId) => {
    try {
      await analysisService.deleteAnalysis(analysisId);
      setAnalysisHistory(prev => 
        prev.filter(item => item.analysis_id !== analysisId)
      );
    } catch (error) {
      console.error('Failed to remove analysis:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // Clear all analysis history
  const clearHistory = useCallback(() => {
    setAnalysisHistory([]);
    setError(null);
  }, []);

  // Refresh history (useful after navigation back to analyze page)
  const refreshHistory = useCallback(async () => {
    return await loadAnalysisHistory();
  }, [loadAnalysisHistory]);

  const value = {
    analysisHistory,
    isLoading,
    error,
    loadAnalysisHistory,
    addAnalysis,
    removeAnalysis,
    clearHistory,
    refreshHistory,
    setError
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
};