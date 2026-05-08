import React, { createContext, useState, useEffect } from 'react';
import API from '../Services/Api';  // ✅ one dot, not two  // adjust path if needed

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    const { user, access, refresh } = response.data;

    // Normalize role names from backend → frontend expected values
    const roleMap = {
      admin:                'administrator',
      student:              'student',
      workplace_supervisor: 'workplace_supervisor',
      academic_supervisor:  'academic_supervisor',
    };
    const normalizedUser = { ...user, role: roleMap[user.role] ?? user.role };

    setUser(normalizedUser);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    localStorage.setItem('token', access);
    localStorage.setItem('refresh', refresh);
    setUser(normalizedUser);
    return normalizedUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
  };

  const value = { user, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};