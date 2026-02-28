import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('authToken');
      
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      if (token) {
        try {
          await apiService.logout();
        } catch (error) {
          console.error('Backend logout failed:', error);
        }
      }
      
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      
      setUser(null);
      setToken(null);
      
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const authData = await apiService.login(email, password);
      
      const userData = {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.full_name || authData.user.name,
        profile_image: authData.user.profile_image || null,
      };

      setUser(userData);
      setToken(authData.access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('authToken', authData.access_token);
    } catch (error) {
      // Re-throw with more user-friendly message
      throw new Error(error.message || 'Login failed. Please check your credentials and try again.');
    }
  };

  const register = async (email, password, name) => {
    try {
      const authData = await apiService.register(email, password, name);
      
      const userData = {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.full_name || authData.user.name,
        profile_image: authData.user.profile_image || null,
      };

      setUser(userData);
      setToken(authData.access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('authToken', authData.access_token);
    } catch (error) {
      // Re-throw with more user-friendly message
      throw new Error(error.message || 'Registration failed. Please check your information and try again.');
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};