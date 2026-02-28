import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services';

export const useDashboard = (timeRange = '30d') => {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState({
    stats: false,
    trends: false,
    suggestions: false
  });
  const [errors, setErrors] = useState({
    stats: null,
    trends: null,
    suggestions: null
  });

  const loadStats = useCallback(async () => {
    setLoading(prev => ({ ...prev, stats: true }));
    setErrors(prev => ({ ...prev, stats: null }));
    
    try {
      const data = await dashboardService.getDashboardStats(timeRange);
      setStats(data);
    } catch (error) {
      setErrors(prev => ({ ...prev, stats: error.message }));
      // Set empty state
      setStats({
        wellbeingScore: 0,
        riskLevel: 'Unknown',
        communicationFrequency: 0,
        description: 'Start analyzing messages to see your insights',
        isEmpty: true
      });
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  }, [timeRange]);

  const loadTrends = useCallback(async () => {
    setLoading(prev => ({ ...prev, trends: true }));
    setErrors(prev => ({ ...prev, trends: null }));
    
    try {
      const data = await dashboardService.getMoodTrends(timeRange);
      setTrends(data.trends || []);
    } catch (error) {
      setErrors(prev => ({ ...prev, trends: error.message }));
      setTrends([]);
    } finally {
      setLoading(prev => ({ ...prev, trends: false }));
    }
  }, [timeRange]);

  const loadSuggestions = useCallback(async () => {
    setLoading(prev => ({ ...prev, suggestions: true }));
    setErrors(prev => ({ ...prev, suggestions: null }));
    
    try {
      const data = await dashboardService.getSuggestions();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      setErrors(prev => ({ ...prev, suggestions: error.message }));
      setSuggestions([]);
    } finally {
      setLoading(prev => ({ ...prev, suggestions: false }));
    }
  }, []);

  const exportData = async (format = 'json') => {
    try {
      return await dashboardService.downloadExport(timeRange, format);
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  };

  const refreshAll = useCallback(() => {
    loadStats();
    loadTrends();
    loadSuggestions();
  }, [loadStats, loadTrends, loadSuggestions]);

  useEffect(() => {
    loadStats();
    loadTrends();
  }, [loadStats, loadTrends]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  return {
    stats,
    trends,
    suggestions,
    loading,
    errors,
    refreshAll,
    exportData
  };
};