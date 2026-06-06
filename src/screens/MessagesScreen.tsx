"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Search, MessageCircle, ChevronLeft, Phone, Video,
  MoreHorizontal, Smile, Paperclip, CheckCheck, Check,
  Users, Plus, UserPlus, Circle, ArrowRight, Loader2,
  Star, Archive, X
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface MessagesScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerPhoto: string;
  partnerBatch?: number;
  partnerProfession?: string;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
  isLastFromMe: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface Partner {
  id: string;
  full_name: string;
  profile_photo: string;
  batch_year?: number;
  profession_category?: string;
}

interface DirectoryUser {
  id: string;
  full_name: string;
  profile_photo: string;
  batch_year: number;
  profession: string;
  company: string;
  city: string;
}

const timeAgo = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const formatMessageTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatGroupDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
};

// Group messages by date
const groupByDate = (messages: Message[]) => {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = '';
  messages.forEach(m => {
    const msgDate = new Date(m.created_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ date: formatGroupDate(m.created_at), messages: [m] });
    } else {
      groups[groups.length - 1].messages.push(m);
    }
  });
  return groups;
};

const EMOJI_LIST = ['😊', '❤️', '👍', '🙏', '😂', '🎉', '🔥', '✨', '💯', '🏵️', '👏', '🤝'];

