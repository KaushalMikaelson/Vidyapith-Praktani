"use client";

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, ShieldCheck, Clock, FileText, Check, X, ShieldAlert, Activity, Landmark, Search, UserPlus, Trash2 } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface AdminScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ showToast, onViewProfile }) => {
  const { currentUser, refreshSession } = useAuth();
  
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [donationTotal, setDonationTotal] = useState(0);
  const [certPreviewUser, setCertPreviewUser] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberList, setMemberList] = useState<any[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);

  const loadAdminData = async () => {
    try {
      const pending = await apiFetch('/admin/pending-users');
      setPendingList(pending);

      const users = await apiFetch('/admin/users');
      setMemberList(users);
      setVerifiedCount(users.filter((user: any) => user.verify_status === 'approved').length);
      setTotalCount(users.length);

      const leaderboard = await apiFetch('/donations/leaderboard');
      const total = leaderboard.reduce((sum: number, item: any) => sum + item.total_amount, 0) / 100;
      setDonationTotal(total);
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  React.useEffect(() => {
    loadAdminData();
  }, []);

  const handleResolveVerification = async (id: string, name: string, status: 'approved' | 'rejected') => {
    try {
      await apiFetch('/auth/resolve-queue', {
        method: 'POST',
        body: JSON.stringify({ id, status })
      });
      showToast(`Applicant ${name} has been successfully ${status}!`, status === 'approved' ? 'success' : 'danger');
      loadAdminData();
      refreshSession();
      if (certPreviewUser && certPreviewUser.id === id) {
        setCertPreviewUser(null);
      }
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const handleMakeAdmin = async (id: string, name: string) => {
    if (!window.confirm(`Make ${name} an admin? They will be able to sign in through the Admin Portal.`)) {
      return;
    }

    setPromotingUserId(id);
    try {
      await apiFetch(`/admin/users/${id}/make-admin`, { method: 'POST' });
      showToast(`${name} can now access the Admin Portal.`, 'success');
      await loadAdminData();
      refreshSession();
    } catch (err: any) {
      showToast(err.message || 'Failed to make member an admin.', 'danger');
    } finally {
      setPromotingUserId(null);
    }
  };

  const handleRevokeUser = async (id: string, name: string, role: string) => {
    if (currentUser?.id === id) {
      showToast('You cannot revoke your own admin account.', 'danger');
      return;
    }

    const roleWarning = role === 'admin'
      ? ' This account is also an admin, so their admin access and site account will both be removed.'
      : '';

    if (!window.confirm(`Revoke ${name} from the site? This permanently removes their account and related activity.${roleWarning}`)) {
      return;
    }

    setRevokingUserId(id);
    try {
      await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
      showToast(`${name} has been revoked from the site.`, 'success');
      if (certPreviewUser && certPreviewUser.id === id) {
        setCertPreviewUser(null);
      }
      await loadAdminData();
      refreshSession();
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke member.', 'danger');
    } finally {
      setRevokingUserId(null);
    }
  };

  // Filter application list by name, email, batch, or house
  const filteredPendingList = pendingList.filter(u => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (u.full_name || "").toLowerCase().includes(query) ||
      (u.email || "").toLowerCase().includes(query) ||
      (u.batch_year || "").toString().includes(query) ||
      (u.house || "").toLowerCase().includes(query)
    );
  });

  const filteredManagedUsers = memberList.filter(u => {
    const query = memberSearchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (u.full_name || "").toLowerCase().includes(query) ||
      (u.email || "").toLowerCase().includes(query) ||
      (u.role || "").toLowerCase().includes(query) ||
      (u.verify_status || "").toLowerCase().includes(query) ||
      (u.batch_year || "").toString().includes(query)
    );
  });

  const adminCount = memberList.filter(u => u.role === 'admin').length;

  return (
    <div className="admin-layout" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px 48px', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* Premium Header Banner */}
      <div 
        style={{ 
          background: 'var(--heritage-card)', 
          border: '1px solid var(--heritage-line)', 
          borderLeft: '5px solid var(--primary-color)',
          borderRadius: '16px',
          padding: '28px 32px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '32px',
          boxShadow: 'var(--heritage-shadow)',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div 
            style={{ 
              background: 'var(--primary-gradient)', 
              color: 'white', 
              borderRadius: '14px', 
              width: '54px', 
              height: '54px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(243, 112, 33, 0.25)'
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#09152c', letterSpacing: '-0.02em', fontFamily: 'var(--font-title)' }}>
              Administrative Control Center
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: 'var(--heritage-muted)', lineHeight: 1.5, maxWidth: '750px' }}>
              Verify registration credentials, approve ex-student status, and monitor alumni platform performance from this secure administrative panel.
            </p>
          </div>
        </div>
        
        {/* Refresh / Overview Button */}
        <button 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'transparent', 
            border: '1.5px solid var(--primary-color)', 
            borderRadius: '9999px', 
            padding: '10px 20px', 
            color: 'var(--primary-color)', 
            fontWeight: 700, 
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: '0 2px 5px rgba(243, 112, 33, 0.05)'
          }}
          onClick={loadAdminData}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(243, 112, 33, 0.06)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Activity size={16} />
          <span>Refresh Dashboard</span>
        </button>
      </div>

      {/* Analytical Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        
        {/* Card 1: Total Registered */}
        <div 
          style={{ 
            padding: '24px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '18px',
            background: 'var(--heritage-card)',
            border: '1px solid var(--heritage-line)',
            borderRadius: '16px',
            boxShadow: 'var(--heritage-shadow)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = 'var(--primary-color)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(243, 112, 33, 0.08)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--heritage-line)';
            e.currentTarget.style.boxShadow = 'var(--heritage-shadow)';
          }}
        >
          <div 
            style={{ 
              background: 'rgba(243, 112, 33, 0.08)', 
              color: 'var(--primary-color)', 
              borderRadius: '12px', 
              width: '50px', 
              height: '50px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Users size={24} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 850, color: '#09152c', lineHeight: 1.1 }}>{totalCount}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--heritage-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>Total Registered</span>
          </div>
        </div>

        {/* Card 2: Verified Alumni */}
        <div 
          style={{ 
            padding: '24px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '18px',
            background: 'var(--heritage-card)',
            border: '1px solid var(--heritage-line)',
            borderRadius: '16px',
            boxShadow: 'var(--heritage-shadow)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#10b981';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(16, 185, 129, 0.08)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--heritage-line)';
            e.currentTarget.style.boxShadow = 'var(--heritage-shadow)';
          }}
        >
          <div 
            style={{ 
              background: 'rgba(16, 185, 129, 0.08)', 
              color: '#10b981', 
              borderRadius: '12px', 
              width: '50px', 
              height: '50px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 850, color: '#09152c', lineHeight: 1.1 }}>{verifiedCount}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--heritage-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>Approved Accounts</span>
          </div>
        </div>

        {/* Card 3: Pending Verification */}
        <div 
          style={{ 
            padding: '24px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '18px',
            background: 'var(--heritage-card)',
            border: '1px solid var(--heritage-line)',
            borderRadius: '16px',
            boxShadow: 'var(--heritage-shadow)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#f59e0b';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(245, 158, 11, 0.08)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--heritage-line)';
            e.currentTarget.style.boxShadow = 'var(--heritage-shadow)';
          }}
        >
          <div 
            style={{ 
              background: 'rgba(245, 158, 11, 0.08)', 
              color: '#f59e0b', 
              borderRadius: '12px', 
              width: '50px', 
              height: '50px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Clock size={24} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 850, color: '#09152c', lineHeight: 1.1 }}>{pendingList.length}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--heritage-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>Pending Queue</span>
          </div>
        </div>

        {/* Card 4: Total Contributions */}
        <div 
          style={{ 
            padding: '24px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '18px',
            background: 'var(--heritage-card)',
            border: '1px solid var(--heritage-line)',
            borderRadius: '16px',
            boxShadow: 'var(--heritage-shadow)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.borderColor = '#0e6b8a';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(14, 107, 138, 0.08)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--heritage-line)';
            e.currentTarget.style.boxShadow = 'var(--heritage-shadow)';
          }}
        >
          <div 
            style={{ 
              background: 'rgba(14, 107, 138, 0.08)', 
              color: '#0e6b8a', 
              borderRadius: '12px', 
              width: '50px', 
              height: '50px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Landmark size={24} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 850, color: '#09152c', lineHeight: 1.1 }}>
              {donationTotal === 0 ? "0" : `₹${donationTotal.toLocaleString('en-IN')}`}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--heritage-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>Contributions</span>
          </div>
        </div>

      </div>

      {/* Member Access Table Widget */}
      <div
        style={{
          background: 'var(--heritage-card)',
          border: '1px solid var(--heritage-line)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: 'var(--heritage-shadow)',
          marginBottom: '32px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '18px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09152c', margin: 0, fontFamily: 'var(--font-title)' }}>
              Member Access Management
            </h3>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#0e6b8a',
                background: 'rgba(14, 107, 138, 0.08)',
                border: '1px solid rgba(14, 107, 138, 0.2)',
                padding: '4px 12px',
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              {adminCount} Admin{adminCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Search members..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                background: '#ffffff',
                border: '1.5px solid var(--heritage-line)',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: 'var(--heritage-ink)',
                outline: 'none',
                transition: 'all 0.2s ease-in-out'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0e6b8a';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14, 107, 138, 0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--heritage-line)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--heritage-muted)' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  background: '#fcfbfa',
                  color: 'var(--heritage-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 750,
                  textTransform: 'uppercase',
                  borderBottom: '2px solid var(--heritage-line)',
                  letterSpacing: '0.06em'
                }}
              >
                <th style={{ padding: '14px 16px', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', color: 'var(--heritage-muted)' }}>Member</th>
                <th style={{ padding: '14px 16px', color: 'var(--heritage-muted)' }}>Status</th>
                <th style={{ padding: '14px 16px', color: 'var(--heritage-muted)' }}>Role</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', borderTopRightRadius: '10px', borderBottomRightRadius: '10px', color: 'var(--heritage-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredManagedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '56px 20px', textAlign: 'center', color: 'var(--heritage-muted)', fontWeight: 700 }}>
                    {memberSearchQuery ? 'No matching members found.' : 'No members found.'}
                  </td>
                </tr>
              ) : (
                filteredManagedUsers.map(u => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid var(--heritage-line)',
                      fontSize: '0.9rem',
                      color: 'var(--heritage-ink)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#faf9f6'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '18px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <img
                          src={u.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80"}
                          alt={u.full_name}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--heritage-line)', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
                          onClick={() => onViewProfile(u.id)}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span onClick={() => onViewProfile(u.id)} style={{ fontWeight: 700, color: '#09152c', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary-color)'} onMouseOut={(e) => e.currentTarget.style.color = '#09152c'}>{u.full_name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--heritage-muted)', marginTop: '2px' }}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '18px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        padding: '5px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: u.verify_status === 'approved' ? 'rgba(16, 185, 129, 0.08)' : u.verify_status === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                        color: u.verify_status === 'approved' ? '#10b981' : u.verify_status === 'pending' ? '#b7791f' : '#ef4444',
                        border: u.verify_status === 'approved' ? '1px solid rgba(16, 185, 129, 0.25)' : u.verify_status === 'pending' ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)'
                      }}>
                        {u.verify_status}
                      </span>
                    </td>
                    <td style={{ padding: '18px 16px', textTransform: 'capitalize', color: '#09152c', fontWeight: 700 }}>
                      {u.role}
                    </td>
                    <td style={{ padding: '18px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                        {u.role !== 'admin' && (
                          <button
                            title="Make Admin"
                            onClick={() => handleMakeAdmin(u.id, u.full_name)}
                            disabled={promotingUserId === u.id || revokingUserId === u.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              background: 'rgba(14, 107, 138, 0.08)',
                              color: '#0e6b8a',
                              border: '1px solid rgba(14, 107, 138, 0.3)',
                              borderRadius: '8px',
                              padding: '8px 14px',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              cursor: promotingUserId === u.id || revokingUserId === u.id ? 'not-allowed' : 'pointer',
                              opacity: promotingUserId === u.id || revokingUserId === u.id ? 0.6 : 1,
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                              if (promotingUserId === u.id || revokingUserId === u.id) return;
                              e.currentTarget.style.background = '#0e6b8a';
                              e.currentTarget.style.color = 'white';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 10px rgba(14, 107, 138, 0.18)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'rgba(14, 107, 138, 0.08)';
                              e.currentTarget.style.color = '#0e6b8a';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <UserPlus size={14} />
                            <span>{promotingUserId === u.id ? 'Promoting...' : 'Make Admin'}</span>
                          </button>
                        )}
                        <button
                          title={currentUser?.id === u.id ? 'You cannot revoke yourself' : 'Revoke user from site'}
                          onClick={() => handleRevokeUser(u.id, u.full_name, u.role)}
                          disabled={currentUser?.id === u.id || revokingUserId === u.id || promotingUserId === u.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: 'rgba(220, 38, 38, 0.08)',
                            color: '#b91c1c',
                            border: '1px solid rgba(220, 38, 38, 0.28)',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: currentUser?.id === u.id || revokingUserId === u.id || promotingUserId === u.id ? 'not-allowed' : 'pointer',
                            opacity: currentUser?.id === u.id || revokingUserId === u.id || promotingUserId === u.id ? 0.55 : 1,
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            if (currentUser?.id === u.id || revokingUserId === u.id || promotingUserId === u.id) return;
                            e.currentTarget.style.background = '#b91c1c';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(185, 28, 28, 0.18)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
                            e.currentTarget.style.color = '#b91c1c';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <Trash2 size={14} />
                          <span>{revokingUserId === u.id ? 'Revoking...' : 'Revoke'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Queue Table Widget */}
      <div 
        style={{ 
          background: 'var(--heritage-card)',
          border: '1px solid var(--heritage-line)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: 'var(--heritage-shadow)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09152c', margin: 0, fontFamily: 'var(--font-title)' }}>
              Pending Alumni Verification Queue
            </h3>
            <span 
              style={{ 
                fontSize: '0.72rem', 
                fontWeight: 800, 
                color: 'var(--primary-color)', 
                background: 'rgba(243, 112, 33, 0.08)', 
                border: '1px solid rgba(243, 112, 33, 0.2)',
                padding: '4px 12px', 
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              {pendingList.length} Pending Application{pendingList.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Premium Filter Search Field */}
          <div style={{ position: 'relative', width: '280px' }}>
            <input 
              type="text" 
              placeholder="Filter by name, email, batch, or house..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                background: '#ffffff',
                border: '1.5px solid var(--heritage-line)',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: 'var(--heritage-ink)',
                outline: 'none',
                transition: 'all 0.2s ease-in-out'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary-color)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(243, 112, 33, 0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--heritage-line)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--heritage-muted)' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr 
                style={{ 
                  background: '#fcfbfa', 
                  color: 'var(--heritage-muted)', 
                  fontSize: '0.75rem', 
                  fontWeight: 750, 
                  textTransform: 'uppercase',
                  borderBottom: '2px solid var(--heritage-line)',
                  letterSpacing: '0.06em'
                }}
              >
                <th style={{ padding: '14px 16px', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', color: 'var(--heritage-muted)' }}>Applicant Details</th>
                <th style={{ padding: '14px 16px', color: 'var(--heritage-muted)' }}>Batch & House</th>
                <th style={{ padding: '14px 16px', color: 'var(--heritage-muted)' }}>Verification Doc</th>
                <th style={{ padding: '14px 16px', color: 'var(--heritage-muted)' }}>Registered On</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', borderTopRightRadius: '10px', borderBottomRightRadius: '10px', color: 'var(--heritage-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPendingList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '96px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div 
                        style={{ 
                          background: 'rgba(16, 185, 129, 0.06)', 
                          color: '#10b981', 
                          borderRadius: '50%', 
                          width: '64px', 
                          height: '64px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          marginBottom: '18px' 
                        }}
                      >
                        <ShieldCheck size={32} />
                      </div>
                      <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09152c', margin: '0 0 8px 0', fontFamily: 'var(--font-title)' }}>
                        {searchQuery ? "No matching records found" : "Verification queue is clean"}
                      </h4>
                      <p style={{ fontSize: '0.9rem', color: 'var(--heritage-muted)', margin: 0, maxWidth: '460px', lineHeight: 1.6 }}>
                        {searchQuery 
                          ? "Adjust your search parameters or check spelling to find specific pending alumni registrations."
                          : "All pending ex-student verification requests have been resolved. New registrants will pop up here for vetting."
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPendingList.map(u => (
                  <tr 
                    key={u.id} 
                    style={{ 
                      borderBottom: '1px solid var(--heritage-line)', 
                      fontSize: '0.9rem', 
                      color: 'var(--heritage-ink)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#faf9f6'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '18px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <img 
                          src={u.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80"} 
                          alt={u.full_name} 
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--heritage-line)', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
                          onClick={() => onViewProfile(u.id)}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span onClick={() => onViewProfile(u.id)} style={{ fontWeight: 700, color: '#09152c', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary-color)'} onMouseOut={(e) => e.currentTarget.style.color = '#09152c'}>{u.full_name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--heritage-muted)', marginTop: '2px' }}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '18px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#09152c' }}>Class of {u.batch_year}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--heritage-muted)', marginTop: '2px' }}>{u.house || "N/A"} House</div>
                    </td>
                    <td style={{ padding: '18px 16px' }}>
                      <button 
                        onClick={(e) => { e.preventDefault(); setCertPreviewUser(u); }} 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          background: 'rgba(212, 175, 55, 0.08)', 
                          border: '1px solid rgba(212, 175, 55, 0.3)', 
                          borderRadius: '8px', 
                          padding: '8px 14px', 
                          color: '#a17a02', 
                          fontWeight: 700, 
                          fontSize: '0.8rem',
                          cursor: 'pointer', 
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(212, 175, 55, 0.16)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(212, 175, 55, 0.1)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(212, 175, 55, 0.08)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <FileText size={14} />
                        <span>Review Document</span>
                      </button>
                    </td>
                    <td style={{ padding: '18px 16px', color: 'var(--heritage-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '18px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        
                        {/* Approve Button */}
                        <button 
                          title="Approve Alumnus Status" 
                          onClick={() => handleResolveVerification(u.id, u.full_name, 'approved')}
                          style={{ 
                            background: 'rgba(16, 185, 129, 0.08)', 
                            color: '#10b981', 
                            border: '1px solid rgba(16, 185, 129, 0.3)', 
                            padding: '8px', 
                            borderRadius: '8px', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            width: '34px', 
                            height: '34px',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#10b981';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.transform = 'scale(1.08)';
                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(16, 185, 129, 0.2)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                            e.currentTarget.style.color = '#10b981';
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <Check size={18} strokeWidth={2.5} />
                        </button>

                        {/* Reject Button */}
                        <button 
                          title="Reject Registration" 
                          onClick={() => handleResolveVerification(u.id, u.full_name, 'rejected')}
                          style={{ 
                            background: 'rgba(239, 68, 68, 0.08)', 
                            color: '#ef4444', 
                            border: '1px solid rgba(239, 68, 68, 0.3)', 
                            padding: '8px', 
                            borderRadius: '8px', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            width: '34px', 
                            height: '34px',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#ef4444';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.transform = 'scale(1.08)';
                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(239, 68, 68, 0.2)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <X size={18} strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document verification preview modal */}
      {certPreviewUser && (
        <div className="modal-overlay" style={{ display: 'flex', background: 'rgba(9, 21, 44, 0.65)', backdropFilter: 'blur(8px)' }}>
          <div 
            className="modal-card" 
            style={{ 
              maxWidth: '600px', 
              padding: '28px', 
              textAlign: 'center', 
              background: 'var(--heritage-card)', 
              border: '1px solid var(--heritage-line)', 
              borderRadius: '20px',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem', fontWeight: 800, color: '#09152c', margin: 0, fontFamily: 'var(--font-title)' }}>
                <ShieldAlert size={22} style={{ color: '#d4af37' }} />
                <span>Certificate Vetting Process</span>
              </h3>
              <button 
                onClick={() => setCertPreviewUser(null)} 
                style={{ 
                  background: 'rgba(0, 0, 0, 0.04)', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--heritage-muted)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)'; e.currentTarget.style.color = 'var(--heritage-muted)'; }}
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Real Uploaded Document Preview or Simulated Fallback */}
            {certPreviewUser.certificate_url && 
             certPreviewUser.certificate_url !== 'Leaving_Certificate_Scan.pdf' && 
             certPreviewUser.certificate_url !== 'Certificate_Scan.pdf' ? (
              <div style={{ marginBottom: '20px', maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--heritage-line)', borderRadius: '12px', padding: '10px', background: '#faf9f6', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {certPreviewUser.certificate_url.toLowerCase().endsWith('.pdf') ? (
                  <iframe 
                    src={certPreviewUser.certificate_url} 
                    style={{ width: '100%', height: '380px', border: 'none', borderRadius: '8px' }}
                    title="Certificate PDF"
                  />
                ) : (
                  <img 
                    src={certPreviewUser.certificate_url} 
                    alt="Uploaded Certificate" 
                    style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} 
                  />
                )}
              </div>
            ) : (
              /* Premium Simulated Leaving Certificate Fallback */
              <div style={{ background: '#fdfbf7', border: '10px double #c59b27', padding: '24px', borderRadius: '8px', color: '#0c1e36', fontFamily: 'Georgia, serif', textAlign: 'center', boxShadow: 'inset 0 0 20px rgba(197, 155, 39, 0.05)', marginBottom: '20px' }}>
                <div style={{ border: '1px solid rgba(197, 155, 39, 0.3)', padding: '18px', position: 'relative' }}>
                  <span style={{ fontSize: '1.25rem', letterSpacing: '0.08em', fontWeight: 800, color: '#9a2a2a', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-title)' }}>RAMAKRISHNA MISSION VIDYAPITH</span>
                  <span style={{ fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontFamily: 'var(--font-body)', fontWeight: 700, color: '#77797d', marginBottom: '16px' }}>DEOGHAR, JHARKHAND</span>
                  
                  <hr style={{ border: 0, borderTop: '1px solid rgba(197, 155, 39, 0.3)', margin: '10px 0' }} />
                  
                  <h4 style={{ fontStyle: 'italic', fontSize: '1.1rem', margin: '14px 0', color: '#0c1e36', fontWeight: 600 }}>Leaving Certificate & Character Memo</h4>
                  
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#334155', textAlign: 'justify', margin: '16px 0', textIndent: '24px' }}>
                    This is to certify that <strong>{certPreviewUser.full_name}</strong>, resident of <strong>{certPreviewUser.house || "Vivekananda"} House</strong>, was a regular ex-student of this residential school. He successfully completed his secondary schooling in the <strong>Class of {certPreviewUser.batch_year}</strong>. 
                    His character, moral conduct, and hostel discipline during his residence were exemplary.
                  </p>

                  <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ textAlign: 'left', fontSize: '0.75rem', color: '#77797d', fontFamily: 'var(--font-body)' }}>
                      <span>Issue Date: 15-May-{certPreviewUser.batch_year}</span>
                    </div>
                    <div style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.75rem' }}>
                      <div style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif', color: '#9a2a2a', fontWeight: 700, fontSize: '0.85rem' }}>Swami Brahmananda</div>
                      <div style={{ borderTop: '1px solid #a0aec0', paddingTop: '4px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#77797d', marginTop: '2px' }}>Headmaster & Secretary</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Modal Footer Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                style={{ 
                  flex: 1, 
                  padding: '12px 18px', 
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1.5px solid var(--heritage-line)',
                  color: 'var(--heritage-ink)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }} 
                onClick={() => setCertPreviewUser(null)}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span>Close Preview</span>
              </button>
              <button 
                style={{ 
                  flex: 1, 
                  padding: '12px 18px', 
                  borderRadius: '10px',
                  background: 'var(--primary-gradient)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(243, 112, 33, 0.25)',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  handleResolveVerification(certPreviewUser.id, certPreviewUser.full_name, 'approved');
                  setCertPreviewUser(null);
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(243, 112, 33, 0.35)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(243, 112, 33, 0.25)';
                }}
              >
                <span>Approve Applicant</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
