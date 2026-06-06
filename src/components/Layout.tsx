"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Notification } from '../database/database';
import { apiFetch } from '../utils/api';
import { 
  Home, Plus, Search, Bell, BellOff, MessageCircle,
  User as UserIcon, ShieldCheck, LogOut, X, ChevronDown,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchDropdownVisible, setSearchDropdownVisible] = useState(false);
  
  const [notifDropdownVisible, setNotifDropdownVisible] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const [profileDropdownVisible, setProfileDropdownVisible] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Sync notifications
  const loadNotifications = async () => {
    if (currentUser) {
      try {
        const notifs = await apiFetch('/notifications');
        setNotifications(notifs);
        setUnreadNotifCount(notifs.filter((n: Notification) => !n.read).length);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    }
  };

  const loadPendingCount = async () => {
    if (currentUser && currentUser.role === 'admin') {
      try {
        const pendingUsers = await apiFetch('/admin/pending-users');
        setPendingCount(pendingUsers.length);
      } catch (err) {
        console.error("Failed to load pending users:", err);
      }
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

  // Click away listeners
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchDropdownVisible(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownVisible(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  // Core sidebar nav items — TikTok / Instagram style
  const coreNavItems = [
    { id: 'feed',          label: 'Home',          icon: Home },
    { id: 'create',        label: 'Create',         icon: Plus },
    { id: 'search',        label: 'Search',         icon: Search },
    { id: 'notifications', label: 'Notifications',  icon: Bell, badge: unreadNotifCount },
    { id: 'messages',      label: 'Messages',       icon: MessageCircle },
  ];

  const selectSearchResult = (userId: string) => {
    setSearchQuery('');
    setSearchDropdownVisible(false);
    setSelectedProfileId(userId);
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setSearchDropdownVisible(false);
      return;
    }
    try {
      const matches = await apiFetch(`/directory?search=${encodeURIComponent(q)}`);
      setSearchResults(matches.slice(0, 5));
      setSearchDropdownVisible(true);
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      showToast("All alerts marked as read.", "success");
      loadNotifications();
    } catch (err: any) {
      showToast(err.message || "Failed to mark notifications read.", "danger");
    }
  };

  const handleNotifClick = async (notif: Notification) => {
    try {
      await apiFetch(`/notifications/${notif.id}/read`, { method: 'POST' });
      loadNotifications();
      if (notif.title.includes("Registration") && currentUser.role === 'admin') {
        setActiveScreen('admin');
        setNotifDropdownVisible(false);
      }
    } catch (err: any) {
      console.error("Failed to mark notification read:", err);
    }
  };

  return (
    <div className={`app-layout screen-${activeScreen}`}>
      {/* ─── Sidebar ─────────────────────────────────────────── */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">

        {/* Logo */}
        <div className="tiktok-sidebar-logo" onClick={() => setActiveScreen('feed')}>
          <span className="tiktok-logo-icon">🎓</span>
          <div className="tiktok-logo-text">
            <span className="tiktok-logo-name">Vidyapith</span>
            <span className="tiktok-logo-sub">Alumni</span>
          </div>
        </div>

        {/* Core Nav */}
        <nav className="tiktok-nav">
          {coreNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.label}
                className={`tiktok-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveScreen(item.id);
                  setSidebarOpen(false);
                }}
              >
                <span className="tiktok-nav-icon-wrap">
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
                  {item.badge && item.badge > 0 ? (
                    <span className="tiktok-nav-badge">{item.badge > 9 ? '9+' : item.badge}</span>
                  ) : null}
                </span>
                <span className="tiktok-nav-label">{item.label}</span>
              </button>
            );
          })}

          {/* Admin divider + item */}
          {currentUser.role === 'admin' && (
            <>
              <div className="tiktok-nav-divider" />
              <button
                className={`tiktok-nav-item admin-only ${activeScreen === 'admin' ? 'active' : ''}`}
                onClick={() => { setActiveScreen('admin'); setSidebarOpen(false); }}
              >
                <span className="tiktok-nav-icon-wrap">
                  <ShieldCheck size={24} strokeWidth={activeScreen === 'admin' ? 2.5 : 1.8} />
                  {pendingCount > 0 && (
                    <span className="tiktok-nav-badge">{pendingCount}</span>
                  )}
                </span>
                <span className="tiktok-nav-label">Admin</span>
              </button>
            </>
          )}
        </nav>

        {/* Bottom: Profile + Logout */}
        <div className="tiktok-sidebar-bottom">
          <div ref={profileRef} className="tiktok-profile-row" style={{ position: 'relative' }}>
            <button
              className="tiktok-profile-btn"
              onClick={() => setProfileDropdownVisible(!profileDropdownVisible)}
            >
              <img
                src={currentUser.profile_photo}
                alt={currentUser.full_name}
                className="tiktok-profile-avatar"
              />
              <div className="tiktok-profile-info">
                <span className="tiktok-profile-name">{currentUser.full_name}</span>
                <span className="tiktok-profile-role">
                  {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'student' ? 'Student' : 'Alumnus'}
                </span>
              </div>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>

            {profileDropdownVisible && (
              <div className="tiktok-profile-dropdown">
                <button className="tiktok-dropdown-item" onClick={() => { setActiveScreen('profile'); setProfileDropdownVisible(false); }}>
                  <UserIcon size={15} /> My Profile
                </button>
                {currentUser.role === 'admin' && (
                  <button className="tiktok-dropdown-item" onClick={() => { setActiveScreen('admin'); setProfileDropdownVisible(false); }}>
                    <ShieldCheck size={15} /> Admin Center
                  </button>
                )}
                <div className="tiktok-dropdown-divider" />
                <button className="tiktok-dropdown-item danger" onClick={() => { logout(); showToast("Signed out successfully.", "info"); }}>
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────────────── */}
      <main className="app-main">
        {/* Viewport content */}
        <section className="main-viewport" id="viewport">
          {children}
        </section>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-bottom-nav">
        {coreNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
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
