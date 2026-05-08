// src/Context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import API from '../Services/Api';

// Create the context (named export)
export const AuthContext = createContext();

// Create the provider component (named export)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    const response = await API.post('/auth/login/', { username, password });
    const userData = response.data.user;
    const accessToken = response.data.access;
    const refreshToken = response.data.refresh;
    const authUser = { ...userData, accessToken, refreshToken };
    setUser(authUser);
    localStorage.setItem('user', JSON.stringify(authUser));
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    return authUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };

  const value = {
    user,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Also export a custom hook for convenience
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};