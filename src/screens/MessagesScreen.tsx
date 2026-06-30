"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Search, MessageCircle, ChevronLeft,
  MoreHorizontal, Smile, CheckCheck, Check,
  Users, Plus, UserPlus, Loader2,
  X, Trash2, LogOut, Settings, ChevronRight, Hash
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface MessagesScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
  onNavigate?: (screen: string) => void;
}

// ─── DM Types ─────────────────────────────────────────────────────────────────
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

// ─── Group Types ───────────────────────────────────────────────────────────────
interface Group {
  id: string;
  name: string;
  description: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderName: string;
  memberCount: number;
}
interface GroupMemberDetail {
  userId: string;
  role: string;
  joinedAt: string;
  full_name: string;
  profile_photo: string;
  batch_year: number;
}
interface GroupDetail extends Omit<Group, 'lastMessage' | 'lastMessageAt' | 'lastSenderName' | 'memberCount'> {
  members: GroupMemberDetail[];
  currentUserRole: string;
}
interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  senderName: string;
  senderPhoto: string;
}

// ─── Utilities ─────────────────────────────────────────────────────────────────
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
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const groupByDate = (messages: (Message | GroupMessage)[]) => {
  const groups: { date: string; messages: (Message | GroupMessage)[] }[] = [];
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

/** Colored avatar based on first letter of name */
const GroupAvatar = ({ name, size = 42 }: { name: string; size?: number }) => {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
  const idx = name.charCodeAt(0) % colors.length;
  const bg = colors[idx];
  const fontSize = size * 0.38;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, color: '#fff', fontWeight: 800, fontSize
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

const EMOJI_LIST = ['😊', '❤️', '👍', '🙏', '😂', '🎉', '🔥', '✨', '💯', '🏵️', '👏', '🤝'];

// ─── Main Component ────────────────────────────────────────────────────────────
export const MessagesScreen: React.FC<MessagesScreenProps> = ({ showToast, onViewProfile, onNavigate }) => {
  const { currentUser } = useAuth();

  // Tab: removed — single unified list
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  // ── DM State ──
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
  const [showChatMenu, setShowChatMenu] = useState(false);
  // ── Group State ──
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroupDetail, setActiveGroupDetail] = useState<GroupDetail | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [loadingGroupMsgs, setLoadingGroupMsgs] = useState(false);
  const [groupMessageText, setGroupMessageText] = useState('');
  const [sendingGroupMsg, setSendingGroupMsg] = useState(false);
  const [showGroupEmojiPicker, setShowGroupEmojiPicker] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [isMobileGroupOpen, setIsMobileGroupOpen] = useState(false);

  // Create group form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [memberPickerSearch, setMemberPickerSearch] = useState('');

  // Add members modal state
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [addMemberIds, setAddMemberIds] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const groupMessagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const groupInputRef = useRef<HTMLInputElement>(null);
  const groupPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const scrollGroupToBottom = () => groupMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { scrollGroupToBottom(); }, [groupMessages]);

  // ─── DM: Load conversations ──────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const data = await apiFetch('/messages/conversations');
      setConversations(Array.isArray(data) ? data : []);
    } catch { setConversations([]); }
    finally { setLoadingConvs(false); }
  }, []);

  // ─── DM: Open conversation ───────────────────────────────────────────────────
  const openConversation = useCallback(async (partnerId: string) => {
    setActivePartnerId(partnerId);
    setIsMobileConvOpen(true);
    setLoadingMessages(true);
    setMessages([]);
    try {
      const [convData, messagesData] = await Promise.all([
        apiFetch(`/directory/profile/${partnerId}`),
        apiFetch(`/messages/${partnerId}`)
      ]);
      setActivePartner({
        id: convData.id,
        full_name: convData.full_name,
        profile_photo: convData.profile_photo,
        batch_year: convData.batch_year,
        profession_category: convData.profession
      });
      setMessages(Array.isArray(messagesData) ? messagesData : []);
    } catch { showToast('Failed to load conversation', 'danger'); }
    finally { setLoadingMessages(false); }
  }, [showToast]);

  // ─── DM: Send message ────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!messageText.trim() || !activePartnerId || sending) return;
    const text = messageText.trim();
    setMessageText('');
    setSending(true);
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUser!.id,
      receiver_id: activePartnerId,
      content: text,
      read: false,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    try {
      const saved = await apiFetch(`/messages/${activePartnerId}`, { method: 'POST', body: JSON.stringify({ content: text }) });
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, id: saved.id } : m));
      loadConversations();
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      showToast(err.message || 'Failed to send', 'danger');
    } finally { setSending(false); }
  };

  // ─── DM: Load directory (connections) ───────────────────────────────────────
  const loadDirectory = async () => {
    setLoadingDir(true);
    try {
      const data = await apiFetch('/directory/connections');
      if (!Array.isArray(data)) { showToast('Failed to load connections', 'danger'); setDirectory([]); return; }
      setDirectory(data.filter((u: DirectoryUser) => u.id !== currentUser?.id));
    } catch (err: any) {
      showToast(err?.message || 'Failed to load connections', 'danger');
      setDirectory([]);
    } finally { setLoadingDir(false); }
  };

  const startNewChat = (user: DirectoryUser) => {
    setShowNewChat(false);
    setDirSearch('');
    const existing = conversations.find(c => c.partnerId === user.id);
    if (existing) { openConversation(user.id); }
    else {
      setActivePartnerId(user.id);
      setIsMobileConvOpen(true);
      setMessages([]);
      setActivePartner({ id: user.id, full_name: user.full_name, profile_photo: user.profile_photo, batch_year: user.batch_year, profession_category: user.profession });
    }
  };

  const filteredConvs = conversations.filter(c => c.partnerName.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredDir = directory.filter(u =>
    u.full_name.toLowerCase().includes(dirSearch.toLowerCase()) ||
    u.profession?.toLowerCase().includes(dirSearch.toLowerCase())
  );

  // ─── Groups: Load list ───────────────────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const data = await apiFetch('/groups');
      setGroups(Array.isArray(data) ? data : []);
    } catch { setGroups([]); }
    finally { setLoadingGroups(false); }
  }, []);

  // ─── Groups: Open group ──────────────────────────────────────────────────────
  const openGroup = useCallback(async (groupId: string) => {
    setActiveGroupId(groupId);
    setIsMobileGroupOpen(true);
    setShowGroupInfo(false);
    setGroupMessages([]);
    setLoadingGroupMsgs(true);
    try {
      const [detail, msgs] = await Promise.all([
        apiFetch(`/groups/${groupId}`),
        apiFetch(`/groups/${groupId}/messages`)
      ]);
      setActiveGroupDetail(detail);
      setGroupMessages(Array.isArray(msgs) ? msgs : []);
    } catch { showToast('Failed to load group', 'danger'); }
    finally { setLoadingGroupMsgs(false); }

    // Start polling
    if (groupPollRef.current) clearInterval(groupPollRef.current);
    groupPollRef.current = setInterval(async () => {
      try {
        const msgs = await apiFetch(`/groups/${groupId}/messages`);
        if (Array.isArray(msgs)) setGroupMessages(msgs);
      } catch {}
    }, 5000);
  }, [showToast]);

  // Stop polling when group changes or component unmounts
  useEffect(() => {
    return () => { if (groupPollRef.current) clearInterval(groupPollRef.current); };
  }, []);

  useEffect(() => {
    if (activeGroupId) openGroup(activeGroupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Groups: Send message ────────────────────────────────────────────────────
  const sendGroupMessage = async () => {
    if (!groupMessageText.trim() || !activeGroupId || sendingGroupMsg) return;
    const text = groupMessageText.trim();
    setGroupMessageText('');
    setSendingGroupMsg(true);
    const tempMsg: GroupMessage = {
      id: `temp-${Date.now()}`,
      group_id: activeGroupId,
      sender_id: currentUser!.id,
      content: text,
      created_at: new Date().toISOString(),
      senderName: currentUser?.full_name ?? 'You',
      senderPhoto: currentUser?.profile?.profile_photo ?? ''
    };
    setGroupMessages(prev => [...prev, tempMsg]);
    try {
      const saved = await apiFetch(`/groups/${activeGroupId}/messages`, { method: 'POST', body: JSON.stringify({ content: text }) });
      setGroupMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...saved } : m));
      loadGroups();
    } catch (err: any) {
      setGroupMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      showToast(err.message || 'Failed to send', 'danger');
    } finally { setSendingGroupMsg(false); }
  };

  // ─── Groups: Create ──────────────────────────────────────────────────────────
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) { showToast('Group name is required', 'danger'); return; }
    setCreatingGroup(true);
    try {
      const result = await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName.trim(), description: newGroupDesc.trim(), memberIds: selectedMemberIds })
      });
      showToast(`Group "${result.group.name}" created!`, 'success');
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedMemberIds([]);
      setMemberPickerSearch('');
      await loadGroups();
      openGroup(result.group.id);
      // tab auto-switch removed — unified list shows all
    } catch (err: any) {
      showToast(err.message || 'Failed to create group', 'danger');
    } finally { setCreatingGroup(false); }
  };

  // ─── Groups: Add members ─────────────────────────────────────────────────────
  const handleAddMembers = async () => {
    if (!activeGroupId || addMemberIds.length === 0) return;
    setAddingMembers(true);
    try {
      await apiFetch(`/groups/${activeGroupId}/members`, { method: 'POST', body: JSON.stringify({ memberIds: addMemberIds }) });
      showToast(`${addMemberIds.length} member(s) added!`, 'success');
      setShowAddMembersModal(false);
      setAddMemberIds([]);
      openGroup(activeGroupId);
    } catch (err: any) {
      showToast(err.message || 'Failed to add members', 'danger');
    } finally { setAddingMembers(false); }
  };

  // ─── Groups: Leave ───────────────────────────────────────────────────────────
  const handleLeaveGroup = async () => {
    if (!activeGroupId || !currentUser) return;
    try {
      await apiFetch(`/groups/${activeGroupId}/members/${currentUser.id}`, { method: 'DELETE' });
      showToast('You left the group', 'info');
      setActiveGroupId(null);
      setActiveGroupDetail(null);
      setGroupMessages([]);
      setIsMobileGroupOpen(false);
      if (groupPollRef.current) clearInterval(groupPollRef.current);
      loadGroups();
    } catch (err: any) { showToast(err.message || 'Failed to leave group', 'danger'); }
  };

  // ─── Groups: Delete ──────────────────────────────────────────────────────────
  const handleDeleteGroup = async () => {
    if (!activeGroupId) return;
    if (!window.confirm('Delete this group? All messages will be permanently removed.')) return;
    try {
      await apiFetch(`/groups/${activeGroupId}`, { method: 'DELETE' });
      showToast('Group deleted', 'success');
      setActiveGroupId(null);
      setActiveGroupDetail(null);
      setGroupMessages([]);
      setIsMobileGroupOpen(false);
      if (groupPollRef.current) clearInterval(groupPollRef.current);
      loadGroups();
    } catch (err: any) { showToast(err.message || 'Failed to delete group', 'danger'); }
  };

  // ─── Groups: Remove member ───────────────────────────────────────────────────
  const handleRemoveMember = async (userId: string, name: string) => {
    if (!activeGroupId) return;
    if (!window.confirm(`Remove ${name} from the group?`)) return;
    try {
      await apiFetch(`/groups/${activeGroupId}/members/${userId}`, { method: 'DELETE' });
      showToast(`${name} removed`, 'success');
      openGroup(activeGroupId);
    } catch (err: any) { showToast(err.message || 'Failed to remove member', 'danger'); }
  };

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Connections not already in group (for add members modal)
  const existingMemberIds = new Set(activeGroupDetail?.members.map(m => m.userId) ?? []);
  const nonMembers = directory.filter(u => !existingMemberIds.has(u.id) && u.id !== currentUser?.id);
  const filteredNonMembers = nonMembers.filter(u =>
    u.full_name.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
    u.profession?.toLowerCase().includes(addMemberSearch.toLowerCase())
  );

  // Connections not yet selected (for create group member picker)
  const filteredConnections = directory.filter(u =>
    u.full_name.toLowerCase().includes(memberPickerSearch.toLowerCase()) ||
    u.profession?.toLowerCase().includes(memberPickerSearch.toLowerCase())
  );

  // Initial load
  useEffect(() => {
    loadConversations();
    loadGroups();
    loadDirectory();
  }, [loadConversations, loadGroups]);

  // active panel: 'dm' | 'group' | null
  const activePanel: 'dm' | 'group' | null = activeGroupId ? 'group' : activePartnerId ? 'dm' : null;

  const inputBarStyle: React.CSSProperties = {
    padding: '12px 16px', borderTop: '1px solid #f1f5f9',
    display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff'
  };

  // ─── Render: Left panel header ────────────────────────────────────────────────
  const renderLeftHeader = () => (
    <div style={{ padding: '20px 20px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Messages</h2>
        {/* + dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowPlusMenu(p => !p)}
            title="New message or group"
            style={{ width: 36, height: 36, borderRadius: 10, background: showPlusMenu ? '#ede9fe' : '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: showPlusMenu ? '#6366f1' : '#475569', transition: 'all 0.15s' }}
          >
            <Plus size={18} />
          </button>
          {showPlusMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowPlusMenu(false)} />
              <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 100, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', minWidth: 190, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                <button onClick={() => { setShowNewChat(true); setShowPlusMenu(false); if (directory.length === 0) loadDirectory(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <MessageCircle size={15} style={{ color: '#6366f1' }} /> New Message
                </button>
                <button onClick={() => { setShowCreateGroup(true); setShowPlusMenu(false); if (directory.length === 0) loadDirectory(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <Hash size={15} style={{ color: '#6366f1' }} /> Create Group
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Unified search */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Search messages & groups…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '9px 12px 9px 32px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.83rem', color: '#1e293b', boxSizing: 'border-box', outline: 'none' }}
        />
      </div>
    </div>
  );

  // ─── Render: Unified list (DMs + Groups merged by time) ───────────────────────
  const renderUnifiedList = () => {
    const q = searchQuery.toLowerCase();

    // Build a unified array with type tagging
    const dmItems = conversations
      .filter(c => c.partnerName.toLowerCase().includes(q))
      .map(c => ({ type: 'dm' as const, key: `dm-${c.partnerId}`, sortTime: c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0, data: c }));

    const groupItems = groups
      .filter(g => g.name.toLowerCase().includes(q))
      .map(g => ({ type: 'group' as const, key: `grp-${g.id}`, sortTime: g.lastMessageAt ? new Date(g.lastMessageAt).getTime() : new Date(g.created_at).getTime(), data: g }));

    const allItems = [...dmItems, ...groupItems].sort((a, b) => b.sortTime - a.sortTime);
    const isLoading = loadingConvs && loadingGroups;

    return (
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: '0.82rem' }}>Loading…</p>
          </div>
        ) : allItems.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>
            <MessageCircle size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>{searchQuery ? 'No results found' : 'No messages yet'}</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.76rem' }}>Use + to start a conversation or create a group</p>
          </div>
        ) : allItems.map(item => {
          if (item.type === 'dm') {
            const conv = item.data as Conversation;
            const isActive = activePartnerId === conv.partnerId && !activeGroupId;
            return (
              <div
                key={item.key}
                onClick={() => { setActiveGroupId(null); setActiveGroupDetail(null); openConversation(conv.partnerId); }}
                style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: isActive ? 'rgba(99,102,241,0.06)' : 'transparent', borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent', transition: 'all 0.12s' }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ position: 'relative' }}>
                  <img src={conv.partnerPhoto} alt={conv.partnerName} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                  {conv.unreadCount > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: '#6366f1', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>{conv.unreadCount}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{conv.partnerName}</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', flexShrink: 0 }}>{timeAgo(conv.lastMessageAt)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {conv.isLastFromMe && <CheckCheck size={11} style={{ color: '#94a3b8', flexShrink: 0 }} />}
                    <span style={{ fontSize: '0.78rem', color: conv.unreadCount > 0 ? '#1e293b' : '#94a3b8', fontWeight: conv.unreadCount > 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.lastMessage || 'Start conversation'}</span>
                  </div>
                </div>
              </div>
            );
          } else {
            const group = item.data as Group;
            const isActive = activeGroupId === group.id;
            return (
              <div
                key={item.key}
                onClick={() => { setActivePartnerId(null); setActivePartner(null); openGroup(group.id); setIsMobileGroupOpen(true); }}
                style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: isActive ? 'rgba(99,102,241,0.06)' : 'transparent', borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent', transition: 'all 0.12s' }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <GroupAvatar name={group.name} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', maxWidth: 150 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</span>
                      <span style={{ flexShrink: 0, fontSize: '0.6rem', fontWeight: 700, background: '#ede9fe', color: '#6366f1', padding: '1px 5px', borderRadius: 4 }}>GROUP</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', flexShrink: 0 }}>{timeAgo(group.lastMessageAt)}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {group.lastMessage ? `${group.lastSenderName}: ${group.lastMessage}` : `${group.memberCount} members`}
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
    );
  };

  // ─── Render: DM chat view ─────────────────────────────────────────────────────
  const renderDMChat = () => {
    if (!activePartner) return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#94a3b8' }}>
        <MessageCircle size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: 0 }}>Select a conversation</p>
        <p style={{ fontSize: '0.82rem', margin: '6px 0 0' }}>Choose from your contacts or start a new chat</p>
      </div>
    );

    const grouped = groupByDate(messages);

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12, background: '#ffffff' }}>
          <button onClick={() => { setActivePartnerId(null); setIsMobileConvOpen(false); }} className="messages-back-btn" style={{ display: 'none', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}><ChevronLeft size={20} /></button>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onViewProfile(activePartner.id)}>
            <img src={activePartner.profile_photo} alt={activePartner.full_name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#48bb78', border: '2px solid #fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }} onClick={() => onViewProfile(activePartner.id)}>{activePartner.full_name}</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{activePartner.profession_category || (activePartner.batch_year ? `Batch of ${activePartner.batch_year}` : 'Active now')}</p>
          </div>
          {/* Three-dot menu */}
          <div style={{ position: 'relative' }}>
            <button title="Options" onClick={() => setShowChatMenu(prev => !prev)} style={{ width: 36, height: 36, borderRadius: 10, background: showChatMenu ? '#f1f5f9' : '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', transition: 'all 0.15s' }}>
              <MoreHorizontal size={16} />
            </button>
            {showChatMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowChatMenu(false)} />
                <div style={{ position: 'absolute', top: 44, right: 0, zIndex: 100, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                  {[{ label: 'View Profile', action: () => { onViewProfile(activePartner!.id); setShowChatMenu(false); } }, { label: 'Copy Name', action: () => { navigator.clipboard.writeText(activePartner!.full_name); showToast('Copied!', 'success'); setShowChatMenu(false); } }].map(({ label, action }) => (
                    <button key={label} onClick={action} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 16px', background: 'none', border: 'none', fontSize: '0.88rem', fontWeight: 500, color: '#1e293b', cursor: 'pointer', transition: 'background 0.12s' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>{label}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 2, background: '#f8fafc' }}>
          {loadingMessages ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={24} style={{ color: '#94a3b8', animation: 'spin 1s linear infinite' }} /></div>
          ) : grouped.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <MessageCircle size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No messages yet. Say hello! 👋</p>
            </div>
          ) : grouped.map(group => (
            <div key={group.date}>
              <div style={{ textAlign: 'center', margin: '12px 0' }}>
                <span style={{ background: '#e2e8f0', color: '#64748b', fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{group.date}</span>
              </div>
              {group.messages.map((msg) => {
                const m = msg as Message;
                const isMe = m.sender_id === currentUser?.id;
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{ background: isMe ? '#6366f1' : '#ffffff', color: isMe ? '#fff' : '#1e293b', padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', fontSize: '0.88rem', lineHeight: 1.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', wordBreak: 'break-word' }}>{m.content}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: 2 }}>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{formatMessageTime(m.created_at)}</span>
                        {isMe && (m.read ? <CheckCheck size={11} style={{ color: '#6366f1' }} /> : <Check size={11} style={{ color: '#94a3b8' }} />)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={inputBarStyle}>
          {showEmojiPicker && (
            <div style={{ position: 'absolute', bottom: 70, left: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8, width: 240, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 10 }}>
              {EMOJI_LIST.map(e => <button key={e} onClick={() => { setMessageText(t => t + e); setShowEmojiPicker(false); }} style={{ fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, padding: '2px 4px' }}>{e}</button>)}
            </div>
          )}
          <button onClick={() => setShowEmojiPicker(p => !p)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', flexShrink: 0, padding: 4 }}><span style={{ fontSize: '1.25rem' }}>🙂</span></button>
          <input ref={inputRef} type="text" placeholder="Type a message…" value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} style={{ flex: 1, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20, padding: '10px 16px', fontSize: '0.88rem', color: '#1e293b', outline: 'none' }} />
          <button onClick={sendMessage} disabled={!messageText.trim() || sending} style={{ width: 38, height: 38, borderRadius: '50%', background: messageText.trim() ? '#6366f1' : '#e2e8f0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: messageText.trim() ? 'pointer' : 'default', transition: 'all 0.15s', flexShrink: 0 }}>
            <Send size={15} style={{ color: messageText.trim() ? '#fff' : '#94a3b8', marginLeft: 2 }} />
          </button>
        </div>
      </div>
    );
  };

  // ─── Render: Group chat view ──────────────────────────────────────────────────
  const renderGroupChat = () => {
    if (!activeGroupDetail) return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#94a3b8' }}>
        <Users size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: 0 }}>Select a group</p>
        <p style={{ fontSize: '0.82rem', margin: '6px 0 0' }}>Or create a new group to get started</p>
      </div>
    );

    const isAdmin = activeGroupDetail.currentUserRole === 'admin';
    const grouped = groupByDate(groupMessages);

    // ── Group info panel ──
    if (showGroupInfo) return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12, background: '#fff' }}>
          <button onClick={() => setShowGroupInfo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><ChevronLeft size={20} /></button>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Group Info</h3>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
          {/* Group identity */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <GroupAvatar name={activeGroupDetail.name} size={72} />
            <h2 style={{ margin: '12px 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{activeGroupDetail.name}</h2>
            {activeGroupDetail.description && <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{activeGroupDetail.description}</p>}
            <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>{activeGroupDetail.members.length} members</p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {isAdmin && (
              <button onClick={() => { setShowAddMembersModal(true); if (directory.length === 0) loadDirectory(); setAddMemberSearch(''); setAddMemberIds([]); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #c7d2fe', background: 'rgba(99,102,241,0.06)', color: '#6366f1', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <UserPlus size={14} /> Add Members
              </button>
            )}
            <button onClick={handleLeaveGroup} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #fecaca', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <LogOut size={14} /> Leave Group
            </button>
            {isAdmin && (
              <button onClick={handleDeleteGroup} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #fecaca', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>

          {/* Members list */}
          <h4 style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>Members</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {activeGroupDetail.members.map(member => (
              <div key={member.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#f8fafc' }}>
                <img src={member.profile_photo} alt={member.full_name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>{member.full_name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Batch {member.batch_year || '—'}</div>
                </div>
                {member.role === 'admin' && <span style={{ background: '#6366f1', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>Admin</span>}
                {isAdmin && member.userId !== currentUser?.id && (
                  <button onClick={() => handleRemoveMember(member.userId, member.full_name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }} title="Remove"><X size={14} /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    // ── Group chat messages view ──
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12, background: '#ffffff' }}>
          <button onClick={() => { setActiveGroupId(null); setIsMobileGroupOpen(false); }} className="messages-back-btn" style={{ display: 'none', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}><ChevronLeft size={20} /></button>
          <div style={{ cursor: 'pointer' }} onClick={() => setShowGroupInfo(true)}>
            <GroupAvatar name={activeGroupDetail.name} size={42} />
          </div>
          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setShowGroupInfo(true)}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{activeGroupDetail.name}</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{activeGroupDetail.members.length} members · Tap for info</p>
          </div>
          {/* Group three-dot menu */}
          <div style={{ position: 'relative' }}>
            <button title="Options" onClick={() => setShowGroupMenu(prev => !prev)} style={{ width: 36, height: 36, borderRadius: 10, background: showGroupMenu ? '#f1f5f9' : '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
              <MoreHorizontal size={16} />
            </button>
            {showGroupMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowGroupMenu(false)} />
                <div style={{ position: 'absolute', top: 44, right: 0, zIndex: 100, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', minWidth: 190, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                  {[
                    { label: 'Group Info', icon: <Settings size={14} />, action: () => { setShowGroupInfo(true); setShowGroupMenu(false); } },
                    ...(isAdmin ? [{ label: 'Add Members', icon: <UserPlus size={14} />, action: () => { setShowAddMembersModal(true); setShowGroupMenu(false); if (directory.length === 0) loadDirectory(); } }] : []),
                    { label: 'Leave Group', icon: <LogOut size={14} />, action: () => { setShowGroupMenu(false); handleLeaveGroup(); }, danger: true },
                    ...(isAdmin ? [{ label: 'Delete Group', icon: <Trash2 size={14} />, action: () => { setShowGroupMenu(false); handleDeleteGroup(); }, danger: true }] : [])
                  ].map(({ label, icon, action, danger }: any) => (
                    <button key={label} onClick={action} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '11px 16px', background: 'none', border: 'none', fontSize: '0.88rem', fontWeight: 500, color: danger ? '#ef4444' : '#1e293b', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>{icon}{label}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 2, background: '#f8fafc' }}>
          {loadingGroupMsgs ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={24} style={{ color: '#94a3b8', animation: 'spin 1s linear infinite' }} /></div>
          ) : grouped.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <Hash size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No messages yet. Start the conversation! 👋</p>
            </div>
          ) : grouped.map(group => (
            <div key={group.date}>
              <div style={{ textAlign: 'center', margin: '12px 0' }}>
                <span style={{ background: '#e2e8f0', color: '#64748b', fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{group.date}</span>
              </div>
              {group.messages.map((msg) => {
                const m = msg as GroupMessage;
                const isMe = m.sender_id === currentUser?.id;
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 6, gap: 8 }}>
                    {!isMe && <img src={m.senderPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40'} alt={m.senderName} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', alignSelf: 'flex-end', flexShrink: 0 }} />}
                    <div style={{ maxWidth: '68%' }}>
                      {!isMe && <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6366f1', marginBottom: 2, paddingLeft: 4 }}>{m.senderName}</div>}
                      <div style={{ background: isMe ? '#6366f1' : '#ffffff', color: isMe ? '#fff' : '#1e293b', padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', fontSize: '0.88rem', lineHeight: 1.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', wordBreak: 'break-word' }}>{m.content}</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2, textAlign: isMe ? 'right' : 'left', paddingLeft: isMe ? 0 : 4 }}>{formatMessageTime(m.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={groupMessagesEndRef} />
        </div>

        {/* Input */}
        <div style={inputBarStyle}>
          {showGroupEmojiPicker && (
            <div style={{ position: 'absolute', bottom: 70, left: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8, width: 240, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 10 }}>
              {EMOJI_LIST.map(e => <button key={e} onClick={() => { setGroupMessageText(t => t + e); setShowGroupEmojiPicker(false); }} style={{ fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, padding: '2px 4px' }}>{e}</button>)}
            </div>
          )}
          <button onClick={() => setShowGroupEmojiPicker(p => !p)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', flexShrink: 0, padding: 4 }}><span style={{ fontSize: '1.25rem' }}>🙂</span></button>
          <input ref={groupInputRef} type="text" placeholder="Type a message…" value={groupMessageText} onChange={e => setGroupMessageText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGroupMessage(); } }} style={{ flex: 1, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20, padding: '10px 16px', fontSize: '0.88rem', color: '#1e293b', outline: 'none' }} />
          <button onClick={sendGroupMessage} disabled={!groupMessageText.trim() || sendingGroupMsg} style={{ width: 38, height: 38, borderRadius: '50%', background: groupMessageText.trim() ? '#6366f1' : '#e2e8f0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: groupMessageText.trim() ? 'pointer' : 'default', transition: 'all 0.15s', flexShrink: 0 }}>
            <Send size={15} style={{ color: groupMessageText.trim() ? '#fff' : '#94a3b8', marginLeft: 2 }} />
          </button>
        </div>
      </div>
    );
  };

  // ─── Modal: Create Group ──────────────────────────────────────────────────────
  const renderCreateGroupModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCreateGroup(false)}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '28px', width: 500, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px -15px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Create Group</h3>
          <button onClick={() => setShowCreateGroup(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <input type="text" placeholder="Group name *" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.9rem', color: '#1e293b', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
        <textarea placeholder="Description (optional)" value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} rows={2} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.88rem', color: '#1e293b', outline: 'none', resize: 'none', marginBottom: 16, boxSizing: 'border-box', fontFamily: 'inherit' }} />

        <p style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add members from your connections</p>

        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search connections…" value={memberPickerSearch} onChange={e => setMemberPickerSearch(e.target.value)} style={{ width: '100%', padding: '9px 12px 9px 30px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {selectedMemberIds.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {selectedMemberIds.map(id => {
              const u = directory.find(d => d.id === id);
              return u ? (
                <span key={id} style={{ background: '#ede9fe', color: '#6366f1', padding: '4px 10px 4px 8px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {u.full_name}
                  <button onClick={() => setSelectedMemberIds(prev => prev.filter(x => x !== id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ) : null;
            })}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 220, display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          {loadingDir ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : filteredConnections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: '0.82rem' }}>No connections found</div>
          ) : filteredConnections.map(user => {
            const checked = selectedMemberIds.includes(user.id);
            return (
              <div key={user.id} onClick={() => setSelectedMemberIds(prev => checked ? prev.filter(x => x !== user.id) : [...prev, user.id])} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', background: checked ? 'rgba(99,102,241,0.06)' : 'transparent', border: `1px solid ${checked ? '#c7d2fe' : 'transparent'}`, transition: 'all 0.12s' }}>
                <img src={user.profile_photo} alt={user.full_name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#1e293b' }}>{user.full_name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{user.profession || `Batch ${user.batch_year}`}</div>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? '#6366f1' : '#cbd5e1'}`, background: checked ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                  {checked && <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 900 }}>✓</span>}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={handleCreateGroup} disabled={!newGroupName.trim() || creatingGroup} style={{ width: '100%', padding: '13px 0', borderRadius: 12, background: newGroupName.trim() ? '#6366f1' : '#e2e8f0', border: 'none', color: newGroupName.trim() ? '#fff' : '#94a3b8', fontSize: '0.9rem', fontWeight: 700, cursor: newGroupName.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {creatingGroup ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Hash size={16} /> Create Group {selectedMemberIds.length > 0 ? `with ${selectedMemberIds.length + 1} members` : ''}</>}
        </button>
      </div>
    </div>
  );

  // ─── Modal: Add Members ───────────────────────────────────────────────────────
  const renderAddMembersModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAddMembersModal(false)}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '28px', width: 440, maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px -15px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Add Members</h3>
          <button onClick={() => setShowAddMembersModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search connections…" value={addMemberSearch} onChange={e => setAddMemberSearch(e.target.value)} style={{ width: '100%', padding: '9px 12px 9px 30px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 280, display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          {filteredNonMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: '0.82rem' }}>All your connections are already in this group</div>
          ) : filteredNonMembers.map(user => {
            const checked = addMemberIds.includes(user.id);
            return (
              <div key={user.id} onClick={() => setAddMemberIds(prev => checked ? prev.filter(x => x !== user.id) : [...prev, user.id])} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', background: checked ? 'rgba(99,102,241,0.06)' : 'transparent', border: `1px solid ${checked ? '#c7d2fe' : 'transparent'}` }}>
                <img src={user.profile_photo} alt={user.full_name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#1e293b' }}>{user.full_name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{user.profession || `Batch ${user.batch_year}`}</div>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? '#6366f1' : '#cbd5e1'}`, background: checked ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {checked && <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 900 }}>✓</span>}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={handleAddMembers} disabled={addMemberIds.length === 0 || addingMembers} style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: addMemberIds.length > 0 ? '#6366f1' : '#e2e8f0', border: 'none', color: addMemberIds.length > 0 ? '#fff' : '#94a3b8', fontSize: '0.9rem', fontWeight: 700, cursor: addMemberIds.length > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {addingMembers ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Adding…</> : `Add ${addMemberIds.length > 0 ? addMemberIds.length : ''} Member${addMemberIds.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );

  // ─── Modal: New DM ────────────────────────────────────────────────────────────
  const renderNewChatModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Message a Connection</h3>
          <button onClick={() => { setShowNewChat(false); setDirSearch(''); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}><X size={18} /></button>
        </div>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          <input type="text" autoFocus placeholder="Search your connections…" value={dirSearch} onChange={e => setDirSearch(e.target.value)} style={{ width: '100%', padding: '11px 12px 11px 36px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 12, color: '#1e293b', fontSize: '0.88rem', boxSizing: 'border-box', outline: 'none' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loadingDir ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} /><p style={{ margin: 0, fontSize: '0.85rem' }}>Loading your connections…</p></div>
          ) : filteredDir.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
              <Users size={28} style={{ marginBottom: 8 }} />
              <p style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>{dirSearch ? 'No connections match your search' : 'No connections yet'}</p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>{dirSearch ? 'Try a different name.' : 'Connect with alumni in the Directory first.'}</p>
            </div>
          ) : filteredDir.map(user => (
            <div key={user.id} onClick={() => startNewChat(user)} style={{ padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.15s', border: '1px solid transparent' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.1)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}>
              <img src={user.profile_photo} alt={user.full_name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{user.full_name}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.profession && <span>{user.profession}</span>}{user.company && <span> · {user.company}</span>}</div>
              </div>
              <ChevronRight size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── Main render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', background: '#f8fafc', overflow: 'hidden', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      {/* Left sidebar */}
      <div style={{ width: '320px', minWidth: '320px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#ffffff', height: '100%' }}>
        {renderLeftHeader()}
        {renderUnifiedList()}
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {activePanel === 'group' ? renderGroupChat() : renderDMChat()}
      </div>

      {/* Modals */}
      {showNewChat && renderNewChatModal()}
      {showCreateGroup && renderCreateGroupModal()}
      {showAddMembersModal && renderAddMembersModal()}
    </div>
  );
};
