"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, CheckCheck, Trash2, Filter, RefreshCw,
  Heart, MessageCircle, UserPlus, Award, Briefcase,
  AlertTriangle, Info, CheckCircle2, ChevronRight, X,
  BellOff, Sparkles, Calendar, Gift, Megaphone
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface NotificationsScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
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

const getNotifIcon = (type: string, title: string) => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('message') || lowerTitle.includes('chat')) return MessageCircle;
  if (lowerTitle.includes('like') || lowerTitle.includes('heart')) return Heart;
  if (lowerTitle.includes('connect') || lowerTitle.includes('follow')) return UserPlus;
  if (lowerTitle.includes('job') || lowerTitle.includes('career')) return Briefcase;
  if (lowerTitle.includes('event') || lowerTitle.includes('reunion')) return Calendar;
  if (lowerTitle.includes('donation') || lowerTitle.includes('receipt')) return Gift;
  if (lowerTitle.includes('mentorship') || lowerTitle.includes('mentor')) return Sparkles;
  if (lowerTitle.includes('achievement') || lowerTitle.includes('award')) return Award;
  if (lowerTitle.includes('announcement') || lowerTitle.includes('urgent')) return Megaphone;
  if (type === 'success') return CheckCircle2;
  if (type === 'alert') return AlertTriangle;
  return Info;
};

const getNotifColor = (type: string) => {
  if (type === 'success') return { bg: 'rgba(72,187,120,0.15)', icon: '#48bb78', border: 'rgba(72,187,120,0.3)' };
  if (type === 'alert') return { bg: 'rgba(252,129,129,0.15)', icon: '#fc8181', border: 'rgba(252,129,129,0.3)' };
  return { bg: 'rgba(66,153,225,0.15)', icon: '#63b3ed', border: 'rgba(66,153,225,0.3)' };
};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ showToast }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/notifications');
      setNotifications(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load notifications', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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

  const filterTabs: { id: FilterType; label: string; count?: number; color?: string }[] = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount, color: '#63b3ed' },
    { id: 'success', label: 'Success', count: successCount, color: '#48bb78' },
    { id: 'alert', label: 'Alerts', count: alertCount, color: '#fc8181' },
    { id: 'info', label: 'Info', count: infoCount, color: '#63b3ed' },
  ];

  if (!currentUser) return null;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 0 40px' }}>
      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,122,26,0.12) 0%, rgba(212,175,55,0.08) 100%)',
        border: '1px solid rgba(255,122,26,0.2)',
        borderRadius: '20px',
        padding: '28px 32px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: '-30px', right: '-30px',
          width: '120px', height: '120px',
          background: 'radial-gradient(circle, rgba(255,122,26,0.25), transparent)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--primary-color), var(--accent-gold))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(255,122,26,0.4)'
            }}>
              <Bell size={24} style={{ color: 'white' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2 }}>
                Notifications
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '4px 0 0' }}>
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                  : 'You\'re all caught up!'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={loadNotifications}
              title="Refresh"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', borderRadius: '10px', fontSize: '0.82rem',
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px', borderRadius: '10px', fontSize: '0.82rem',
                  background: 'linear-gradient(135deg, var(--primary-color), var(--accent-gold))',
                  border: 'none', color: 'white', cursor: 'pointer', fontWeight: 600,
                  opacity: markingAll ? 0.7 : 1
                }}
              >
                <CheckCheck size={14} />
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: notifications.length, color: 'rgba(255,255,255,0.6)' },
            { label: 'Unread', value: unreadCount, color: '#63b3ed' },
            { label: 'Success', value: successCount, color: '#48bb78' },
            { label: 'Alerts', value: alertCount, color: '#fc8181' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', padding: '8px 16px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '6px',
        border: '1px solid var(--border-color)'
      }}>
        {filterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '0.82rem',
              fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              background: filter === tab.id
                ? `linear-gradient(135deg, var(--primary-color), var(--accent-gold))`
                : 'transparent',
              color: filter === tab.id ? 'white' : 'var(--text-secondary)',
              border: 'none',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{
                background: filter === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                borderRadius: '20px', padding: '1px 7px', fontSize: '0.72rem', fontWeight: 800,
                color: filter === tab.id ? 'white' : (tab.color || 'var(--text-muted)')
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Notification List ─────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
              borderRadius: '16px', padding: '20px 24px', display: 'flex', gap: '16px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '8px', width: '60%' }} />
                <div style={{ height: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', width: '85%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
          borderRadius: '20px'
        }}>
          <BellOff size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '8px' }}>
            {filter === 'unread' ? 'No unread notifications' : 'No notifications here'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {filter === 'unread' ? "You've read everything — great job staying on top of things!" : "Nothing to show in this category."}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((notif, idx) => {
            const colors = getNotifColor(notif.type);
            const IconComponent = getNotifIcon(notif.type, notif.title);

            return (
              <div
                key={notif.id}
                onClick={() => !notif.read && markOneRead(notif.id)}
                style={{
                  background: notif.read ? 'rgba(255,255,255,0.02)' : colors.bg,
                  border: `1px solid ${notif.read ? 'var(--border-color)' : colors.border}`,
                  borderRadius: '16px', padding: '18px 22px',
                  display: 'flex', alignItems: 'flex-start', gap: '16px',
                  cursor: notif.read ? 'default' : 'pointer',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  animation: idx < 3 ? `slideIn 0.3s ease ${idx * 0.05}s both` : undefined
                }}
                onMouseEnter={e => {
                  if (!notif.read) (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                }}
              >
                {/* Unread dot */}
                {!notif.read && (
                  <div style={{
                    position: 'absolute', top: '18px', right: '18px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: colors.icon, boxShadow: `0 0 6px ${colors.icon}`
                  }} />
                )}

                {/* Icon */}
                <div style={{
                  width: '46px', height: '46px', borderRadius: '14px',
                  background: notif.read ? 'rgba(255,255,255,0.05)' : colors.bg,
                  border: `1px solid ${notif.read ? 'rgba(255,255,255,0.08)' : colors.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <IconComponent
                    size={20}
                    style={{ color: notif.read ? 'var(--text-muted)' : colors.icon }}
                  />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <h4 style={{
                      margin: 0, fontSize: '0.92rem', fontWeight: notif.read ? 600 : 700,
                      color: notif.read ? 'var(--text-secondary)' : 'white',
                      lineHeight: 1.3
                    }}>
                      {notif.title}
                    </h4>
                    <span style={{
                      fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0,
                      fontWeight: 500, marginTop: '2px'
                    }}>
                      {timeAgo(notif.created_at)}
                    </span>
                  </div>
                  <p style={{
                    margin: '6px 0 0', fontSize: '0.84rem',
                    color: notif.read ? 'var(--text-muted)' : 'var(--text-secondary)',
                    lineHeight: 1.5
                  }}>
                    {notif.body}
                  </p>
                  {!notif.read && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.72rem', color: colors.icon, fontWeight: 700 }}>
                        Tap to mark as read
                      </span>
                      <ChevronRight size={10} style={{ color: colors.icon }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── All caught up message ──────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div style={{
          textAlign: 'center', marginTop: '32px',
          padding: '20px', borderTop: '1px solid var(--border-color)'
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            🏵️ You've seen all {filter === 'all' ? '' : filter + ' '}notifications
          </p>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};
