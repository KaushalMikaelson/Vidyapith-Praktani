"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { RKMV_DB, User } from '../database/database';
import { API_BASE_URL } from '../utils/api';

interface AuthContextType {
  currentUser: User | null;
  isAuthLoading: boolean;
  login: (email: string, password_hash: string) => Promise<{ success: boolean; error?: string }>;
  register: (fields: any) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (token: string) => Promise<{ success: boolean; status?: string; email?: string; name?: string; picture?: string; error?: string }>;
  logout: () => void;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SESSION_KEY = 'rkmv_active_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // Resolve fresh user details on start
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      const sessionUser = JSON.parse(session) as User;
      setCurrentUser(sessionUser);
      // Verify token is still valid in background
      const token = localStorage.getItem('rkmv_auth_token');
      if (token) {
        fetch(`${API_BASE_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => {
          if (res.ok) return res.json();
          throw new Error('Session expired');
        }).then(data => {
          localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
          setCurrentUser(data.user);
        }).catch(() => {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem('rkmv_auth_token');
          setCurrentUser(null);
        }).finally(() => {
          setIsAuthLoading(false);
        });
      } else {
        setIsAuthLoading(false);
      }
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  const login = async (email: string, password_hash: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
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

  const loginWithGoogle = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || "Google login failed." };
      }

      if (data.status === 'needs_registration') {
        return {
          success: true,
          status: 'needs_registration',
          email: data.email,
          name: data.name,
          picture: data.picture
        };
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
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fields.email,
          password: fields.password,
          full_name: fields.full_name,
          mobile: fields.mobile,
          batch_year: fields.batch_year,
          leaving_class: fields.leaving_class,
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
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
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
    <AuthContext.Provider value={{ currentUser, isAuthLoading, login, register, loginWithGoogle, logout, refreshSession }}>
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
