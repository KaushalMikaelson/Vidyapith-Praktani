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
  onNavigate?: (screen: string) => void;
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

export const MessagesScreen: React.FC<MessagesScreenProps> = ({ showToast, onViewProfile, onNavigate }) => {
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
      height: 'calc(100vh - 48px)',
      display: 'flex',
      gap: '20px',
      overflow: 'hidden'
    }}>

      {/* ── LEFT: Conversation List ───────────────────────────── */}
      <div style={{
        width: '320px', flexShrink: 0,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)',
        overflow: 'hidden',
        transform: isMobileConvOpen ? 'translateX(-100%)' : 'none',
        transition: 'transform 0.3s ease'
      }} className="messages-sidebar">

        {/* Sidebar Header */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>Messages</h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => { setShowNewChat(true); loadDirectory(); }}
              title="New Message"
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 10px rgba(236, 72, 153, 0.2)'
              }}
            >
              <Plus size={18} style={{ color: 'white' }} />
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              color: '#64748b', pointerEvents: 'none'
            }} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px 10px 36px',
                background: '#f1f5f9', border: '1px solid #e2e8f0',
                borderRadius: '12px', color: '#1e293b', fontSize: '0.88rem',
                boxSizing: 'border-box', outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {loadingConvs ? (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f1f5f9', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '13px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '6px', width: '60%' }} />
                    <div style={{ height: '11px', background: '#f8fafc', borderRadius: '4px', width: '80%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px', color: '#64748b'
              }}>
                <MessageCircle size={28} />
              </div>
              <h4 style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 6px' }}>
                No messages yet
              </h4>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 20px', lineHeight: 1.4, maxWidth: '200px' }}>
                Start a conversation with alumni or mentors
              </p>
              {!searchQuery && (
                <button
                  onClick={() => { setShowNewChat(true); loadDirectory(); }}
                  className="btn-connect-gradient"
                  style={{
                    padding: '8px 24px', borderRadius: '9999px',
                    fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700
                  }}
                >
                  Start a conversation
                </button>
              )}
            </div>
          ) : (
            filteredConvs.map(conv => {
              const isActive = activePartnerId === conv.partnerId;
              return (
                <div
                  key={conv.partnerId}
                  onClick={() => openConversation(conv.partnerId)}
                  style={{
                    padding: '14px 20px', display: 'flex', gap: '12px', alignItems: 'center',
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: isActive ? 'rgba(236,72,153,0.05)' : 'transparent',
                    borderLeft: isActive ? '3px solid #ec4899' : '3px solid transparent',
                    position: 'relative'
                  }}
                  onMouseEnter={e => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                  }}
                  onMouseLeave={e => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={conv.partnerPhoto}
                      alt={conv.partnerName}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                    />
                    {/* Online dot */}
                    <div style={{
                      position: 'absolute', bottom: '1px', right: '1px',
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: '#48bb78', border: '2px solid #ffffff'
                    }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontWeight: conv.unreadCount > 0 ? 700 : 600,
                        color: '#1e293b', fontSize: '0.88rem',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {conv.partnerName}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', flexShrink: 0, marginLeft: '8px' }}>
                        {timeAgo(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                      <span style={{
                        fontSize: '0.78rem',
                        color: conv.unreadCount > 0 ? '#1e293b' : '#64748b',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        flex: 1
                      }}>
                        {conv.isLastFromMe && <span style={{ color: '#94a3b8' }}>You: </span>}
                        {conv.lastMessage && conv.lastMessage !== '??' ? conv.lastMessage : <em>Start a conversation</em>}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span style={{
                          background: '#ec4899', color: 'white', borderRadius: '20px',
                          padding: '1px 7px', fontSize: '0.68rem', fontWeight: 800, flexShrink: 0, marginLeft: '8px'
                        }}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat View ────────────────────────────────────── */}
      <div style={{
        flex: 1,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)',
        overflow: 'hidden',
        minWidth: 0
      }}>

        {activePartnerId && activePartner ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '14px 24px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', gap: '14px',
              background: '#ffffff'
            }}>
              {/* Mobile back button */}
              <button
                onClick={() => setIsMobileConvOpen(false)}
                className="messages-back-btn"
                style={{
                  display: 'none', background: 'none', border: 'none',
                  color: '#64748b', cursor: 'pointer', padding: '4px'
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
                  background: '#48bb78', border: '2px solid #ffffff'
                }} />
              </div>

              <div style={{ flex: 1 }}>
                <h3
                  style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}
                  onClick={() => onViewProfile(activePartner.id)}
                >
                  {activePartner.full_name}
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
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
                      background: '#ffffff', border: '1px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#64748b', cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#ffffff'}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '2px', background: '#f8fafc' }}>
              {loadingMessages ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={24} style={{ color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'rgba(236,72,153,0.1)', border: '2px solid rgba(236,72,153,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <MessageCircle size={30} style={{ color: '#ec4899' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ color: '#1e293b', margin: '0 0 6px', fontSize: '1rem', fontWeight: 800 }}>
                      No messages yet
                    </h4>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                      Say hello to {activePartner.full_name}!
                    </p>
                  </div>
                </div>
              ) : (
                messageGroups.map((group, gi) => (
                  <div key={gi}>
                    {/* Date separator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 12px' }}>
                      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                      <span style={{
                        fontSize: '0.72rem', color: '#64748b', fontWeight: 600,
                        background: '#ffffff', padding: '3px 10px', borderRadius: '20px',
                        border: '1px solid #e2e8f0'
                      }}>
                        {group.date}
                      </span>
                      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
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
                            {/* Avatar */}
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

                             <div 
                              className="msg-bubble-wrap"
                              style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}
                             >
                               <div style={{
                                 padding: '10px 15px',
                                 borderRadius: isMe
                                   ? `16px 16px ${isLast ? '4px' : '16px'} 16px`
                                   : `16px 16px 16px ${isLast ? '4px' : '16px'}`,
                                 background: isMe
                                   ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)'
                                   : '#ffffff',
                                 border: isMe ? 'none' : '1px solid #e2e8f0',
                                 color: isMe ? 'white' : '#1e293b',
                                 fontSize: '0.88rem',
                                 lineHeight: 1.5,
                                 boxShadow: isMe ? '0 2px 8px rgba(236,72,153,0.15)' : 'none'
                               }}>
                                 {msg.content}
                               </div>
                               <div className="msg-meta-row" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', transition: 'opacity 0.2s' }}>
                                 <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                   {formatMessageTime(msg.created_at)}
                                 </span>
                                 {isMe && (
                                   msg.read 
                                     ? <CheckCheck size={11} style={{ color: '#ec4899' }} /> 
                                     : <Check size={11} style={{ color: '#94a3b8' }} />
                                 )}
                               </div>
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
              padding: '14px 20px', borderTop: '1px solid #e2e8f0',
              background: '#ffffff'
            }}>
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '6px',
                  padding: '10px 14px', marginBottom: '10px',
                  background: '#ffffff', borderRadius: '12px',
                  border: '1px solid #e2e8f0'
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
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f1f5f9'}
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
                    background: showEmojiPicker ? 'rgba(236,72,153,0.08)' : 'none',
                    border: 'none', color: '#64748b', cursor: 'pointer',
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
                    background: '#f1f5f9', border: '1px solid #e2e8f0',
                    borderRadius: '24px', color: '#1e293b', fontSize: '0.88rem',
                    outline: 'none', transition: 'all 0.2s'
                  }}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = '#8b5cf6'}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = '#e2e8f0'}
                />

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: messageText.trim()
                      ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)'
                      : '#f1f5f9',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: messageText.trim() ? 'pointer' : 'default',
                    transition: 'all 0.2s', flexShrink: 0,
                    boxShadow: messageText.trim() ? '0 4px 10px rgba(236, 72, 153, 0.2)' : 'none'
                  }}
                >
                  {sending
                    ? <Loader2 size={16} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                    : <Send size={16} style={{ color: messageText.trim() ? 'white' : '#94a3b8' }} />
                  }
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No conversation selected (Matches target screenshot exactly) */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '40px'
          }}>
            {/* Gradient square message bubble icon */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '20px',
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(236,72,153,0.15)'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ color: '#1e293b', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px' }}>
                Your Messages
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 28px', lineHeight: 1.5, maxWidth: '400px' }}>
                Send private messages to alumni, mentors, and batchmates. Start meaningful conversations and grow your network.
              </p>
              <button
                onClick={() => { setShowNewChat(true); loadDirectory(); }}
                className="btn-connect-gradient"
                style={{
                  padding: '12px 28px', borderRadius: '9999px', fontWeight: 700,
                  fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(236, 72, 153, 0.2)'
                }}
              >
                <Plus size={16} />
                New Conversation
              </button>
            </div>

            {/* Tips links row */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '16px' }}>
              {[
                { label: 'Connect with mentors', icon: 'Connect', route: 'mentorship' },
                { label: 'Reach out to batchmates', icon: 'Batch', route: 'directory' },
                { label: 'Explore job referrals', icon: 'Jobs', route: 'jobs' },
              ].map(tip => (
                <div 
                  key={tip.label}
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate(tip.route);
                    } else {
                      setShowNewChat(true);
                      loadDirectory();
                    }
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '9999px',
                    background: '#f1f5f9',
                    fontSize: '0.82rem',
                    color: '#475569',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#e2e8f0'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#f1f5f9'}
                >
                  {tip.icon === 'Connect' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                  ) : tip.icon === 'Batch' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  )}
                  <span>{tip.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── New Chat Modal ────────────────────────────────────── */}
      {showNewChat && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: '#ffffff', border: '1px solid #e2e8f0',
            borderRadius: '20px', padding: '28px', width: '480px', maxWidth: '95vw',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                New Conversation
              </h3>
              <button
                onClick={() => { setShowNewChat(false); setDirSearch(''); }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search size={15} style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                color: '#64748b', pointerEvents: 'none'
              }} />
              <input
                type="text"
                autoFocus
                placeholder="Search alumni by name or profession..."
                value={dirSearch}
                onChange={e => setDirSearch(e.target.value)}
                style={{
                  width: '100%', padding: '11px 12px 11px 36px',
                  background: '#f1f5f9', border: '1px solid #e2e8f0',
                  borderRadius: '12px', color: '#1e293b', fontSize: '0.88rem',
                  boxSizing: 'border-box', outline: 'none'
                }}
              />
            </div>

            {/* Directory list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {loadingDir ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading alumni...</p>
                </div>
              ) : filteredDir.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
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
                      cursor: 'pointer', transition: 'all 0.15s',
                      border: '1px solid transparent'
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(236,72,153,0.04)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(236,72,153,0.08)';
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
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{user.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Class of {user.batch_year} · {user.profession} at {user.company}
                      </div>
                    </div>
                    <ArrowRight size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
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
        .msg-bubble-wrap .msg-meta-row { opacity: 0; }
        .msg-bubble-wrap:hover .msg-meta-row { opacity: 1; }
        @media (max-width: 768px) {
          .messages-sidebar { position: absolute; width: 100% !important; z-index: 10; transform: none !important; }
          .messages-back-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
};
