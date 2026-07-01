"use client";

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, ShieldCheck, Clock, FileText, Check, X, ShieldAlert, Activity, Landmark } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface AdminScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ showToast, onViewProfile }) => {
  const { refreshSession } = useAuth();
  
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [donationTotal, setDonationTotal] = useState(0);
  const [certPreviewUser, setCertPreviewUser] = useState<any | null>(null);

  const loadAdminData = async () => {
    try {
      const pending = await apiFetch('/admin/pending-users');
      setPendingList(pending);

      const directory = await apiFetch('/directory');
      setVerifiedCount(directory.length);
      setTotalCount(directory.length + pending.length);

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
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <div className="admin-layout" style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px 0 36px' }}>
      {/* Page Title Card */}
      <div 
        className="admin-header-card glass-panel" 
        style={{ 
          padding: '24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Purple Icon with Shield Check */}
          <div 
            style={{ 
              background: 'var(--primary-gradient)', 
              color: 'white', 
              borderRadius: '12px', 
              width: '48px', 
              height: '48px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Administrative Control Center
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Verify registration credentials, approve ex-student status, and monitor platform performance from a centralized dashboard.
            </p>
          </div>
        </div>
        
        {/* Admin Overview Button */}
        <button 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1.5px solid var(--border-color)', 
            borderRadius: '9999px', 
            padding: '8px 16px', 
            color: 'var(--text-primary)', 
            fontWeight: 600, 
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onClick={loadAdminData}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
        >
          <Activity size={16} style={{ color: 'var(--primary-color)' }} />
          <span>Admin Overview</span>
        </button>
      </div>

      {/* Analytical Stats strip */}
      <div className="admin-stats-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        
        {/* Card 1: Total Registered */}
        <div 
          className="admin-stat-card glass-panel" 
          style={{ 
            padding: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div 
            style={{ 
              background: 'rgba(255, 255, 255, 0.03)', 
              color: 'var(--primary-color)', 
              borderRadius: '50%', 
              width: '48px', 
              height: '48px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Users size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{totalCount}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Registered</span>
          </div>
        </div>

        {/* Card 2: Verified Alumni */}
        <div 
          className="admin-stat-card glass-panel" 
          style={{ 
            padding: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div 
            style={{ 
              background: 'rgba(255, 255, 255, 0.03)', 
              color: 'var(--text-success)', 
              borderRadius: '50%', 
              width: '48px', 
              height: '48px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{verifiedCount}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Verified Alumni</span>
          </div>
        </div>

        {/* Card 3: Pending Verification */}
        <div 
          className="admin-stat-card glass-panel" 
          style={{ 
            padding: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div 
            style={{ 
              background: 'rgba(255, 255, 255, 0.03)', 
              color: 'var(--accent-gold)', 
              borderRadius: '50%', 
              width: '48px', 
              height: '48px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Clock size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{pendingList.length}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Pending Verification</span>
          </div>
        </div>

        {/* Card 4: Total Contributions */}
        <div 
          className="admin-stat-card glass-panel" 
          style={{ 
            padding: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div 
            style={{ 
              background: 'rgba(255, 255, 255, 0.03)', 
              color: 'var(--emblem-teal)', 
              borderRadius: '50%', 
              width: '48px', 
              height: '48px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Landmark size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {donationTotal === 0 ? "0" : `₹${donationTotal.toLocaleString('en-IN')}`}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Contributions</span>
          </div>
        </div>

      </div>

      {/* Verification Queue Table Widget */}
      <div 
        className="admin-table-widget glass-panel" 
        style={{ 
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Pending Alumni Verification Queue
          </h3>
          <span 
            style={{ 
              fontSize: '0.72rem', 
              fontWeight: 700, 
              color: 'var(--text-primary)', 
              background: 'rgba(255, 255, 255, 0.08)', 
              border: '1px solid var(--border-color)',
              padding: '5px 12px', 
              borderRadius: '9999px',
              textTransform: 'uppercase',
              letterSpacing: '0.03em'
            }}
          >
            {pendingList.length} Pending {pendingList.length === 1 ? 'Application' : 'Applications'}
          </span>
        </div>

        <div className="admin-table-container" style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr 
                style={{ 
                  background: 'rgba(0, 0, 0, 0.2)', 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.72rem', 
                  fontWeight: 700, 
                  textTransform: 'uppercase',
                  borderBottom: '1px solid var(--border-color)',
                  letterSpacing: '0.05em'
                }}
              >
                <th style={{ padding: '12px 16px', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', color: 'var(--text-secondary)' }}>Applicant Details</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Batch / House</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Verification Doc</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Registered On</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', borderTopRightRadius: '8px', borderBottomRightRadius: '8px', color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '80px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div 
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.03)', 
                          color: 'var(--text-secondary)', 
                          borderRadius: '50%', 
                          width: '56px', 
                          height: '56px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          marginBottom: '16px' 
                        }}
                      >
                        <ShieldCheck size={28} style={{ color: 'var(--text-success)' }} />
                      </div>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                        Verification queue is empty
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                        All alumni applications have been resolved. New submissions will appear here for review and approval.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingList.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <td style={{ padding: '16px' }}>
                      <div className="table-user-cell" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img 
                          src={u.profile_photo} 
                          alt={u.full_name} 
                          className="table-photo" 
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                          onClick={() => onViewProfile(u.id)}
                        />
                        <div className="table-user-details" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="table-user-name" onClick={() => onViewProfile(u.id)} style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>{u.full_name}</span>
                          <span className="table-user-email" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Batch of {u.batch_year}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{u.house}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <a href="#" className="doc-link-btn" onClick={(e) => { e.preventDefault(); setCertPreviewUser(u); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-gold)', fontWeight: 500, textDecoration: 'none' }}>
                        <FileText size={14} />
                        <span style={{ textDecoration: 'underline' }}>{u.certificate_url}</span>
                      </a>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div className="admin-actions-cell" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          className="btn-icon approve" 
                          title="Approve Registration" 
                          onClick={() => handleResolveVerification(u.id, u.full_name, 'approved')}
                          style={{ background: 'rgba(74, 222, 128, 0.1)', color: 'var(--text-success)', border: '1px solid rgba(74, 222, 128, 0.3)', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px' }}
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          className="btn-icon reject" 
                          title="Reject Application" 
                          onClick={() => handleResolveVerification(u.id, u.full_name, 'rejected')}
                          style={{ background: 'rgba(248, 113, 113, 0.1)', color: 'var(--text-danger)', border: '1px solid rgba(248, 113, 113, 0.3)', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px' }}
                        >
                          <X size={14} />
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
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-card" style={{ maxWidth: '500px', padding: '24px', textAlign: 'center', background: 'var(--bg-dark)', border: '1px solid var(--border-color)' }}>
            <div className="page-title-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                <ShieldAlert size={18} style={{ color: 'var(--accent-gold)' }} />
                <span>School Document Verification</span>
              </h3>
              <button className="icon-btn" onClick={() => setCertPreviewUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>
            
            {/* Real Uploaded Document Preview or Simulated Fallback */}
            {certPreviewUser.certificate_url && 
             certPreviewUser.certificate_url !== 'Leaving_Certificate_Scan.pdf' && 
             certPreviewUser.certificate_url !== 'Certificate_Scan.pdf' ? (
              <div style={{ marginBottom: '16px', maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', background: 'var(--bg-darker)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {certPreviewUser.certificate_url.toLowerCase().endsWith('.pdf') ? (
                  <iframe 
                    src={certPreviewUser.certificate_url} 
                    style={{ width: '100%', height: '380px', border: 'none' }}
                    title="Certificate PDF"
                  />
                ) : (
                  <img 
                    src={certPreviewUser.certificate_url} 
                    alt="Uploaded Certificate" 
                    style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain', borderRadius: '4px' }} 
                  />
                )}
              </div>
            ) : (
              /* Premium Simulated Leaving Certificate Fallback */
              <div id="certModalContent" style={{ background: '#fcfbf7', border: '12px double #0d233a', padding: '24px', borderRadius: '4px', color: '#0d233a', fontFamily: 'serif', textAlign: 'center' }}>
                <div style={{ border: '2px solid #c59b27', padding: '16px', position: 'relative' }}>
                  <span style={{ fontSize: '1.1rem', letterSpacing: '0.1em', fontWeight: 700, color: '#0d233a', display: 'block', marginBottom: '4px' }}>RAMAKRISHOM MISSION VIDYAPITH</span>
                  <span style={{ fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontFamily: 'sans-serif', color: '#718096', marginBottom: '12px' }}>DEOGHAR, JHARKHAND</span>
                  
                  <hr style={{ border: 0, borderTop: '1px solid #c59b27', margin: '8px 0' }} />
                  
                  <h4 style={{ fontStyle: 'italic', fontSize: '1rem', margin: '12px 0', color: '#0d233a' }}>Leaving Certificate & Character Memo</h4>
                  
                  <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#334155', textAlign: 'justify', margin: '14px 0' }}>
                    This is to verify that <strong>{certPreviewUser.full_name}</strong>, resident of <strong>{certPreviewUser.house}</strong>, was a regular ex-student of this residential school. He successfully completed his secondary schooling in the <strong>Class of {certPreviewUser.batch_year}</strong>. 
                    His character and moral conduct during his hostel residence were exemplary.
                  </p>

                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ textAlign: 'left', fontSize: '0.75rem', color: '#475569' }}>
                      <span>Date: 15-May-{certPreviewUser.batch_year}</span>
                    </div>
                    <div style={{ textAlign: 'center', fontFamily: 'sans-serif', fontSize: '0.75rem' }}>
                      <div style={{ fontStyle: 'italic', fontFamily: 'serif', color: '#0c1e36', fontWeight: 700 }}>Swami Brahmananda</div>
                      <div style={{ borderTop: '1px solid #718096', paddingTop: '2px', fontSize: '0.65rem', textTransform: 'uppercase', color: '#718096' }}>Headmaster & Secretary</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '10px', borderRadius: '6px' }} onClick={() => setCertPreviewUser(null)}>
                <span>Close Document</span>
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '10px', borderRadius: '6px' }}
                onClick={() => {
                  handleResolveVerification(certPreviewUser.id, certPreviewUser.full_name, 'approved');
                  setCertPreviewUser(null);
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

