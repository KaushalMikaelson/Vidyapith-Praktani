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
      const freshUser = RKMV_DB.getUserById(sessionUser.id);
      if (freshUser) {
        if (freshUser.verify_status === 'approved') {
          setCurrentUser(freshUser);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } else {
        setCurrentUser(sessionUser);
      }
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

      // Construct user from mock or server details
      let user = RKMV_DB.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        user = {
          id: data.user.id,
          full_name: data.user.full_name,
          email: data.user.email,
          mobile: "",
          password_hash: "",
          batch_year: 2008,
          house: "Vivekananda House",
          role: data.user.role as any,
          verify_status: 'approved',
          profile_photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
          bio: "Joined the Vidyapith Connect network. Proud alumnus of RKMV Deoghar.",
          profession: "Not specified",
          company: "Not specified",
          city: "Not specified",
          country: "India",
          linkedin_url: "",
          privacy: { show_email: true, show_mobile: false },
          created_at: new Date().toISOString()
        };
        RKMV_DB.addUser(user);
      }

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

      // Add to local mock DB too, so they show up in screens
      const newId = 'usr-' + Math.random().toString(36).substr(2, 9);
      const newAlumnus: User = {
        id: newId,
        full_name: fields.full_name,
        email: fields.email,
        mobile: fields.mobile || "",
        password_hash: fields.password,
        batch_year: parseInt(fields.batch_year),
        house: fields.house,
        role: 'alumni',
        verify_status: 'pending',
        profile_photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
        bio: "Joined the Vidyapith Connect network. Proud alumnus of RKMV Deoghar.",
        profession: "Not specified",
        company: "Not specified",
        city: "Not specified",
        country: "India",
        linkedin_url: "",
        privacy: { show_email: true, show_mobile: false },
        created_at: new Date().toISOString(),
        certificate_url: fields.certificate_name || "certificate_uploaded.pdf"
      };

      RKMV_DB.addUser(newAlumnus);
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

  const refreshSession = () => {
    if (currentUser) {
      const freshUser = RKMV_DB.getUserById(currentUser.id);
      if (freshUser) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(freshUser));
        setCurrentUser(freshUser);
      }
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