export const MessagesScreen: React.FC<MessagesScreenProps> = ({ showToast, onViewProfile }) => {
  const { currentUser } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activePartner, setActivePartner] = useState<Partner | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [loadingDir, setLoadingDir] = useState(false);
  const [dirSearch, setDirSearch] = useState('');
  const [isMobileConvOpen, setIsMobileConvOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const data = await apiFetch('/messages/conversations');
      setConversations(data);
    } catch (err: any) {
      // If no messages yet, show empty state
      setConversations([]);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const openConversation = async (partnerId: string) => {
    setActivePartnerId(partnerId);
    setIsMobileConvOpen(true);
    setLoadingMessages(true);
    setMessages([]);
    setActivePartner(null);
    try {
      const data = await apiFetch(`/messages/${partnerId}`);
      setMessages(data.messages || []);
      setActivePartner(data.partner);
      // Refresh conversations to clear unread badges
      loadConversations();
    } catch (err: any) {
      showToast('Failed to load conversation.', 'danger');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || !activePartnerId || sending) return;
    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    // Optimistic update
    const optimisticMsg: Message = {
      id: 'opt-' + Date.now(),
      sender_id: currentUser!.id,
      receiver_id: activePartnerId,
      content: text,
      read: false,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await apiFetch(`/messages/${activePartnerId}`, {
        method: 'POST',
        body: JSON.stringify({ content: text })
      });
      // Reload messages to get server-confirmed version
      const data = await apiFetch(`/messages/${activePartnerId}`);
      setMessages(data.messages || []);
      loadConversations();
    } catch (err: any) {
      showToast(err.message || 'Failed to send message.', 'danger');
      // Revert optimistic update
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  const loadDirectory = async () => {
    setLoadingDir(true);
    try {
      const data = await apiFetch('/directory');
      setDirectory(data.filter((u: DirectoryUser) => u.id !== currentUser?.id));
    } catch {}
    finally { setLoadingDir(false); }
  };

  const startNewChat = (user: DirectoryUser) => {
    setShowNewChat(false);
    setDirSearch('');
    // Check if conversation already exists
    const existing = conversations.find(c => c.partnerId === user.id);
    if (existing) {
      openConversation(user.id);
    } else {
      // Create new empty conversation view
      setActivePartnerId(user.id);
      setIsMobileConvOpen(true);
      setMessages([]);
      setActivePartner({
        id: user.id,
        full_name: user.full_name,
        profile_photo: user.profile_photo,
        batch_year: user.batch_year,
        profession_category: user.profession
      });
    }
  };

  const filteredConvs = conversations.filter(c =>
    c.partnerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDir = directory.filter(u =>
    u.full_name.toLowerCase().includes(dirSearch.toLowerCase()) ||
    u.profession?.toLowerCase().includes(dirSearch.toLowerCase())
  );

  const messageGroups = groupByDate(messages);

  if (!currentUser) return null;

  return (
    <div style={{
      height: 'calc(100vh - 40px)',
      display: 'flex',
      background: 'rgba(255,255,255,0.01)',
      border: '1px solid var(--border-color)',
      borderRadius: '20px',
      overflow: 'hidden'
    }}>

      {/* ── LEFT: Conversation List ───────────────────────────── */}
      <div style={{
        width: '340px', flexShrink: 0,
        borderRight: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(0,0,0,0.2)',
        transform: isMobileConvOpen ? 'translateX(-100%)' : 'none',
      }} className="messages-sidebar">

        {/* Sidebar Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>Messages</h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => { setShowNewChat(true); loadDirectory(); }}
              title="New Message"
              style={{
                width: '38px', height: '38px', borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-gold))',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,122,26,0.4)'
              }}
            >
              <Plus size={18} style={{ color: 'white' }} />
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none'
            }} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px 10px 36px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                borderRadius: '12px', color: 'white', fontSize: '0.85rem',
                boxSizing: 'border-box', outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingConvs ? (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '13px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '6px', width: '60%' }} />
                    <div style={{ height: '11px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', width: '80%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <MessageCircle size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                {searchQuery ? 'No conversations found' : 'No messages yet'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => { setShowNewChat(true); loadDirectory(); }}
                  style={{
                    marginTop: '12px', padding: '8px 16px', borderRadius: '8px',
                    background: 'var(--primary-color)', border: 'none',
                    color: 'white', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600
                  }}
                >
                  Start a conversation
                </button>
              )}
            </div>
          ) : (
            filteredConvs.map(conv => (
              <div
                key={conv.partnerId}
                onClick={() => openConversation(conv.partnerId)}
                style={{
                  padding: '14px 20px', display: 'flex', gap: '12px', alignItems: 'center',
                  cursor: 'pointer', transition: 'background 0.15s',
                  background: activePartnerId === conv.partnerId ? 'rgba(255,122,26,0.1)' : 'transparent',
                  borderLeft: activePartnerId === conv.partnerId ? '3px solid var(--primary-color)' : '3px solid transparent',
                  position: 'relative'
                }}
                onMouseEnter={e => {
                  if (activePartnerId !== conv.partnerId)
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  if (activePartnerId !== conv.partnerId)
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={conv.partnerPhoto}
                    alt={conv.partnerName}
                    style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* Online dot (simulated) */}
                  <div style={{
                    position: 'absolute', bottom: '1px', right: '1px',
                    width: '11px', height: '11px', borderRadius: '50%',
                    background: '#48bb78', border: '2px solid var(--bg-dark)'
                  }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontWeight: conv.unreadCount > 0 ? 700 : 600,
                      color: 'white', fontSize: '0.88rem',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {conv.partnerName}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '8px' }}>
                      {timeAgo(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                    <span style={{
                      fontSize: '0.78rem',
                      color: conv.unreadCount > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {conv.isLastFromMe && <span style={{ color: 'var(--text-muted)' }}>You: </span>}
                      {conv.lastMessage || <em>Start a conversation</em>}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span style={{
                        background: 'var(--primary-color)', color: 'white', borderRadius: '20px',
                        padding: '1px 7px', fontSize: '0.68rem', fontWeight: 800, flexShrink: 0, marginLeft: '8px'
                      }}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  {conv.partnerBatch && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      Batch of {conv.partnerBatch}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat View ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {activePartnerId && activePartner ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '14px 24px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', gap: '14px',
              background: 'rgba(0,0,0,0.15)'
            }}>
              {/* Mobile back button */}
              <button
                onClick={() => setIsMobileConvOpen(false)}
                className="messages-back-btn"
                style={{
                  display: 'none', background: 'none', border: 'none',
                  color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px'
                }}
              >
                <ChevronLeft size={20} />
              </button>

              {/* Partner Info */}
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onViewProfile(activePartner.id)}>
                <img
                  src={activePartner.profile_photo}
                  alt={activePartner.full_name}
                  style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', bottom: '1px', right: '1px',
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: '#48bb78', border: '2px solid var(--bg-dark)'
                }} />
              </div>

              <div style={{ flex: 1 }}>
                <h3
                  style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white', cursor: 'pointer' }}
                  onClick={() => onViewProfile(activePartner.id)}
                >
                  {activePartner.full_name}
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#48bb78' }}>
                  {activePartner.profession_category || (activePartner.batch_year ? `Batch of ${activePartner.batch_year}` : 'Active now')}
                </p>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { icon: Phone, label: 'Voice Call' },
                  { icon: Video, label: 'Video Call' },
                  { icon: MoreHorizontal, label: 'Options' }
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    title={label}
                    onClick={() => showToast(`${label} coming soon!`, 'info')}
                    style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {loadingMessages ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={24} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'rgba(255,122,26,0.1)', border: '2px solid rgba(255,122,26,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <MessageCircle size={30} style={{ color: 'var(--primary-color)' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ color: 'white', margin: '0 0 6px', fontSize: '1rem' }}>
                      No messages yet
                    </h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                      Say hello to {activePartner.full_name}!
                    </p>
                  </div>
                </div>
              ) : (
                messageGroups.map((group, gi) => (
                  <div key={gi}>
                    {/* Date separator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 12px' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                      <span style={{
                        fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600,
                        background: 'rgba(255,255,255,0.04)', padding: '3px 10px', borderRadius: '20px',
                        border: '1px solid var(--border-color)'
                      }}>
                        {group.date}
                      </span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                    </div>

                    {/* Messages in group */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {group.messages.map((msg, mi) => {
                        const isMe = msg.sender_id === currentUser.id;
                        const isFirst = mi === 0 || group.messages[mi - 1].sender_id !== msg.sender_id;
                        const isLast = mi === group.messages.length - 1 || group.messages[mi + 1].sender_id !== msg.sender_id;

                        return (
                          <div
                            key={msg.id}
                            style={{
                              display: 'flex',
                              flexDirection: isMe ? 'row-reverse' : 'row',
                              alignItems: 'flex-end',
                              gap: '8px',
                              marginTop: isFirst ? '8px' : '2px',
                              animation: msg.id.startsWith('opt-') ? 'fadeIn 0.2s ease' : undefined
                            }}
                          >
                            {/* Avatar (only for other person's last message in group) */}
                            {!isMe && (
                              <div style={{ width: '28px', flexShrink: 0 }}>
                                {isLast && (
                                  <img
                                    src={activePartner.profile_photo}
                                    alt=""
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                )}
                              </div>
                            )}

                            <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                              <div style={{
                                padding: '10px 15px',
                                borderRadius: isMe
                                  ? `16px 16px ${isLast ? '4px' : '16px'} 16px`
                                  : `16px 16px 16px ${isLast ? '4px' : '16px'}`,
                                background: isMe
                                  ? 'linear-gradient(135deg, var(--primary-color), #ff6b35)'
                                  : 'rgba(255,255,255,0.08)',
                                color: 'white',
                                fontSize: '0.88rem',
                                lineHeight: 1.5,
                                boxShadow: isMe ? '0 2px 8px rgba(255,122,26,0.3)' : 'none'
                              }}>
                                {msg.content}
                              </div>
                              {isLast && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                    {formatMessageTime(msg.created_at)}
                                  </span>
                                  {isMe && (
                                    <CheckCheck size={11} style={{ color: msg.read ? '#48bb78' : 'var(--text-muted)' }} />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div style={{
              padding: '14px 20px', borderTop: '1px solid var(--border-color)',
              background: 'rgba(0,0,0,0.15)'
            }}>
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '6px',
                  padding: '10px 14px', marginBottom: '10px',
                  background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}>
                  {EMOJI_LIST.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { setMessageText(prev => prev + emoji); setShowEmojiPicker(false); inputRef.current?.focus(); }}
                      style={{
                        background: 'none', border: 'none', fontSize: '1.4rem',
                        cursor: 'pointer', padding: '4px', borderRadius: '8px',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* Emoji button */}
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{
                    background: showEmojiPicker ? 'rgba(255,122,26,0.15)' : 'none',
                    border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                    padding: '8px', borderRadius: '10px', transition: 'all 0.15s',
                    fontSize: '1.2rem'
                  }}
                >
                  😊
                </button>

                {/* Text input */}
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Write a message..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  style={{
                    flex: 1, padding: '11px 16px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
                    borderRadius: '24px', color: 'white', fontSize: '0.88rem',
                    outline: 'none', transition: 'border-color 0.2s'
                  }}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(255,122,26,0.5)'}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = 'var(--border-color)'}
                />

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: messageText.trim()
                      ? 'linear-gradient(135deg, var(--primary-color), var(--accent-gold))'
                      : 'rgba(255,255,255,0.06)',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: messageText.trim() ? 'pointer' : 'default',
                    transition: 'all 0.2s', flexShrink: 0,
                    boxShadow: messageText.trim() ? '0 4px 12px rgba(255,122,26,0.4)' : 'none'
                  }}
                >
                  {sending
                    ? <Loader2 size={16} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                    : <Send size={16} style={{ color: messageText.trim() ? 'white' : 'var(--text-muted)' }} />
                  }
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No conversation selected */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px'
          }}>
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%',
              background: 'rgba(255,122,26,0.1)', border: '2px solid rgba(255,122,26,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <MessageCircle size={44} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 8px' }}>
                Your Messages
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 24px', lineHeight: 1.5 }}>
                Connect directly with fellow alumni, batchmates, and mentors.<br />
                Start a new conversation below.
              </p>
              <button
                onClick={() => { setShowNewChat(true); loadDirectory(); }}
                style={{
                  padding: '12px 28px', borderRadius: '12px', fontWeight: 700,
                  background: 'linear-gradient(135deg, var(--primary-color), var(--accent-gold))',
                  border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.9rem',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 20px rgba(255,122,26,0.4)'
                }}
              >
                <Plus size={16} />
                New Conversation
              </button>
            </div>

            {/* Tips */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '16px' }}>
              {[
                { icon: '🤝', text: 'Connect with mentors' },
                { icon: '🎓', text: 'Reach out to batchmates' },
                { icon: '💼', text: 'Explore job referrals' },
              ].map(tip => (
                <div key={tip.text} style={{
                  padding: '10px 16px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                  fontSize: '0.82rem', color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  <span>{tip.icon}</span> {tip.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── New Chat Modal ────────────────────────────────────── */}
      {showNewChat && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-dark)', border: '1px solid var(--border-color)',
            borderRadius: '20px', padding: '28px', width: '500px', maxWidth: '95vw',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>
                New Conversation
              </h3>
              <button
                onClick={() => { setShowNewChat(false); setDirSearch(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search size={15} style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none'
              }} />
              <input
                type="text"
                autoFocus
                placeholder="Search alumni by name or profession..."
                value={dirSearch}
                onChange={e => setDirSearch(e.target.value)}
                style={{
                  width: '100%', padding: '11px 12px 11px 36px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)',
                  borderRadius: '12px', color: 'white', fontSize: '0.88rem',
                  boxSizing: 'border-box', outline: 'none'
                }}
              />
            </div>

            {/* Directory list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {loadingDir ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading alumni...</p>
                </div>
              ) : filteredDir.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  <Users size={28} style={{ marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>No alumni found</p>
                </div>
              ) : (
                filteredDir.slice(0, 20).map(user => (
                  <div
                    key={user.id}
                    onClick={() => startNewChat(user)}
                    style={{
                      padding: '12px 16px', borderRadius: '12px',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      cursor: 'pointer', transition: 'background 0.15s',
                      border: '1px solid transparent'
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,122,26,0.08)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,122,26,0.2)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                    }}
                  >
                    <img
                      src={user.profile_photo}
                      alt={user.full_name}
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>{user.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Batch {user.batch_year} · {user.profession} at {user.company}
                      </div>
                    </div>
                    <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .messages-sidebar { position: absolute; width: 100% !important; z-index: 10; transform: none !important; }
          .messages-back-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
};
