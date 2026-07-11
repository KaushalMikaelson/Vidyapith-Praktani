"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, CheckCheck, RefreshCw, CheckCircle2, AlertTriangle, Info, BellOff, Sparkles, Mail, MonitorCheck
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  disableBrowserNotifications,
  enableBrowserNotifications,
  fetchNotificationSettings,
  getBrowserNotificationPermission,
  NotificationSettings,
  updateNotificationSettings
} from '../utils/notifications';

interface NotificationsScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onNavigate?: (screen: string) => void;
}

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'alert';
  read: boolean;
  crucial?: boolean;
  action_url?: string | null;
  created_at: string;
}

const knownNotificationRoutes = new Set([
  'admin',
  'directory',
  'donations',
  'events',
  'feed',
  'jobs',
  'mentorship',
  'messages',
  'notifications',
  'profile'
]);

const getRouteFromActionUrl = (actionUrl?: string | null): string | null => {
  if (!actionUrl) return null;

  try {
    const url = new URL(actionUrl, 'https://vidyapith.local');
    const screen = url.searchParams.get('screen');
    if (screen && knownNotificationRoutes.has(screen)) return screen;
  } catch {}

  const route = actionUrl.replace(/^\//, '').trim();
  return knownNotificationRoutes.has(route) ? route : null;
};

const getActionUrlParam = (actionUrl: string | null | undefined, key: string): string | null => {
  if (!actionUrl) return null;
  try {
    return new URL(actionUrl, 'https://vidyapith.local').searchParams.get(key);
  } catch {
    return null;
  }
};

const normalizeName = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const findPendingConnectionRequest = (notification: Notification, pendingRequests: any[]) => {
  const connectionId = getActionUrlParam(notification.action_url, 'connectionId');
  const senderId = getActionUrlParam(notification.action_url, 'senderId');

  if (connectionId) {
    const byConnection = pendingRequests.find(req => req.connectionId === connectionId);
    if (byConnection) return byConnection;
  }

  if (senderId) {
    const bySender = pendingRequests.find(req => req.id === senderId);
    if (bySender) return bySender;
  }

  const body = normalizeName(notification.body);
  const byName = pendingRequests.find(req => {
    const fullName = normalizeName(req.full_name || '');
    return fullName && (body.includes(fullName) || fullName.includes(body.split(' wants to connect')[0]));
  });

  if (byName) return byName;
  return pendingRequests.length === 1 ? pendingRequests[0] : null;
};

const getRouteForNotification = (notification: Notification): string | null => {
  const actionRoute = getRouteFromActionUrl(notification.action_url);
  if (actionRoute) return actionRoute;

  const t = `${notification.title} ${notification.body}`.toLowerCase();
  if (t.includes('message') || t.includes('dm') || t.includes('chat')) return 'messages';
  if (t.includes('mentorship') || t.includes('mentee') || t.includes('mentor')) return 'mentorship';
  if (t.includes('job') || t.includes('career') || t.includes('application')) return 'jobs';
  if (t.includes('event') || t.includes('rsvp') || t.includes('reunion')) return 'events';
  if (t.includes('donation') || t.includes('tax receipt') || t.includes('contribute')) return 'donations';
  if (t.includes('connection') || t.includes('connect')) return 'directory';
  if (t.includes('registration') || t.includes('verification request') || t.includes('applicant')) return 'admin';
  if (t.includes('verification approved') || t.includes('approved')) return 'profile';
  return null;
};

type FilterType = 'all' | 'unread' | 'success' | 'alert' | 'info';

const timeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const typeConfig = {
  success: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle2, label: 'Success' },
  alert:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: AlertTriangle, label: 'Alert' },
  info:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: Info, label: 'Info' },
};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ showToast, onNavigate }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [processedRequests, setProcessedRequests] = useState<Record<string, 'accepted' | 'declined'>>({});
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({});
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [updatingBrowser, setUpdatingBrowser] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);

  const loadPendingRequests = useCallback(async () => {
    try {
      const pending = await apiFetch('/directory/connections/pending');
      setPendingRequests(pending || []);
    } catch (err) {
      console.error("Error loading pending connections:", err);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/notifications');
      setNotifications(data);
      await loadPendingRequests();
    } catch (err: any) {
      if (err?.status === 401) return;
      showToast(err.message || 'Failed to load notifications', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast, loadPendingRequests]);

  const loadNotificationSettings = useCallback(async () => {
    setBrowserPermission(getBrowserNotificationPermission());
    try {
      const settings = await fetchNotificationSettings();
      setNotificationSettings(settings);
    } catch (err) {
      console.error("Error loading notification settings:", err);
    }
  }, []);

  const handleRespond = async (notificationId: string, request: any, action: 'accept' | 'decline') => {
    const targetUserId = request.id;
    setProcessedRequests(prev => ({ ...prev, [notificationId]: action === 'accept' ? 'accepted' : 'declined' }));
    setPendingRequests(prev => prev.filter(req => req.id !== targetUserId));
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    if (action === 'accept') showToast("Connection request accepted!", "success");
    else showToast("Connection request declined.", "info");
    try {
      await Promise.all([
        apiFetch('/directory/connections/respond', {
          method: 'POST',
          body: JSON.stringify({ targetId: targetUserId, connectionId: request.connectionId, action })
        }),
        apiFetch(`/notifications/${notificationId}/read`, { method: 'POST' })
      ]);
    } catch (err: any) {
      showToast(err.message || "Failed to respond to connection request", "danger");
    }
  };

  useEffect(() => {
    loadNotifications();
    loadNotificationSettings();
  }, [loadNotifications, loadNotificationSettings]);

  const handleEnableBrowserNotifications = async () => {
    setUpdatingBrowser(true);
    try {
      await enableBrowserNotifications();
      await loadNotificationSettings();
      showToast('Browser notifications enabled.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to enable browser notifications.', 'danger');
      setBrowserPermission(getBrowserNotificationPermission());
    } finally {
      setUpdatingBrowser(false);
    }
  };

  const handleDisableBrowserNotifications = async () => {
    setUpdatingBrowser(true);
    try {
      await disableBrowserNotifications();
      await updateNotificationSettings({ browser_enabled: false });
      await loadNotificationSettings();
      showToast('Browser notifications disabled.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to disable browser notifications.', 'danger');
    } finally {
      setUpdatingBrowser(false);
    }
  };

  const handleToggleCrucialEmail = async () => {
    if (!notificationSettings) return;
    setUpdatingEmail(true);
    try {
      const nextValue = !notificationSettings.email_crucial_enabled;
      await updateNotificationSettings({ email_crucial_enabled: nextValue });
      setNotificationSettings(prev => prev ? { ...prev, email_crucial_enabled: nextValue } : prev);
      showToast(nextValue ? 'Crucial email notifications enabled.' : 'Crucial email notifications disabled.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update email preference.', 'danger');
    } finally {
      setUpdatingEmail(false);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      showToast('All notifications marked as read.', 'success');
    } catch (err: any) {
      showToast(err.message, 'danger');
    } finally {
      setMarkingAll(false);
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const successCount = notifications.filter(n => n.type === 'success').length;
  const alertCount = notifications.filter(n => n.type === 'alert').length;
  const infoCount = notifications.filter(n => n.type === 'info').length;

  const filterTabs: { id: FilterType; label: string; count: number }[] = [
    { id: 'all',     label: 'All',     count: notifications.length },
    { id: 'unread',  label: 'Unread',  count: unreadCount },
    { id: 'success', label: 'Success', count: successCount },
    { id: 'alert',   label: 'Alerts',  count: alertCount },
    { id: 'info',    label: 'Info',    count: infoCount },
  ];

  const browserSupported = browserPermission !== 'unsupported';
  const browserEnabled = Boolean(
    notificationSettings?.browser_enabled &&
    notificationSettings?.has_browser_subscription &&
    browserPermission === 'granted'
  );
  const browserStatusLabel = !browserSupported
    ? 'Not supported'
    : browserPermission === 'denied'
      ? 'Blocked in browser'
      : browserEnabled
        ? 'Enabled'
        : 'Off';

  if (!currentUser) return null;

  return (
    <div className="notifications-screen-container">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="notifications-header-row">
        <div className="notifications-header-title-block">
          <div className="notifications-header-icon" style={{
            width: '52px', height: '52px', borderRadius: '16px',
            background: 'var(--primary-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 8px 20px rgba(243,112,33,0.25)',
            flexShrink: 0
          }}>
            <Bell size={26} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--heritage-ink)', margin: 0, lineHeight: 1.2, fontFamily: 'var(--font-title)' }}>
              Notifications
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--heritage-muted)', fontWeight: 500 }}>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : "You're all caught up — nothing new since your last visit"}
            </p>
          </div>
        </div>

        <div className="notifications-header-buttons" style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadNotifications}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '9999px', fontSize: '0.88rem',
              background: 'var(--heritage-card)',
              border: '1.5px solid var(--heritage-line)',
              color: 'var(--heritage-ink)', cursor: 'pointer', fontWeight: 700,
              boxShadow: 'var(--heritage-shadow)', transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.color = 'var(--primary-color)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--heritage-line)'; e.currentTarget.style.color = 'var(--heritage-ink)'; }}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', borderRadius: '9999px', fontSize: '0.88rem',
                background: 'var(--primary-gradient)',
                border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700,
                opacity: markingAll ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(243,112,33,0.25)', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { if (!markingAll) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(243,112,33,0.3)'; } }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(243,112,33,0.25)'; }}
            >
              <CheckCheck size={16} />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* ── Settings Cards ───────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '14px',
        marginBottom: '28px'
      }}>
        {/* Browser Notifications */}
        <div style={{
          background: 'var(--heritage-card)',
          border: '1px solid var(--heritage-line)',
          borderRadius: '14px',
          padding: '14px 18px',
          boxShadow: 'var(--heritage-shadow)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: browserEnabled ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
            color: browserEnabled ? '#10b981' : '#3b82f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <MonitorCheck size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--heritage-ink)', fontWeight: 800 }}>
                Browser Notifications
              </h3>
              <span style={{
                fontSize: '0.7rem', fontWeight: 800,
                color: browserEnabled ? '#10b981' : 'var(--heritage-muted)',
                background: browserEnabled ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                padding: '2px 8px', borderRadius: '9999px'
              }}>
                {browserStatusLabel}
              </span>
            </div>
          </div>
          {browserEnabled ? (
            <button
              onClick={handleDisableBrowserNotifications}
              disabled={updatingBrowser}
              style={{
                padding: '8px 14px', borderRadius: '10px',
                border: '1.5px solid var(--heritage-line)',
                background: 'var(--heritage-card)', color: 'var(--heritage-ink)',
                cursor: updatingBrowser ? 'default' : 'pointer',
                fontWeight: 800, fontSize: '0.82rem', flexShrink: 0,
                opacity: updatingBrowser ? 0.65 : 1
              }}
            >
              Disable
            </button>
          ) : (
            <button
              onClick={handleEnableBrowserNotifications}
              disabled={updatingBrowser || !browserSupported || browserPermission === 'denied' || notificationSettings?.browser_configured === false}
              style={{
                padding: '8px 14px', borderRadius: '10px', border: 'none',
                background: 'var(--primary-gradient)', color: 'white', flexShrink: 0,
                cursor: updatingBrowser ? 'default' : 'pointer', fontWeight: 800, fontSize: '0.82rem',
                opacity: updatingBrowser || !browserSupported || browserPermission === 'denied' || notificationSettings?.browser_configured === false ? 0.65 : 1,
                boxShadow: '0 4px 12px rgba(243,112,33,0.22)'
              }}
            >
              Allow
            </button>
          )}
        </div>

        {/* Crucial Email Alerts */}
        <div style={{
          background: 'var(--heritage-card)',
          border: '1px solid var(--heritage-line)',
          borderRadius: '14px',
          padding: '14px 18px',
          boxShadow: 'var(--heritage-shadow)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Mail size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--heritage-ink)', fontWeight: 800 }}>
              Crucial Email Alerts
            </h3>
          </div>
          <button
            type="button" role="switch"
            aria-checked={notificationSettings?.email_crucial_enabled ?? true}
            onClick={handleToggleCrucialEmail}
            disabled={updatingEmail || !notificationSettings}
            style={{
              width: '48px', height: '28px', borderRadius: '9999px', border: 'none',
              background: notificationSettings?.email_crucial_enabled ?? true ? '#10b981' : '#cbd5e1',
              cursor: updatingEmail ? 'default' : 'pointer',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              opacity: updatingEmail || !notificationSettings ? 0.65 : 1
            }}
          >
            <span style={{
              position: 'absolute', top: '4px',
              left: notificationSettings?.email_crucial_enabled ?? true ? '24px' : '4px',
              width: '20px', height: '20px', borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
              boxShadow: '0 1px 4px rgba(15,23,42,0.25)'
            }} />
          </button>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────── */}

      <div className="notifications-stats-grid">
        {[
          { label: 'Total', value: notifications.length, color: '#64748b', bg: 'rgba(100,116,139,0.06)' },
          { label: 'Unread', value: unreadCount, color: 'var(--primary-color)', bg: 'rgba(243,112,33,0.07)' },
          { label: 'Success', value: successCount, color: '#10b981', bg: 'rgba(16,185,129,0.07)' },
          { label: 'Alerts', value: alertCount, color: '#f59e0b', bg: 'rgba(245,158,11,0.07)' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '20px', background: 'var(--heritage-card)',
            border: '1px solid var(--heritage-line)',
            borderRadius: '16px', boxShadow: 'var(--heritage-shadow)',
            display: 'flex', flexDirection: 'column', gap: '8px',
            transition: 'all 0.2s'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--heritage-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
            <span style={{ fontSize: '2.2rem', fontWeight: 850, color: s.color, lineHeight: 1 }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {filterTabs.map(tab => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '9px 20px',
                borderRadius: '9999px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: isActive ? 'none' : '1.5px solid var(--heritage-line)',
                background: isActive ? 'var(--primary-gradient)' : 'var(--heritage-card)',
                color: isActive ? 'white' : 'var(--heritage-ink)',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 4px 12px rgba(243,112,33,0.2)' : 'none',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
              onMouseOver={(e) => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.color = 'var(--primary-color)'; } }}
              onMouseOut={(e) => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--heritage-line)'; e.currentTarget.style.color = 'var(--heritage-ink)'; } }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(243,112,33,0.1)',
                  color: isActive ? 'white' : 'var(--primary-color)',
                  borderRadius: '9999px', padding: '1px 8px',
                  fontSize: '0.72rem', fontWeight: 800
                }}>{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Notification List ─────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              padding: '24px', background: 'var(--heritage-card)',
              border: '1px solid var(--heritage-line)', borderRadius: '16px',
              display: 'flex', gap: '16px', animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '6px', width: '35%' }} />
                <div style={{ height: '12px', background: '#f8fafc', borderRadius: '6px', width: '75%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          background: 'var(--heritage-card)', border: '1px solid var(--heritage-line)',
          borderRadius: '20px', boxShadow: 'var(--heritage-shadow)'
        }}>
          <div style={{
            width: '70px', height: '70px', borderRadius: '50%',
            background: 'rgba(100,116,139,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <BellOff size={32} style={{ color: '#94a3b8' }} />
          </div>
          <h3 style={{ color: 'var(--heritage-ink)', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px', fontFamily: 'var(--font-title)' }}>
            {filter === 'unread' ? "You're all caught up!" : "No Notifications Here"}
          </h3>
          <p style={{ color: 'var(--heritage-muted)', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
            {filter === 'unread' ? "All your notifications have been read." : "There are no notifications matching this filter."}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((notif) => {
            const cfg = typeConfig[notif.type] || typeConfig.info;
            const IconComp = cfg.icon;

            return (
              <div
                key={notif.id}
                onClick={async () => {
                  if (!notif.read) await markOneRead(notif.id);
                  const route = getRouteForNotification(notif);
                  if (route && onNavigate) onNavigate(route);
                }}
                className={`notification-card ${notif.read ? '' : 'unread'}`}
              >
                {/* Circular Gradient Icon Badge */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: cfg.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: cfg.color, flexShrink: 0
                }}>
                  <IconComp size={20} strokeWidth={2} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
                    <h4 style={{
                      margin: 0, fontSize: '0.95rem', fontWeight: 800,
                      color: 'var(--heritage-ink)', fontFamily: 'var(--font-title)'
                    }}>
                      {notif.title}
                      {!notif.read && (
                        <span style={{
                          display: 'inline-block', width: '7px', height: '7px',
                          borderRadius: '50%', background: 'var(--primary-color)',
                          marginLeft: '8px', verticalAlign: 'middle'
                        }} />
                      )}
                    </h4>
                    <span style={{ fontSize: '0.76rem', color: 'var(--heritage-muted)', whiteSpace: 'nowrap', fontWeight: 600, flexShrink: 0 }}>
                      {timeAgo(notif.created_at)}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--heritage-muted)', lineHeight: 1.5 }}>
                    {notif.body}
                  </p>

                  {/* Action buttons for pending connection requests */}
                  {notif.title === "New Connection Request" && (
                    <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const status = processedRequests[notif.id];
                        if (status === 'accepted') {
                          return (
                            <span style={{
                              fontSize: '0.8rem', color: '#10b981', fontWeight: 700,
                              background: 'rgba(16,185,129,0.08)',
                              border: '1px solid rgba(16,185,129,0.2)',
                              padding: '5px 12px', borderRadius: '8px',
                              display: 'inline-flex', alignItems: 'center', gap: '5px'
                            }}>
                              <CheckCircle2 size={13} /> Connected
                            </span>
                          );
                        }
                        if (status === 'declined') {
                          return (
                            <span style={{
                              fontSize: '0.8rem', color: 'var(--heritage-muted)', fontWeight: 700,
                              background: 'rgba(0,0,0,0.04)',
                              border: '1px solid var(--heritage-line)',
                              padding: '5px 12px', borderRadius: '8px',
                              display: 'inline-flex', alignItems: 'center'
                            }}>
                              Declined
                            </span>
                          );
                        }
                        const matchedRequest = findPendingConnectionRequest(notif, pendingRequests);
                        if (!matchedRequest) {
                          return (
                            <span style={{
                              fontSize: '0.8rem', color: 'var(--heritage-muted)', fontWeight: 700,
                              background: 'rgba(0,0,0,0.04)', border: '1px solid var(--heritage-line)',
                              padding: '5px 12px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center'
                            }}>
                              Processed
                            </span>
                          );
                        }
                        const isProcessing = processingIds[matchedRequest.id];
                        return (
                          <>
                            <button
                              disabled={!!isProcessing}
                              onClick={async (e) => { e.stopPropagation(); await handleRespond(notif.id, matchedRequest, 'accept'); }}
                              style={{
                                padding: '7px 18px', fontSize: '0.82rem', borderRadius: '9999px', border: 'none',
                                color: 'white', cursor: 'pointer', fontWeight: 700,
                                background: 'var(--primary-gradient)',
                                boxShadow: '0 3px 8px rgba(243,112,33,0.2)',
                                opacity: isProcessing ? 0.7 : 1, transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => { if (!isProcessing) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                              Confirm
                            </button>
                            <button
                              disabled={!!isProcessing}
                              onClick={async (e) => { e.stopPropagation(); await handleRespond(notif.id, matchedRequest, 'decline'); }}
                              style={{
                                padding: '7px 18px', fontSize: '0.82rem', borderRadius: '9999px',
                                border: '1.5px solid var(--heritage-line)', background: 'var(--heritage-card)',
                                color: 'var(--heritage-ink)', cursor: 'pointer', fontWeight: 700,
                                opacity: isProcessing ? 0.7 : 1, transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => { if (!isProcessing) { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; } }}
                              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--heritage-line)'; e.currentTarget.style.color = 'var(--heritage-ink)'; }}
                            >
                              Decline
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer — All Caught Up ────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', gap: '10px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: 'var(--primary-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            boxShadow: '0 4px 12px rgba(243,112,33,0.2)'
          }}>
            <Sparkles size={18} />
          </div>
          <p style={{ color: 'var(--heritage-muted)', fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>
            You've seen all {filter === 'all' ? '' : `${filter} `}notifications
          </p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
