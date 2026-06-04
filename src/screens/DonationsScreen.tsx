"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RKMV_DB, Donation } from '../database/database';
import { Heart, X, CreditCard, ShieldCheck, Download, Award, Flame } from 'lucide-react';

interface DonationsScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

export const DonationsScreen: React.FC<DonationsScreenProps> = ({ showToast, onViewProfile }) => {
  const { currentUser } = useAuth();
  
  // Stats and state
  const [activeDonations, setActiveDonations] = useState<Donation[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ user: any; total_amount: number }[]>([]);
  const [progressWidth, setProgressWidth] = useState('0%');

  // Checkout modal state
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutCause, setCheckoutCause] = useState('');
  const [checkoutAmount, setCheckoutAmount] = useState('');
  
  // Checkout cards details
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  // Verification stage
  const [checkoutStage, setCheckoutStage] = useState<'details' | 'otp' | 'receipt'>('details');
  const [otpCode, setOtpCode] = useState('');
  const [generatedDonation, setGeneratedDonation] = useState<Donation | null>(null);

  const loadDonationData = () => {
    const list = RKMV_DB.getDonations();
    setActiveDonations(list);
    setLeaderboard(RKMV_DB.getDonationLeaderboard());
  };

  useEffect(() => {
    loadDonationData();
    setTimeout(() => {
      setProgressWidth('63.5%');
    }, 100);
  }, []);

  if (!currentUser) return null;

  const openCheckout = (cause: string) => {
    setCheckoutCause(cause);
    setCheckoutStage('details');
    setCheckoutAmount('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setOtpCode('');
    setGeneratedDonation(null);
    setCheckoutModalVisible(true);
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(checkoutAmount) < 100) {
      showToast("Minimum donation amount is ₹100.", "danger");
      return;
    }
    if (cardNumber.length < 16) {
      showToast("Please enter a valid 16-digit card number.", "danger");
      return;
    }
    setCheckoutStage('otp');
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      showToast("Please enter a valid 6-digit verification code.", "danger");
      return;
    }

    const donationVal = parseInt(checkoutAmount);
    const newDonation: Donation = {
      id: 'don-' + Math.random().toString(36).substr(2, 9),
      donor_id: currentUser.id,
      amount_paise: donationVal * 100,
      cause: checkoutCause,
      razorpay_id: 'pay_' + Math.random().toString(36).substr(2, 12).toUpperCase(),
      payment_status: 'approved',
      receipt_url: `receipt_Exempt80G_${Math.floor(Math.random() * 10000)}.pdf`,
      show_on_leaderboard: showLeaderboard,
      created_at: new Date().toISOString()
    };

    RKMV_DB.addDonation(newDonation);
    setGeneratedDonation(newDonation);
    showToast("Contribution accepted! Joy Sri Ramakrishna! 🙏", "success");

    // Push notification to user
    RKMV_DB.addNotification({
      id: 'not-' + Math.random().toString(36).substr(2, 9),
      user_id: currentUser.id,
      title: "Donation Successful",
      body: `Donated ₹${donationVal.toLocaleString('en-IN')} to ${checkoutCause}. 80G tax receipt ready.`,
      type: "success",
      read: false,
      created_at: new Date().toISOString()
    });

    setCheckoutStage('receipt');
    loadDonationData();
  };

  const downloadReceipt = (filename: string) => {
    showToast(`80G tax receipt saved to downloads: ${filename}`, 'info');
  };

  return (
    <div className="donations-layout">
      {/* Main Info */}
      <div className="donations-main-info">
        <div className="page-title-box" style={{ marginBottom: 0 }}>
          <div className="page-title-text">
            <h2>Support RKMV Deoghar</h2>
            <p>Contribute towards infrastructure developments and student scholarships. All donations are 100% tax exempted under Section 80G.</p>
          </div>
        </div>

        {/* Total Raised Stats Thermometer */}
        <div className="glass-panel donation-stats-widget" style={{ padding: '24px', marginBottom: '24px' }}>
          <div className="progress-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Vidyapith Centennial Infrastructure Extension Fund</h3>
            <span className="total-raised" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-color)' }}>₹22,25,000</span>
          </div>
          
          <div className="donation-progress-bar-wrap" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', height: '10px', overflow: 'hidden', marginBottom: '10px' }}>
            <div className="donation-progress-fill" style={{ width: progressWidth, background: 'var(--primary-gradient)', height: '100%', borderRadius: '10px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
          </div>

          <div className="progress-footer-stats" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Goal: ₹35,00,000</span>
            <span id="progressPercent" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>63% Completed</span>
            <span>Donors: 112 Alumni</span>
          </div>
        </div>

        {/* Causes list */}
        <div className="donation-causes-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Cause 1 */}
          <div className="glass-panel cause-card" style={{ display: 'flex', gap: '20px', padding: '24px', alignItems: 'center' }}>
            <div className="cause-emblem-box" style={{ fontSize: '2.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🏢</div>
            <div className="cause-content-box" style={{ flexGrow: 1 }}>
              <h3 className="cause-title">Brahmananda Hostel Renovation</h3>
              <p className="cause-desc" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '6px 0 14px' }}>
                Renovation of student dormitories, washroom blocks, and corridors in the historic Brahmananda Sadhanalaya. Providing fresh bunk beds and modern study desks.
              </p>
              <div className="cause-action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="cause-stats" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Funded: <strong style={{ color: 'white' }}>₹8,50,000</strong> of ₹15,00,000</span>
                <button className="btn btn-primary btn-sm" onClick={() => openCheckout('Brahmananda Hostel Renovation')}>
                  <Heart size={14} style={{ marginRight: '6px' }} />
                  <span>Donate to Cause</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cause 2 */}
          <div className="glass-panel cause-card" style={{ display: 'flex', gap: '20px', padding: '24px', alignItems: 'center' }}>
            <div className="cause-emblem-box" style={{ fontSize: '2.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🎓</div>
            <div className="cause-content-box" style={{ flexGrow: 1 }}>
              <h3 className="cause-title">Vidyapith Rural Scholarship Fund</h3>
              <p className="cause-desc" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '6px 0 14px' }}>
                Sponsorship for highly meritorious students coming from rural families below the poverty line. Covers board, boarding, tuition, books, and uniforms.
              </p>
              <div className="cause-action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="cause-stats" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Funded: <strong style={{ color: 'white' }}>₹11,25,000</strong> of ₹12,00,000</span>
                <button className="btn btn-primary btn-sm" onClick={() => openCheckout('Vidyapith Rural Scholarship Fund')}>
                  <Heart size={14} style={{ marginRight: '6px' }} />
                  <span>Donate to Cause</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cause 3 */}
          <div className="glass-panel cause-card" style={{ display: 'flex', gap: '20px', padding: '24px', alignItems: 'center' }}>
            <div className="cause-emblem-box" style={{ fontSize: '2.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>💻</div>
            <div className="cause-content-box" style={{ flexGrow: 1 }}>
              <h3 className="cause-title">Vivekananda Computer Lab Extension</h3>
              <p className="cause-desc" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '6px 0 14px' }}>
                Expanding our campus IT infrastructure with 30 new high-performance desktop computers, gigabit network switches, AI starter toolkits, and robotics hardware kits.
              </p>
              <div className="cause-action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="cause-stats" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Funded: <strong style={{ color: 'white' }}>₹2,50,000</strong> of ₹8,00,000</span>
                <button className="btn btn-primary btn-sm" onClick={() => openCheckout('Vivekananda Computer Lab Extension')}>
                  <Heart size={14} style={{ marginRight: '6px' }} />
                  <span>Donate to Cause</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sidebar - Leaderboard */}
      <div className="donations-sidebar">
        <div className="glass-panel leaderboard-widget" style={{ padding: '20px' }}>
          <h3 className="widget-title" style={{ marginBottom: '16px' }}>Donor Honor Roll</h3>
          
          <div className="leaderboard-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {leaderboard.length === 0 ? (
              <div className="loading-state" style={{ minHeight: '150px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No donations registered yet.</p>
              </div>
            ) : (
              leaderboard.map((item, index) => {
                const u = item.user;
                const rank = index + 1;
                let rankEmblem = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank.toString();
                
                return (
                  <div key={u.id} className="leader-item" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="leader-rank" style={{ width: '24px', textAlign: 'center', fontWeight: 700 }}>{rankEmblem}</span>
                    <img 
                      src={u.profile_photo} 
                      alt={u.full_name} 
                      className="leader-photo" 
                      onClick={() => onViewProfile(u.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div className="leader-info" style={{ flexGrow: 1 }}>
                      <span className="leader-name" onClick={() => onViewProfile(u.id)} style={{ fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>{u.full_name}</span>
                      <span className="leader-batch" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Batch of {u.batch_year}</span>
                    </div>
                    <span className="leader-amount" style={{ fontWeight: 700, color: 'var(--text-success)' }}>₹{(item.total_amount / 100).toLocaleString('en-IN')}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="motto-box" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <p className="motto-text">"Charity does not decrease wealth."<br />— Swami Vivekananda</p>
          </div>
        </div>
      </div>

      {/* Checkout Modal Overlay */}
      {checkoutModalVisible && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-card payment-card" style={{ maxWidth: '480px' }}>
            {/* Header simulated razorpay */}
            <div className="payment-header" style={{ padding: '24px', background: 'rgba(18, 33, 56, 0.4)', borderBottom: '1px solid var(--border-color)', textAlign: 'center', position: 'relative' }}>
              <button className="icon-btn" onClick={() => setCheckoutModalVisible(false)} style={{ position: 'absolute', right: '16px', top: '16px' }}>
                <X size={16} />
              </button>
              
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3399FF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Flame size={20} style={{ fill: '#3399FF', strokeWidth: 0.5 }} />
                <span>razorpay</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Secure Alumni Payment Gateway</p>
              
              <div style={{ marginTop: '14px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Cause supported:</span>
                <strong style={{ color: 'var(--accent-gold)', fontSize: '0.95rem' }}>{checkoutCause}</strong>
              </div>
            </div>

            {/* Stages */}
            <div className="payment-body" style={{ padding: '24px' }}>
              {checkoutStage === 'details' && (
                <form onSubmit={handleDetailsSubmit}>
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Donation Amount (₹)</label>
                    <div className="input-with-icon" style={{ position: 'relative' }}>
                      <i style={{ fontStyle: 'normal', fontWeight: 700, color: 'var(--text-muted)', left: '14px', top: '50%', transform: 'translateY(-50%)', position: 'absolute' }}>₹</i>
                      <input 
                        type="number" 
                        placeholder="Enter amount (Min: ₹100)" 
                        required 
                        min={100}
                        value={checkoutAmount}
                        onChange={(e) => setCheckoutAmount(e.target.value)}
                        style={{ paddingLeft: '28px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Simulated Card Number</label>
                    <div className="input-with-icon" style={{ position: 'relative' }}>
                      <CreditCard size={16} className="search-icon" style={{ top: '50%', transform: 'translateY(-50%)', left: '12px' }} />
                      <input 
                        type="text" 
                        placeholder="4111 2222 3333 4444" 
                        required 
                        maxLength={16}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                        style={{ paddingLeft: '38px' }}
                      />
                    </div>
                  </div>

                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Expiry (MM/YY)</label>
                      <input 
                        type="text" 
                        placeholder="12/29" 
                        required 
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>CVV</label>
                      <input 
                        type="password" 
                        placeholder="•••" 
                        required 
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <input 
                      type="checkbox" 
                      id="showLeaderboardCheck" 
                      checked={showLeaderboard}
                      onChange={(e) => setShowLeaderboard(e.target.checked)}
                      style={{ marginTop: '4px', cursor: 'pointer' }}
                    />
                    <label htmlFor="showLeaderboardCheck" style={{ textTransform: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      Show my name on the public donor leaderboard
                    </label>
                  </div>

                  <button type="submit" className="btn btn-block" style={{ background: '#3399FF', color: 'white' }}>
                    <span>Simulate Pay Gateway Connection</span>
                  </button>
                </form>
              )}

              {checkoutStage === 'otp' && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="spinner" style={{ borderTopColor: '#3399FF', margin: '0 auto 10px' }}></div>
                  <h3 style={{ fontSize: '1.1rem' }}>Simulating 3D-Secure 2.0 Verification</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Razorpay simulation requires OTP confirmation. Enter the mock 6-digit verification code.
                  </p>
                  
                  <form onSubmit={handleOtpSubmit}>
                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <input 
                        type="text" 
                        placeholder="123456" 
                        required 
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        style={{
                          width: '100%', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.2em', 
                          padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', 
                          color: 'white', borderRadius: '4px'
                        }}
                      />
                    </div>
                    <button type="submit" className="btn btn-block" style={{ background: '#48bb78', color: 'white' }}>
                      <span>Submit Verification Code</span>
                    </button>
                  </form>
                </div>
              )}

              {checkoutStage === 'receipt' && generatedDonation && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <ShieldCheck size={52} style={{ color: 'var(--text-success)', margin: '0 auto 6px' }} />
                  <h3 style={{ color: 'var(--text-success)', fontSize: '1.25rem' }}>Transaction Successful</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Your transaction has been processed securely. A confirmation receipt has been sent to <strong>{currentUser.email}</strong>.
                  </p>
                  
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', textAlign: 'left', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Receipt ID:</span> 
                      <strong style={{ float: 'right', color: 'white' }}>{generatedDonation.razorpay_id}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Amount Donated:</span> 
                      <strong style={{ float: 'right', color: 'var(--text-success)' }}>₹{parseInt(checkoutAmount).toLocaleString('en-IN')}.00</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>80G Tax Exemption:</span> 
                      <strong style={{ float: 'right', color: 'var(--accent-gold)' }}>₹{parseInt(checkoutAmount).toLocaleString('en-IN')}.00 (100% Deductible)</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Cause Supported:</span> 
                      <span style={{ float: 'right', fontWeight: 700, color: 'white', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {checkoutCause}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => downloadReceipt(generatedDonation.receipt_url)}>
                      <Download size={14} />
                      <span>80G Receipt</span>
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setCheckoutModalVisible(false)}>
                      <span>Back to Portal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

