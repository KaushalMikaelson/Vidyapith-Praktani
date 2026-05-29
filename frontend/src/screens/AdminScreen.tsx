import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RKMV_DB, User, Notification } from '../database/database';
import { Users, ShieldCheck, Clock, FileText, Check, X, ShieldAlert } from 'lucide-react';

interface AdminScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ showToast, onViewProfile }) => {
  const { refreshSession } = useAuth();
  
  // Database States
  const [users, setUsers] = useState<User[]>(RKMV_DB.getUsers());
  const [certPreviewUser, setCertPreviewUser] = useState<User | null>(null);

  const pendingList = users.filter(u => u.verify_status === 'pending');
  const verifiedCount = users.filter(u => u.verify_status === 'approved' && u.role !== 'admin').length;
  
  const donations = RKMV_DB.getDonations();
  const donationTotal = donations
    .filter(d => d.payment_status === 'approved')
    .reduce((sum, d) => sum + d.amount_paise, 0) / 100;

  const handleResolveVerification = (id: string, name: string, status: 'approved' | 'rejected') => {
    RKMV_DB.updateUser(id, { verify_status: status });
    showToast(`Applicant ${name} has been successfully ${status}!`, status === 'approved' ? 'success' : 'danger');

    // Send notification
    RKMV_DB.addNotification({
      id: 'not-' + Math.random().toString(36).substr(2, 9),
      user_id: id,
      title: status === 'approved' ? "Verification Approved!" : "Registration Declined",
      body: status === 'approved' ? "Welcome! The administrative committee has approved your alumni status. Explore Vidyapith Connect!" : "The committee declined your uploaded certificate. Contact support to resolve.",
      type: status === 'approved' ? "success" : "alert",
      read: false,
      created_at: new Date().toISOString()
    });

    setUsers(RKMV_DB.getUsers());
    refreshSession();
  };

  return (
    <div className="admin-layout">
      {/* Page Title */}
      <div className="page-title-box" style={{ marginBottom: 0 }}>
        <div className="page-title-text">
          <h2>Administrative Control Center</h2>
          <p>Verify registration credentials, approve ex-student status, and monitor platform performance.</p>
        </div>
      </div>

      {/* Analytical Stats strip */}
      <div className="admin-stats-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', margin: '24px 0' }}>
        
        <div className="glass-panel admin-stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' }}>
          <div className="admin-stat-icon primary" style={{ background: 'rgba(243,112,33,0.1)', color: 'var(--primary-color)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number" style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>{users.length}</span>
            <span className="admin-stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Registered</span>
          </div>
        </div>

        <div className="glass-panel admin-stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' }}>
          <div className="admin-stat-icon success" style={{ background: 'rgba(104,211,145,0.1)', color: 'var(--text-success)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number" style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>{verifiedCount}</span>
            <span className="admin-stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified Alumni</span>
          </div>
        </div>

        <div className="glass-panel admin-stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' }}>
          <div className="admin-stat-icon gold" style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--accent-gold)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number" style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>{pendingList.length}</span>
            <span className="admin-stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending Verification</span>
          </div>
        </div>

        <div className="glass-panel admin-stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' }}>
          <div className="admin-stat-icon info" style={{ background: 'rgba(66,153,225,0.1)', color: '#4299e1', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <strong style={{ fontSize: '1.25rem' }}>₹</strong>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-number" style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>₹{donationTotal.toLocaleString('en-IN')}</span>
            <span className="admin-stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Contributions</span>
          </div>
        </div>

      </div>

      {/* Verification Queue Table Widget */}
      <div className="glass-panel admin-table-widget" style={{ padding: '24px' }}>
        <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'white' }}>Pending Alumni Verification Queue</h3>
          <span className="badge badge-role" style={{ fontSize: '0.75rem' }}>{pendingList.length} Pending Applications</span>
        </div>

        <div className="admin-table-container" style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 8px' }}>Applicant Details</th>
                <th style={{ padding: '12px 8px' }}>Batch / House</th>
                <th style={{ padding: '12px 8px' }}>Verification Doc</th>
                <th style={{ padding: '12px 8px' }}>Registered On</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <ShieldCheck size={36} style={{ marginBottom: '10px', color: 'var(--text-success)', display: 'inline-block' }} />
                    <p>Verification queue empty! All alumni applications have been successfully resolved.</p>
                  </td>
                </tr>
              ) : (
                pendingList.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '14px 8px' }}>
                      <div className="table-user-cell" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img 
                          src={u.profile_photo} 
                          alt={u.full_name} 
                          className="table-photo" 
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => onViewProfile(u.id)}
                        />
                        <div className="table-user-details">
                          <span className="table-user-name" onClick={() => onViewProfile(u.id)} style={{ fontWeight: 600, color: 'white', cursor: 'pointer' }}>{u.full_name}</span>
                          <span className="table-user-email" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      <div style={{ fontWeight: 600, color: 'white' }}>Batch of {u.batch_year}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.house}</div>
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      <a href="#" className="doc-link-btn" onClick={(e) => { e.preventDefault(); setCertPreviewUser(u); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-gold)', textDecoration: 'underline' }}>
                        <FileText size={14} />
                        <span>{u.certificate_url}</span>
                      </a>
                    </td>
                    <td style={{ padding: '14px 8px', color: 'var(--text-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                      <div className="admin-actions-cell" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          className="btn-icon approve" 
                          title="Approve Registration" 
                          onClick={() => handleResolveVerification(u.id, u.full_name, 'approved')}
                          style={{ background: 'rgba(104,211,145,0.1)', color: 'var(--text-success)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          className="btn-icon reject" 
                          title="Reject Application" 
                          onClick={() => handleResolveVerification(u.id, u.full_name, 'rejected')}
                          style={{ background: 'rgba(252,129,129,0.1)', color: 'var(--text-danger)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
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
          <div className="modal-card" style={{ maxWidth: '500px', padding: '24px', textAlign: 'center' }}>
            <div className="page-title-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: 'white' }}>
                <ShieldAlert size={18} style={{ color: 'var(--accent-gold)' }} />
                <span>School Document Verification</span>
              </h3>
              <button className="icon-btn" onClick={() => setCertPreviewUser(null)}>
                <X size={16} />
              </button>
            </div>
            
            {/* Premium Simulated Leaving Certificate */}
            <div id="certModalContent" style={{ background: '#fcfbf7', border: '12px double #0d233a', padding: '24px', borderRadius: '4px', color: '#0d233a', fontFamily: 'serif', textAlign: 'center' }}>
              <div style={{ border: '2px solid #c59b27', padding: '16px', position: 'relative' }}>
                <span style={{ fontSize: '1.1rem', letterSpacing: '0.1em', fontWeight: 700, color: '#0d233a', display: 'block', marginBottom: '4px' }}>RAMAKRISHNA MISSION VIDYAPITH</span>
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
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCertPreviewUser(null)}>
                <span>Close Document</span>
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, background: 'var(--text-success)', borderColor: 'var(--text-success)' }}
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
