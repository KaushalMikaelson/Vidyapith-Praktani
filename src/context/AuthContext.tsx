"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { RKMV_DB, User } from '../database/database';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password_hash: string) => Promise<{ success: boolean; error?: string }>;
  register: (fields: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SESSION_KEY = 'rkmv_active_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Resolve fresh user details on start
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      const sessionUser = JSON.parse(session) as User;
      setCurrentUser(sessionUser);
      refreshSession();
    }
  }, []);

  const login = async (email: string, password_hash: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password_hash })
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || "Login failed." };
      }

      // Save token in localStorage
      localStorage.setItem('rkmv_auth_token', data.token);

      const user = data.user;
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      setCurrentUser(user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error. Make sure API server is running." };
    }
  };

  const register = async (fields: any) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fields.email,
          password: fields.password,
          full_name: fields.full_name,
          mobile: fields.mobile,
          batch_year: fields.batch_year,
          house: fields.house,
          certificate_name: fields.certificate_name
        })
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || "Registration failed." };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error. Make sure API server is running." };
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('rkmv_auth_token');
    setCurrentUser(null);
  };

  const refreshSession = async () => {
    try {
      const token = localStorage.getItem('rkmv_auth_token');
      if (!token) {
        logout();
        return;
      }
      const response = await fetch('http://localhost:8000/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
        setCurrentUser(data.user);
      } else {
        logout();
      }
    } catch (err) {
      console.error("Session refresh failed:", err);
    }
  };


  return (
    <AuthContext.Provider value={{ currentUser, login, register, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
