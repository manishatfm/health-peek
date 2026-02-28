import { useState, useEffect } from 'react';
import { authService } from '../services';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const token = authService.getAuthToken();
    const userData = authService.getUser();
    
    if (token && userData) {
      setUser(userData);
      setIsAuthenticated(true);
    }
    
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const result = await authService.login(email, password);
      
      if (result.access_token) {
        authService.setAuthToken(result.access_token);
        
        // Get user info
        const userInfo = await authService.getCurrentUser();
        authService.setUser(userInfo);
        
        setUser(userInfo);
        setIsAuthenticated(true);
        
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, fullName) => {
    try {
      await authService.register(email, password, fullName);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      authService.clearAuth();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const validateToken = async () => {
    try {
      await authService.validateToken();
      return true;
    } catch (error) {
      // Token is invalid, clear auth state
      logout();
      return false;
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    validateToken
  };
};