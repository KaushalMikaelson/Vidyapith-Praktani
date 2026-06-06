"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Notification } from '../database/database';
import { apiFetch } from '../utils/api';
import { 
  Home, Compass, FileText, Film, Award, Users, BookOpen, Briefcase, 
  Calendar, Bookmark, User as UserIcon, Settings, ShieldCheck, Bell, BellOff, LogOut, Menu, X, Search, ChevronDown, Heart,
  Camera, Archive, HelpCircle, MessageCircle, GraduationCap
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
    }, 5000); // Poll notifications and pending count
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

  // Sticky Left Navigation Items setup (SaaS Design)
  const navItems = [
    { id: 'feed', label: 'Home', icon: Home },
    { id: 'feed', label: 'Feed', icon: Compass },
    { id: 'batch', label: 'Batches', icon: Users },
    { id: 'events', label: 'Reunions', icon: Calendar },
    { id: 'discover', label: 'Spotlights', icon: Award },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Top header nav items (desktop center links)
  const topNavItems = [
    { id: 'feed', label: 'Home' },
    { id: 'directory', label: 'Directory' },
    { id: 'events', label: 'Events' },
    { id: 'memories', label: 'Memories' },
    { id: 'batch', label: 'Batches' },
  ];

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

  const selectSearchResult = (userId: string) => {
    setSearchQuery('');
    setSearchDropdownVisible(false);
    setSelectedProfileId(userId);
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
      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-header">
          <div className="logo-box">
            <span className="logo-emblem">🏵️</span>
            <div className="logo-text">
              <h1 className="logo-title" style={{ color: 'var(--text-primary)' }}>Heritage Alumni</h1>
              <span className="logo-subtitle" style={{ fontSize: '0.68rem' }}>Est. 1925</span>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-user-quick">
          <div className="user-avatar-wrap">
            <img src={currentUser.profile_photo} alt={currentUser.full_name} className="quick-user-avatar" style={{ border: '2px solid var(--primary-color)' }} />
            <span className="status-indicator online"></span>
          </div>
          <div className="user-quick-info">
            <h4 className="user-quick-name">{currentUser.full_name}</h4>
            <span className="badge badge-role">
              {currentUser.role === 'admin' ? 'Admin (Monastic)' : currentUser.role === 'student' ? 'Student' : 'Alumnus'}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Main Vidyapith Navs */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeScreen === item.id || (item.id === 'profile' && activeScreen === 'profile_view');
            return (
              <button 
                key={item.id}
                className={`nav-item ${isSelected ? 'active' : ''}`} 
                onClick={() => {
                  setActiveScreen(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={20} style={{ color: isSelected ? 'var(--primary-color)' : 'inherit' }} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div style={{ height: '1px', background: 'var(--border-color)', margin: '10px 0' }} />

          {currentUser.role === 'admin' && (
            <button 
              className={`nav-item admin-only ${activeScreen === 'admin' ? 'active' : ''}`} 
              onClick={() => {
                setActiveScreen('admin');
                setSidebarOpen(false);
              }}
            >
              <ShieldCheck size={20} />
              <span>Admin Center</span>
              {pendingCount > 0 && (
                <span className="pending-count-badge">{pendingCount}</span>
              )}
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-logout" onClick={() => logout()}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
          <div className="motto-box">
            <p className="motto-text">"Atmano mokshartham jagat hitaya cha"</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-main">
        {/* Top Header */}
        <header className="app-header" style={{
          background: 'var(--bg-darker)',
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--border-color)',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}>
          {/* Left: Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveScreen('feed')}>
            <div style={{
              background: '#f5a623',
              color: '#08172b',
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.25rem',
              boxShadow: '0 2px 6px rgba(245, 166, 35, 0.4)'
            }}>
              🎓
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', fontFamily: 'var(--font-title)', letterSpacing: '-0.01em' }}>Heritage Alumni</span>
              <span style={{ fontSize: '0.68rem', color: '#f5a623', fontWeight: 700 }}>Est. 1925 · 100 Years</span>
            </div>
          </div>

          {/* Center Nav Links (Desktop only) */}
          <div className="header-nav-center" style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
            {topNavItems.map(item => {
              const isActive = activeScreen === item.id || (item.id === 'feed' && activeScreen === 'explore');
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isActive ? 'white' : '#9ca3af',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    padding: '8px 0',
                    borderBottom: isActive ? '2.5px solid #f5a623' : '2.5px solid transparent',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right Section: Search + Bell + Profile Avatar */}
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Search Box */}
            <div className="header-search-bar" ref={searchRef} style={{
              position: 'relative',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '6px 14px 6px 36px',
              display: 'flex',
              alignItems: 'center',
              width: '240px',
              height: '36px',
              border: 'none'
            }}>
              <Search className="search-icon" size={16} style={{ position: 'absolute', left: '12px', color: '#9ca3af' }} />
              <input 
                type="text" 
                placeholder="Search alumni, batches..." 
                value={searchQuery}
                onChange={handleSearch}
                onFocus={() => searchQuery.trim() && setSearchDropdownVisible(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '0.82rem',
                  outline: 'none',
                  width: '100%'
                }}
              />
              {searchDropdownVisible && (
                <div className="quick-search-dropdown" style={{ display: 'block', position: 'absolute', top: '42px', right: 0, width: '280px', background: '#0b1a30', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 1100, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  <div className="search-section-title" style={{ padding: '8px 12px', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Directory Matches</div>
                  {searchResults.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', textAlign: 'center', padding: '10px', color: 'var(--text-muted)' }}>
                      No alumni matching "{searchQuery}"
                    </p>
                  ) : (
                    searchResults.map(m => (
                      <div 
                        key={m.id}
                        className="search-result-item" 
                        onClick={() => selectSearchResult(m.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', transition: 'background 0.2s' }}
                      >
                        <img src={m.profile_photo} className="search-item-photo" alt="Avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div className="search-item-info" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <span className="search-item-name" style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600 }}>{m.full_name}</span>
                          <span className="search-item-sub" style={{ color: '#9ca3af', fontSize: '0.72rem' }}>Batch of {m.batch_year} • {m.profession}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Bell Notifications */}
            <div className="notification-trigger" ref={notifRef} style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => setNotifDropdownVisible(!notifDropdownVisible)} style={{ background: 'none', border: 'none', color: '#f5a623', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', position: 'relative' }}>
                <Bell size={20} />
                {unreadNotifCount > 0 && (
                  <span className="notif-badge" style={{ position: 'absolute', top: '1px', right: '1px', width: '8px', height: '8px', background: '#FF7A1A', borderRadius: '50%' }}></span>
                )}
              </button>
              {notifDropdownVisible && (
                <div className="notification-dropdown" style={{ display: 'block', position: 'absolute', top: '38px', right: '-80px', width: '300px', background: '#0b1a30', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 1100, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                  <div className="notif-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <h3 style={{ fontSize: '0.88rem', color: 'white', margin: 0 }}>Notifications</h3>
                    <button className="text-btn" onClick={markAllNotificationsRead} style={{ background: 'none', border: 'none', color: '#f5a623', fontSize: '0.75rem', cursor: 'pointer' }}>Mark all read</button>
                  </div>
                  <div className="notif-list" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                        <BellOff size={24} style={{ marginBottom: '8px', display: 'inline-block' }} />
                        <p style={{ fontSize: '0.78rem', margin: 0 }}>You have no active alerts.</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id}
                          className={`notif-item ${n.read ? '' : 'unread'}`} 
                          onClick={() => handleNotifClick(n)}
                          style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', background: n.read ? 'transparent' : 'rgba(255,122,26,0.05)' }}
                        >
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ fontSize: '1rem' }}>
                              {n.type === 'success' ? '✅' : n.type === 'alert' ? '⚠️' : 'ℹ️'}
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'white' }}>{n.title}</span>
                              <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>{n.body}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="profile-dropdown-wrap" ref={profileRef} style={{ position: 'relative' }}>
              <button className="header-user-btn" onClick={() => setProfileDropdownVisible(!profileDropdownVisible)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 0 }}>
                <img src={currentUser.profile_photo} alt={currentUser.full_name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }} />
              </button>
              {profileDropdownVisible && (
                <div className="profile-menu-dropdown" style={{ display: 'block', position: 'absolute', top: '38px', right: 0, width: '160px', background: '#0b1a30', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 1100, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', padding: '4px' }}>
                  <a href="#" className="profile-menu-item" onClick={(e) => {
                    e.preventDefault();
                    setActiveScreen('profile');
                    setProfileDropdownVisible(false);
                  }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', color: 'white', fontSize: '0.8rem', borderRadius: '4px', textDecoration: 'none' }}>
                    <UserIcon size={14} />
                    <span>My Profile</span>
                  </a>
                  {currentUser.role === 'admin' && (
                    <a href="#" className="profile-menu-item" onClick={(e) => {
                      e.preventDefault();
                      setActiveScreen('admin');
                      setProfileDropdownVisible(false);
                    }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', color: 'white', fontSize: '0.8rem', borderRadius: '4px', textDecoration: 'none' }}>
                      <ShieldCheck size={14} />
                      <span>Admin Center</span>
                    </a>
                  )}
                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  <a href="#" className="profile-menu-item text-danger" onClick={(e) => {
                    e.preventDefault();
                    logout();
                    showToast("Signed out successfully.", "info");
                  }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', color: '#ef4444', fontSize: '0.8rem', borderRadius: '4px', textDecoration: 'none' }}>
                    <LogOut size={14} />
                    <span>Logout</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Viewport content */}
        <section className="main-viewport" id="viewport">
          {children}
        </section>
      </main>

      {/* Mobile Bottom Navigation Bar (Instagram-inspired) */}
      <div className="mobile-bottom-nav">
        <button 
          className={`mobile-nav-item ${activeScreen === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveScreen('feed')}
        >
          <Home size={22} />
          <span>Home</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeScreen === 'discover' ? 'active' : ''}`}
          onClick={() => setActiveScreen('discover')}
        >
          <Compass size={22} />
          <span>Discover</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeScreen === 'memories' ? 'active' : ''}`}
          onClick={() => setActiveScreen('memories')}
        >
          <Camera size={22} />
          <span>Memories</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeScreen === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveScreen('saved')}
        >
          <Bookmark size={22} />
          <span>Saved</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeScreen === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveScreen('profile')}
        >
          <UserIcon size={22} />
          <span>Profile</span>
        </button>
      </div>
    </div>
  );
};
