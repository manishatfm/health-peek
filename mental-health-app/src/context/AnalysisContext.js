import React, { createContext, useContext, useState, useCallback } from 'react';
import { analysisService } from '../services';

const AnalysisContext = createContext(null);

export function AnalysisProvider({ children }) {
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAnalysisHistory = useCallback(async (limit = 50) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await analysisService.getAnalysisHistory(limit);
      const history = Array.isArray(data) ? data : data?.history || [];
      setAnalysisHistory(history);
      return history;
    } catch (err) {
      if (err.message !== 'UNAUTHORIZED') {
        setError(err.message);
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addAnalysis = useCallback((message, result) => {
    const newEntry = {
      analysis_id: result.analysis_id || Date.now().toString(),
      message,
      sentiment: result.sentiment,
      confidence: result.confidence,
      emotions: result.emotions,
      emoji_analysis: result.emoji_analysis,
      timestamp: result.timestamp || new Date().toISOString(),
    };

    setAnalysisHistory(prev => {
      const isDuplicate = prev.some(
        item => item.analysis_id === newEntry.analysis_id
      );
      if (isDuplicate) return prev;
      const updated = [newEntry, ...prev];
      return updated.slice(0, 100);
    });
  }, []);

  const removeAnalysis = useCallback(async (analysisId) => {
    try {
      await analysisService.deleteAnalysis(analysisId);
      setAnalysisHistory(prev => prev.filter(a => a.analysis_id !== analysisId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const clearHistory = useCallback(() => {
    setAnalysisHistory([]);
  }, []);

  const refreshHistory = useCallback(() => {
    return loadAnalysisHistory();
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
  };

  return (
    <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within AnalysisProvider');
  }
  return context;
}

export default AnalysisContext;
