"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { RKMV_DB, User, Notification } from '../database/database';
import { 
  MessageSquare, Users, Calendar, GraduationCap, Heart, 
  BookOpen, Briefcase, ShieldCheck, Bell, BellOff, LogOut, 
  Menu, X, Search, ChevronDown, User as UserIcon
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

  const [profileDropdownVisible, setProfileDropdownVisible] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Sync notifications
  const loadNotifications = () => {
    if (currentUser) {
      const notifs = RKMV_DB.getNotifications(currentUser.id);
      setNotifications(notifs);
      setUnreadNotifCount(notifs.filter(n => !n.read).length);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000); // Poll notifications
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

  // Navigation Items setup
  const navItems = [
    { id: 'feed', label: 'Community Feed', icon: MessageSquare },
    { id: 'directory', label: 'Alumni Directory', icon: Users },
    { id: 'events', label: 'Events & RSVPs', icon: Calendar },
    { id: 'mentorship', label: 'Mentorship Hub', icon: GraduationCap },
    { id: 'donations', label: 'Donations Portal', icon: Heart },
    { id: 'news', label: 'News & Heritage', icon: BookOpen },
    { id: 'jobs', label: 'Career Board', icon: Briefcase },
  ];

  // Admin badge counter
  const pendingCount = RKMV_DB.getUsers().filter(u => u.verify_status === 'pending').length;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setSearchDropdownVisible(false);
      return;
    }
    const matches = RKMV_DB.searchAlumni(q).slice(0, 5);
    setSearchResults(matches);
    setSearchDropdownVisible(true);
  };

  const selectSearchResult = (userId: string) => {
    setSearchQuery('');
    setSearchDropdownVisible(false);
    setSelectedProfileId(userId);
  };

  const markAllNotificationsRead = () => {
    RKMV_DB.markNotificationsAsRead(currentUser.id);
    showToast("All alerts marked as read.", "success");
    loadNotifications();
  };

  const handleNotifClick = (notif: Notification) => {
    const allNotifs = RKMV_DB.getData<Notification>('rkmv_notifs');
    const idx = allNotifs.findIndex(n => n.id === notif.id);
    if (idx !== -1) {
      allNotifs[idx].read = true;
      RKMV_DB.saveData('rkmv_notifs', allNotifs);
      loadNotifications();
      
      // If it is a registration alert, navigate to admin dashboard
      if (notif.title.includes("Registration") && currentUser.role === 'admin') {
        setActiveScreen('admin');
        setNotifDropdownVisible(false);
      }
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar" style={{
        transform: sidebarOpen ? 'translateX(0)' : undefined
      }}>
        <div className="sidebar-header">
          <div className="logo-box">
            <span className="logo-emblem">🏵️</span>
            <div className="logo-text">
              <h1 className="logo-title">Vidyapith</h1>
              <span className="logo-subtitle">Connect</span>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} style={{ display: 'block' }}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-user-quick">
          <div className="user-avatar-wrap">
            <img src={currentUser.profile_photo} alt={currentUser.full_name} className="quick-user-avatar" />
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
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button 
                key={item.id}
                className={`nav-item ${activeScreen === item.id ? 'active' : ''}`} 
                onClick={() => {
                  setActiveScreen(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}

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
        <header className="app-header">
          <div className="header-left">
            <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(true)} style={{ display: 'block' }}>
              <Menu size={22} />
            </button>
            <div className="header-search-bar" ref={searchRef}>
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                placeholder="Search alumni by name, batch, house..." 
                value={searchQuery}
                onChange={handleSearch}
                onFocus={() => searchQuery.trim() && setSearchDropdownVisible(true)}
              />
              {searchDropdownVisible && (
                <div className="quick-search-dropdown" style={{ display: 'block' }}>
                  <div className="search-section-title">Directory Matches</div>
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
                      >
                        <img src={m.profile_photo} className="search-item-photo" alt="Avatar" />
                        <div className="search-item-info">
                          <span className="search-item-name">{m.full_name}</span>
                          <span className="search-item-sub">Batch of {m.batch_year} • {m.profession}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="header-right">
            {/* Notification Center */}
            <div className="notification-trigger" ref={notifRef}>
              <button className="icon-btn" onClick={() => setNotifDropdownVisible(!notifDropdownVisible)}>
                <Bell size={18} />
                {unreadNotifCount > 0 && (
                  <span className="notif-badge">{unreadNotifCount}</span>
                )}
              </button>
              {notifDropdownVisible && (
                <div className="notification-dropdown" style={{ display: 'block' }}>
                  <div className="notif-header">
                    <h3>Notifications</h3>
                    <button className="text-btn" onClick={markAllNotificationsRead}>Mark all read</button>
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        <BellOff size={28} style={{ marginBottom: '8px', display: 'inline-block' }} />
                        <p style={{ fontSize: '0.8rem' }}>You have no active alerts.</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id}
                          className={`notif-item ${n.read ? '' : 'unread'}`} 
                          onClick={() => handleNotifClick(n)}
                        >
                          <div className={`notif-icon-wrap ${n.type}`}>
                            <span style={{ fontSize: '1.1rem' }}>
                              {n.type === 'success' ? '✅' : n.type === 'alert' ? '⚠️' : 'ℹ️'}
                            </span>
                          </div>
                          <div className="notif-content-box">
                            <span className="notif-title">{n.title}</span>
                            <span className="notif-body">{n.body}</span>
                            <span className="notif-time">
                              {new Date(n.created_at).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="profile-dropdown-wrap" ref={profileRef}>
              <button className="header-user-btn" onClick={() => setProfileDropdownVisible(!profileDropdownVisible)}>
                <img src={currentUser.profile_photo} alt={currentUser.full_name} className="header-user-avatar" />
                <span className="user-header-name">{currentUser.full_name.split(' ')[0]}</span>
                <ChevronDown size={14} className="chevron-icon" />
              </button>
              {profileDropdownVisible && (
                <div className="profile-menu-dropdown" style={{ display: 'block' }}>
                  <a href="#" className="profile-menu-item" onClick={(e) => {
                    e.preventDefault();
                    setSelectedProfileId(currentUser.id);
                    setProfileDropdownVisible(false);
                  }}>
                    <UserIcon size={14} />
                    <span>My Profile</span>
                  </a>
                  {currentUser.role === 'admin' && (
                    <a href="#" className="profile-menu-item" onClick={(e) => {
                      e.preventDefault();
                      setActiveScreen('admin');
                      setProfileDropdownVisible(false);
                    }}>
                      <ShieldCheck size={14} />
                      <span>Admin Center</span>
                    </a>
                  )}
                  <hr className="dropdown-divider" />
                  <a href="#" className="profile-menu-item text-danger" onClick={(e) => {
                    e.preventDefault();
                    logout();
                    showToast("Signed out successfully.", "info");
                  }}>
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
    </div>
  );
};
