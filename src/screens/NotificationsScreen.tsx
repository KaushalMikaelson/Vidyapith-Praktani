"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, CheckCheck, RefreshCw, CheckCircle2, AlertTriangle, Info, BellOff, Sparkles
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

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
  created_at: string;
}

const getRouteForNotification = (title: string, body: string): string | null => {
  const t = title.toLowerCase();
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
      showToast(err.message || 'Failed to load notifications', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast, loadPendingRequests]);

  const handleRespond = async (notificationId: string, targetUserId: string, action: 'accept' | 'decline') => {
    setProcessedRequests(prev => ({ ...prev, [notificationId]: action === 'accept' ? 'accepted' : 'declined' }));
    setPendingRequests(prev => prev.filter(req => req.id !== targetUserId));
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    if (action === 'accept') showToast("Connection request accepted!", "success");
    else showToast("Connection request declined.", "info");
    try {
      await Promise.all([
        apiFetch('/directory/connections/respond', { method: 'POST', body: JSON.stringify({ targetId: targetUserId, action }) }),
        apiFetch(`/notifications/${notificationId}/read`, { method: 'POST' })
      ]);
    } catch (err: any) {
      showToast(err.message || "Failed to respond to connection request", "danger");
    }
  };

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

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

  if (!currentUser) return null;

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '28px 16px 48px', animation: 'fadeIn 0.35s ease-out' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px',
            background: 'var(--primary-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 8px 20px rgba(243,112,33,0.25)'
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

        <div style={{ display: 'flex', gap: '10px' }}>
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

      {/* ── Stats Cards ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
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
                  const route = getRouteForNotification(notif.title, notif.body);
                  if (route && onNavigate) onNavigate(route);
                }}
                style={{
                  background: notif.read ? 'var(--heritage-card)' : '#fffcf9',
                  border: `1px solid ${notif.read ? 'var(--heritage-line)' : 'rgba(243,112,33,0.2)'}`,
                  borderLeft: notif.read ? '1px solid var(--heritage-line)' : '4px solid var(--primary-color)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  display: 'flex', alignItems: 'flex-start', gap: '16px',
                  cursor: 'pointer', position: 'relative',
                  transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: notif.read ? 'var(--heritage-shadow)' : '0 4px 14px rgba(243,112,33,0.08)'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.06)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = notif.read ? 'var(--heritage-shadow)' : '0 4px 14px rgba(243,112,33,0.08)'; }}
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
                        const matchedRequest = pendingRequests.find(req => notif.body.includes(req.full_name));
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
                              onClick={async (e) => { e.stopPropagation(); await handleRespond(notif.id, matchedRequest.id, 'accept'); }}
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
                              onClick={async (e) => { e.stopPropagation(); await handleRespond(notif.id, matchedRequest.id, 'decline'); }}
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
