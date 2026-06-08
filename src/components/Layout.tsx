"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Notification } from '../database/database';
import { apiFetch } from '../utils/api';
import { 
  Home, Plus, Search, Bell, MessageCircle,
  User as UserIcon, ShieldCheck, LogOut,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  setSelectedProfileId: (id: string | null) => void;
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, activeScreen, setActiveScreen, setSelectedProfileId, showToast 
}) => {
  const { currentUser, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (currentUser) {
      try {
        const notifs = await apiFetch('/notifications');
        setNotifications(notifs);
        setUnreadNotifCount(notifs.filter((n: Notification) => !n.read).length);
      } catch {}
    }
  };

  const loadPendingCount = async () => {
    if (currentUser && currentUser.role === 'admin') {
      try {
        const pendingUsers = await apiFetch('/admin/pending-users');
        setPendingCount(pendingUsers.length);
      } catch {}
    }
  };

  useEffect(() => {
    loadNotifications();
    loadPendingCount();
    const interval = setInterval(() => {
      loadNotifications();
      loadPendingCount();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const navItems = [
    { id: 'feed',          label: 'Home',          icon: Home },
    { id: 'create',        label: 'Create',         icon: Plus },
    { id: 'search',        label: 'Search',         icon: Search },
    { id: 'notifications', label: 'Notifications',  icon: Bell, badge: unreadNotifCount },
    { id: 'messages',      label: 'Messages',       icon: MessageCircle },
    ...(currentUser.role === 'admin'
      ? [{ id: 'admin', label: 'Admin', icon: ShieldCheck, badge: pendingCount }]
      : []),
  ];

  return (
    <div className={`app-layout screen-${activeScreen}`}>

      {/* ── Icon Rail Sidebar ─────────────────────────────── */}
      <aside className="icon-rail" id="sidebar">

        {/* Logo */}
        <button
          className="rail-logo"
          onClick={() => setActiveScreen('feed')}
          title="Vidyapith Alumni"
        >
          <img src="/logo.png" alt="Vidyapith Logo" className="rail-logo-image" />
          <span className="rail-tooltip">Vidyapith</span>
        </button>

        {/* Divider */}
        <div className="rail-divider" />

        {/* Nav Items */}
        <nav className="rail-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                className={`rail-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveScreen(item.id)}
                aria-label={item.label}
              >
                <span className="rail-icon">
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
                  {item.badge && item.badge > 0 ? (
                    <span className="rail-badge">{item.badge > 9 ? '9+' : item.badge}</span>
                  ) : null}
                </span>
                <span className="rail-tooltip">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom: Profile */}
        <div className="rail-bottom" ref={profileRef}>
          <button
            className="rail-btn rail-profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="Profile"
          >
            <span className="rail-icon">
              <img
                src={currentUser.profile_photo}
                alt={currentUser.full_name}
                className="rail-avatar"
              />
            </span>
            <span className="rail-tooltip">{currentUser.full_name}</span>
          </button>

          {profileOpen && (
            <div className="rail-profile-popup">
              <div className="rail-popup-user">
                <img src={currentUser.profile_photo} alt={currentUser.full_name} />
                <div>
                  <strong>{currentUser.full_name}</strong>
                  <span>{currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'student' ? 'Student' : 'Alumnus'}</span>
                </div>
              </div>
              <div className="rail-popup-divider" />
              <button className="rail-popup-item" onClick={() => { setActiveScreen('profile'); setProfileOpen(false); }}>
                <UserIcon size={15} /> My Profile
              </button>
              {currentUser.role === 'admin' && (
                <button className="rail-popup-item" onClick={() => { setActiveScreen('admin'); setProfileOpen(false); }}>
                  <ShieldCheck size={15} /> Admin Center
                </button>
              )}
              <div className="rail-popup-divider" />
              <button className="rail-popup-item danger" onClick={() => { logout(); showToast('Signed out.', 'info'); }}>
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────── */}
      <main className="app-main">
        <section className="main-viewport" id="viewport">
          {children}
        </section>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="mobile-bottom-nav">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`mobile-nav-item ${activeScreen === item.id ? 'active' : ''}`}
              onClick={() => setActiveScreen(item.id)}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
