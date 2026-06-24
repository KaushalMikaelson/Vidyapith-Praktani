"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, CheckCheck, RefreshCw, CheckCircle2, AlertTriangle, Info, BellOff
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
  const b = body.toLowerCase();
  
  if (t.includes('message') || t.includes('dm') || t.includes('chat')) {
    return 'messages';
  }
  if (t.includes('mentorship') || t.includes('mentee') || t.includes('mentor')) {
    return 'mentorship';
  }
  if (t.includes('job') || t.includes('career') || t.includes('application')) {
    return 'jobs';
  }
  if (t.includes('event') || t.includes('rsvp') || t.includes('reunion')) {
    return 'events';
  }
  if (t.includes('donation') || t.includes('tax receipt') || t.includes('contribute')) {
    return 'donations';
  }
  if (t.includes('connection') || t.includes('connect')) {
    return 'directory';
  }
  if (t.includes('registration') || t.includes('verification request') || t.includes('applicant')) {
    return 'admin';
  }
  if (t.includes('verification approved') || t.includes('approved')) {
    return 'profile';
  }
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
    setProcessingIds(prev => ({ ...prev, [targetUserId]: true }));
    try {
      await apiFetch('/directory/connections/respond', {
        method: 'POST',
        body: JSON.stringify({ targetId: targetUserId, action })
      });
      
      setProcessedRequests(prev => ({ ...prev, [notificationId]: action === 'accept' ? 'accepted' : 'declined' }));
      setPendingRequests(prev => prev.filter(req => req.id !== targetUserId));
      
      // Mark notification as read
      await markOneRead(notificationId);
      
      if (action === 'accept') {
        showToast("Connection request accepted!", "success");
      } else {
        showToast("Connection request declined.", "info");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to respond to connection request", "danger");
    } finally {
      setProcessingIds(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

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

  const filterTabs: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'success', label: 'Success' },
    { id: 'alert', label: 'Alerts' },
    { id: 'info', label: 'Info' },
  ];

  if (!currentUser) return null;

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '24px 0 40px' }}>
      
      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(236, 72, 153, 0.2)'
          }}>
            <Bell size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
              Notifications
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
              {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : "You're all caught up!"}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadNotifications}
            className="btn-refresh"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '9999px',
              fontSize: '0.88rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#475569',
              cursor: 'pointer',
              fontWeight: 700,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '9999px',
                fontSize: '0.88rem',
                background: 'linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 700,
                opacity: markingAll ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(236, 72, 153, 0.2)'
              }}
            >
              <CheckCheck size={16} />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: notifications.length, highlight: false },
          { label: 'Unread', value: unreadCount, highlight: false },
          { label: 'Success', value: successCount, highlight: true },
          { label: 'Alerts', value: alertCount, highlight: false },
        ].map(s => (
          <div key={s.label} className="sidebar-widget-card" style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
            <span style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: s.highlight ? '#ec4899' : '#1e293b',
              lineHeight: 1.1
            }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Filter Pills ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {filterTabs.map(tab => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`directory-tab-pill ${isActive ? 'active' : 'inactive'}`}
              style={{
                padding: '8px 20px',
                borderRadius: '9999px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: isActive ? 'none' : '1px solid #e2e8f0',
                background: isActive ? '#1e293b' : '#ffffff',
                color: isActive ? '#ffffff' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Notification List ─────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2].map(i => (
            <div key={i} style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              gap: '16px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f1f5f9', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '8px', width: '30%' }} />
                <div style={{ height: '12px', background: '#f8fafc', borderRadius: '4px', width: '70%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px'
        }}>
          <BellOff size={44} style={{ color: '#94a3b8', marginBottom: '16px' }} />
          <h3 style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px' }}>
            No Notifications Found
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
            {filter === 'unread' ? "You've read all your notifications." : "There are no notifications in this category."}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((notif) => {
            const isSuccess = notif.type === 'success';
            const isAlert = notif.type === 'alert';
            
            return (
              <div
                key={notif.id}
                onClick={async () => {
                  if (!notif.read) {
                    await markOneRead(notif.id);
                  }
                  const route = getRouteForNotification(notif.title, notif.body);
                  if (route && onNavigate) {
                    onNavigate(route);
                  }
                }}
                className={`notification-card ${notif.read ? 'read' : 'unread'}`}
              >
                {/* Circular Gradient Icon Badge */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: isAlert 
                    ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' 
                    : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  flexShrink: 0
                }}>
                  {isAlert ? <AlertTriangle size={18} /> : isSuccess ? <CheckCircle2 size={18} /> : <Info size={18} />}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#1e293b'
                  }}>
                    {notif.title}
                  </h4>
                  <p style={{
                    margin: '4px 0 0',
                    fontSize: '0.88rem',
                    color: '#64748b',
                    lineHeight: 1.4
                  }}>
                    {notif.body}
                  </p>

                  {/* Action buttons for pending connection requests */}
                  {notif.title === "New Connection Request" && (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const status = processedRequests[notif.id];
                        if (status === 'accepted') {
                          return (
                            <span style={{ 
                              fontSize: '0.78rem', 
                              color: '#16a34a', 
                              fontWeight: 700, 
                              background: 'rgba(22,163,74,0.08)', 
                              padding: '4px 10px', 
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}>
                              ✓ Connected
                            </span>
                          );
                        }
                        if (status === 'declined') {
                          return (
                            <span style={{ 
                              fontSize: '0.78rem', 
                              color: '#64748b', 
                              fontWeight: 700, 
                              background: 'rgba(0,0,0,0.04)', 
                              padding: '4px 10px', 
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}>
                              Declined
                            </span>
                          );
                        }
                        
                        const matchedRequest = pendingRequests.find(req => notif.body.includes(req.full_name));
                        if (!matchedRequest) {
                          return (
                            <span style={{ 
                              fontSize: '0.78rem', 
                              color: '#475569', 
                              fontWeight: 700, 
                              background: 'rgba(0,0,0,0.04)', 
                              padding: '4px 10px', 
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center'
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
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleRespond(notif.id, matchedRequest.id, 'accept');
                              }}
                              style={{
                                padding: '6px 16px',
                                fontSize: '0.8rem',
                                borderRadius: '8px',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 700,
                                background: 'linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)',
                                boxShadow: '0 2px 4px rgba(236, 72, 153, 0.15)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: isProcessing ? 0.7 : 1
                              }}
                            >
                              Confirm
                            </button>
                            <button
                              disabled={!!isProcessing}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleRespond(notif.id, matchedRequest.id, 'decline');
                              }}
                              style={{
                                padding: '6px 16px',
                                fontSize: '0.8rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#64748b',
                                cursor: 'pointer',
                                fontWeight: 700,
                                opacity: isProcessing ? 0.7 : 1
                              }}
                            >
                              Decline
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Time */}
                <div style={{
                  fontSize: '0.78rem',
                  color: '#94a3b8',
                  whiteSpace: 'nowrap',
                  marginLeft: 'auto'
                }}>
                  {timeAgo(notif.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── All caught up message ──────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '32px',
          gap: '8px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <CheckCircle2 size={18} />
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>
            You've seen all notifications
          </p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};
