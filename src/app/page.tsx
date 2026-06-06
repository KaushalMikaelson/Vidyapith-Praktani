"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../database/database';
import { Layout } from '../components/Layout';
import { apiFetch } from '../utils/api';

// Screens
import { FeedScreen } from '../screens/FeedScreen';
import { DirectoryScreen } from '../screens/DirectoryScreen';
import { MentorshipScreen } from '../screens/MentorshipScreen';
import { DonationsScreen } from '../screens/DonationsScreen';
import { EventsScreen } from '../screens/EventsScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { JobsScreen } from '../screens/JobsScreen';
import { AdminScreen } from '../screens/AdminScreen';

// Icons
import { Mail, Lock, User as UserIcon, Calendar, Home, Phone, UploadCloud, CheckCircle, ArrowRight, X, Eye, EyeOff, ArrowLeft, Check, Sparkles } from 'lucide-react';

interface ToastMsg {
  id: string;
  message: string;
  type: 'success' | 'danger' | 'info';
}

export default function App() {
  const { currentUser, login, register } = useAuth();
  
  const [activeScreen, setActiveScreen] = useState('feed');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Auth Modals Tabs
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  
  // Login Form details
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register Form details
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBatch, setRegBatch] = useState('');
  const [regHouse, setRegHouse] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regFile, setRegFile] = useState<File | null>(null);

  // Stepper & UI States
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [selectedLoginRole, setSelectedLoginRole] = useState<'alumni' | 'student' | 'admin' | null>(null);

  // Profile Modal
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<User | null>(null);

  const showToast = (message: string, type: 'success' | 'danger' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    if (selectedProfileId) {
      apiFetch(`/directory/profile/${selectedProfileId}`)
        .then(data => setSelectedProfile(data))
        .catch(err => {
          showToast(err.message, 'danger');
          setSelectedProfileId(null);
        });
    } else {
      setSelectedProfile(null);
    }
  }, [selectedProfileId]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPass) return;
    
    const res = await login(loginEmail.trim(), loginPass);
    if (res.success) {
      showToast("Signed in successfully! Welcome back.", "success");
      setLoginEmail('');
      setLoginPass('');
    } else {
      showToast(res.error || "Incorrect login credentials.", "danger");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regBatch || !regHouse || !regPass) {
      showToast("Please fill in all required fields.", "danger");
      return;
    }

    const res = await register({
      full_name: regName.trim(),
      email: regEmail.trim(),
      batch_year: regBatch,
      house: regHouse,
      mobile: regMobile.trim(),
      password: regPass,
      certificate_name: regFile ? regFile.name : "Certificate_Scan.pdf"
    });

    if (res.success) {
      showToast("Registration requested! The ex-student verification committee will review your leaving certificate within 24 hours.", "success");
      setRegName('');
      setRegEmail('');
      setRegBatch('');
      setRegHouse('');
      setRegMobile('');
      setRegPass('');
      setRegFile(null);
      setAuthTab('login');
      setRegStep(1);
    } else {
      showToast(res.error || "Registration failed.", "danger");
    }
  };

  const getHouseColor = (house: string) => {
    const colors: { [key: string]: string } = {
      "Vivekananda House": "#f37021",
      "Brahmananda House": "#4299e1",
      "Ramakrishnananda House": "#d4af37",
      "Shardananda House": "#48bb78",
      "Premananda House": "#9f7aec",
      "Yogananda House": "#ed64a6",
      "Monastery": "#ff6f00"
    };
    return colors[house] || "rgba(255,255,255,0.15)";
  };

  const handleProfileConnect = async (id: string, name: string) => {
    try {
      await apiFetch('/directory/connect', {
        method: 'POST',
        body: JSON.stringify({ targetId: id })
      });
      showToast(`Connection request sent to ${name}!`, "success");
      setSelectedProfileId(null);
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'feed':
      case 'discover':
      case 'batch':
      case 'memories':
      case 'reunions':
      case 'archives':
      case 'saved':
      case 'settings':
      case 'messages':
      case 'explore':
      case 'notes':
        return (
          <FeedScreen 
            showToast={showToast} 
            onViewProfile={setSelectedProfileId} 
            screenMode={activeScreen} 
          />
        );
      case 'profile':
        return (
          <FeedScreen 
            showToast={showToast} 
            onViewProfile={setSelectedProfileId} 
            screenMode="profile" 
            forceProfileId={currentUser?.id} 
          />
        );
      case 'directory':
        return <DirectoryScreen showToast={showToast} onViewProfile={setSelectedProfileId} />;
      case 'careers':
      case 'jobs':
        return <JobsScreen showToast={showToast} onViewProfile={setSelectedProfileId} />;
      case 'mentorship':
        return <MentorshipScreen showToast={showToast} onViewProfile={setSelectedProfileId} />;
      case 'events':
        return <EventsScreen showToast={showToast} />;
      case 'donations':
        return <DonationsScreen showToast={showToast} onViewProfile={setSelectedProfileId} />;
      case 'news':
        return <NewsScreen showToast={showToast} />;
      case 'admin':
        return <AdminScreen showToast={showToast} onViewProfile={setSelectedProfileId} />;
      default:
        return <h2>Page Not Found</h2>;
    }
  };

  return (
    <>
      {currentUser ? (
        <Layout 
          activeScreen={activeScreen} 
          setActiveScreen={setActiveScreen} 
          setSelectedProfileId={setSelectedProfileId}
          showToast={showToast}
        >
          {renderActiveScreen()}
        </Layout>
      ) : (
        <div className="auth-page-wrapper">
          {/* Ambient Animation Spheres */}
          <div className="auth-ambient-glow">
            <div className="auth-sphere sphere-saffron"></div>
            <div className="auth-sphere sphere-gold"></div>
            <div className="auth-sphere sphere-navy"></div>
          </div>

          <div className="auth-premium-container">
            {/* Brand Logo */}
            <div className="auth-brand-badge">🏵️</div>
            <h2 className="auth-title-gradient">Vidyapith Connect</h2>
            <p className="auth-subtitle">Ramakrishna Mission Vidyapith, Deoghar Alumni Platform</p>

            {/* Custom Premium Tabs */}
            <div className="auth-premium-tabs">
              <button 
                className={`auth-premium-tab-btn ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthTab('login'); setSelectedLoginRole(null); }}
              >
                <Sparkles size={16} />
                <span>Sign In</span>
              </button>
              <button 
                className={`auth-premium-tab-btn ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthTab('register'); setSelectedLoginRole(null); }}
              >
                <UserIcon size={16} />
                <span>Register</span>
              </button>
            </div>

            {authTab === 'login' ? (
              selectedLoginRole === null ? (
                /* Role Selector before Sign In */
                <div className="auth-role-selection-wrapper">
                  <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Select Your Portal Path
                  </div>
                  <div className="auth-role-grid">
                    {/* Alumni Portal */}
                    <div className="auth-role-card role-alumni">
                      <div className="auth-role-icon-wrap">
                        <Sparkles size={24} />
                      </div>
                      <h4 className="auth-role-title">Alumni</h4>
                      <p className="auth-role-desc">Reconnect with classmates, share jobs, and mentor students.</p>
                      <button 
                        type="button" 
                        className="auth-role-action-btn btn-enter"
                        onClick={() => { setSelectedLoginRole('alumni'); setLoginEmail(''); setLoginPass(''); }}
                      >
                        <span>Sign In</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    {/* Student Portal */}
                    <div className="auth-role-card role-student">
                      <div className="auth-role-icon-wrap">
                        <UserIcon size={24} />
                      </div>
                      <h4 className="auth-role-title">Student</h4>
                      <p className="auth-role-desc">Seek career advice, find ex-student mentors, and explore jobs.</p>
                      <button 
                        type="button" 
                        className="auth-role-action-btn btn-enter"
                        onClick={() => { setSelectedLoginRole('student'); setLoginEmail(''); setLoginPass(''); }}
                      >
                        <span>Sign In</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    {/* Admin Portal */}
                    <div className="auth-role-card role-admin">
                      <div className="auth-role-icon-wrap">
                        <Lock size={24} />
                      </div>
                      <h4 className="auth-role-title">Admin</h4>
                      <p className="auth-role-desc">Verify certificate uploads, approve accounts, and manage platform.</p>
                      <button 
                        type="button" 
                        className="auth-role-action-btn btn-enter"
                        onClick={() => { setSelectedLoginRole('admin'); setLoginEmail(''); setLoginPass(''); }}
                      >
                        <span>Sign In</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Role Specific Login Form */
                <form onSubmit={handleLoginSubmit}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className={`auth-role-context-badge ${selectedLoginRole}`}>
                      {selectedLoginRole === 'admin' ? "🏵️" : selectedLoginRole === 'alumni' ? "👨‍🎓" : "🧑‍💻"}
                      <span>{selectedLoginRole} Portal Login</span>
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="auth-input-block">
                    <label className="auth-input-label">Email Address</label>
                    <div className="auth-input-field-wrap">
                      <Mail className="auth-input-icon" size={18} />
                      <input 
                        type="email" 
                        placeholder={selectedLoginRole === 'admin' ? "swami@rkmv.org" : selectedLoginRole === 'alumni' ? "aurobindo@google.com" : "tatha.m@student.org"} 
                        required 
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                      {loginEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail) && (
                        <div className="auth-field-valid-check">
                          <Check size={16} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div className="auth-input-block">
                    <label className="auth-input-label">Password</label>
                    <div className="auth-input-field-wrap">
                      <Lock className="auth-input-icon" size={18} />
                      <input 
                        type={showLoginPass ? "text" : "password"} 
                        placeholder="••••••••" 
                        required 
                        value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                      />
                      {loginPass.length >= 6 && (
                        <div className="auth-field-valid-check" style={{ right: '42px' }}>
                          <Check size={16} />
                        </div>
                      )}
                      <button 
                        type="button" 
                        className="auth-pass-toggle-btn"
                        onClick={() => setShowLoginPass(!showLoginPass)}
                      >
                        {showLoginPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Action */}
                  <button type="submit" className="btn btn-primary btn-block" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '24px', width: '100%', padding: '13px' }}>
                    <span>Sign In</span>
                    <ArrowRight size={18} />
                  </button>

                  {/* Back to Roles Selector */}
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-block" 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px', width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white' }}
                    onClick={() => setSelectedLoginRole(null)}
                  >
                    <ArrowLeft size={18} />
                    <span>Back to Portal Roles</span>
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleRegisterSubmit}>
                {/* 3-Step Wizard Stepper */}
                <div className="auth-stepper-header">
                  <div className="auth-stepper-line-bg"></div>
                  <div 
                    className="auth-stepper-line-active" 
                    style={{ width: regStep === 1 ? '0%' : regStep === 2 ? '50%' : '100%' }}
                  ></div>

                  {/* Step 1 Node */}
                  <div className={`auth-step-node ${regStep > 1 ? 'completed' : regStep === 1 ? 'active' : ''}`}>
                    <div className="auth-step-circle">
                      {regStep > 1 ? <Check size={16} /> : "1"}
                    </div>
                    <span className="auth-step-name">Credentials</span>
                  </div>

                  {/* Step 2 Node */}
                  <div className={`auth-step-node ${regStep > 2 ? 'completed' : regStep === 2 ? 'active' : ''}`}>
                    <div className="auth-step-circle">
                      {regStep > 2 ? <Check size={16} /> : "2"}
                    </div>
                    <span className="auth-step-name">Identity</span>
                  </div>

                  {/* Step 3 Node */}
                  <div className={`auth-step-node ${regStep === 3 ? 'active' : ''}`}>
                    <div className="auth-step-circle">3</div>
                    <span className="auth-step-name">Verify</span>
                  </div>
                </div>

                {/* Step 1 Contents: Basic Info & Password */}
                {regStep === 1 && (
                  <div className="auth-step-container">
                    {/* Full Name */}
                    <div className="auth-input-block">
                      <label className="auth-input-label">Full Name (As in School)</label>
                      <div className="auth-input-field-wrap">
                        <UserIcon className="auth-input-icon" size={18} />
                        <input 
                          type="text" 
                          placeholder="Vivekananda Roy" 
                          required 
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                        />
                        {regName.trim().length >= 3 && (
                          <div className="auth-field-valid-check">
                            <Check size={16} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email Address */}
                    <div className="auth-input-block">
                      <label className="auth-input-label">Email Address</label>
                      <div className="auth-input-field-wrap">
                        <Mail className="auth-input-icon" size={18} />
                        <input 
                          type="email" 
                          placeholder="vivek.roy@example.com" 
                          required 
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                        />
                        {regEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail) && (
                          <div className="auth-field-valid-check">
                            <Check size={16} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Create Password */}
                    <div className="auth-input-block">
                      <label className="auth-input-label">Create Password</label>
                      <div className="auth-input-field-wrap">
                        <Lock className="auth-input-icon" size={18} />
                        <input 
                          type={showRegPass ? "text" : "password"} 
                          placeholder="••••••••" 
                          required 
                          value={regPass}
                          onChange={(e) => setRegPass(e.target.value)}
                        />
                        {regPass.length >= 6 && (
                          <div className="auth-field-valid-check" style={{ right: '42px' }}>
                            <Check size={16} />
                          </div>
                        )}
                        <button 
                          type="button" 
                          className="auth-pass-toggle-btn"
                          onClick={() => setShowRegPass(!showRegPass)}
                        >
                          {showRegPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="auth-btn-row">
                      <button 
                        type="button" 
                        className="btn btn-primary btn-block"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '13px' }}
                        disabled={regName.trim().length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail) || regPass.length < 6}
                        onClick={() => setRegStep(2)}
                      >
                        <span>Continue to School Info</span>
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2 Contents: Vidyapith Identity */}
                {regStep === 2 && (
                  <div className="auth-step-container">
                    <div className="auth-form-row">
                      {/* Batch Year */}
                      <div className="auth-input-block">
                        <label className="auth-input-label">Batch Year (Leaving Class X/XII)</label>
                        <div className="auth-input-field-wrap">
                          <Calendar className="auth-input-icon" size={18} />
                          <input 
                            type="number" 
                            placeholder="2008" 
                            min="1950" 
                            max="2026" 
                            required 
                            value={regBatch}
                            onChange={(e) => setRegBatch(e.target.value)}
                          />
                          {parseInt(regBatch) >= 1950 && parseInt(regBatch) <= 2026 && (
                            <div className="auth-field-valid-check">
                              <Check size={16} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* House Dropdown */}
                      <div className="auth-input-block">
                        <label className="auth-input-label">House (Hostel)</label>
                        <div className="auth-input-field-wrap">
                          <Home className="auth-input-icon" size={18} />
                          <select 
                            required 
                            value={regHouse}
                            onChange={(e) => setRegHouse(e.target.value)}
                          >
                            <option value="" disabled>Select House...</option>
                            <option value="Vivekananda House">Vivekananda House</option>
                            <option value="Brahmananda House">Brahmananda House</option>
                            <option value="Ramakrishnananda House">Ramakrishnananda House</option>
                            <option value="Shardananda House">Shardananda House</option>
                            <option value="Premananda House">Premananda House</option>
                            <option value="Yogananda House">Yogananda House</option>
                          </select>
                          {regHouse && (
                            <div className="auth-field-valid-check" style={{ right: '28px' }}>
                              <Check size={16} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Number */}
                    <div className="auth-input-block">
                      <label className="auth-input-label">Mobile Number</label>
                      <div className="auth-input-field-wrap">
                        <Phone className="auth-input-icon" size={18} />
                        <input 
                          type="tel" 
                          placeholder="+91 9876543210" 
                          required 
                          value={regMobile}
                          onChange={(e) => setRegMobile(e.target.value)}
                        />
                        {regMobile.trim().length >= 10 && (
                          <div className="auth-field-valid-check">
                            <Check size={16} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="auth-btn-row">
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => setRegStep(1)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <ArrowLeft size={18} />
                        <span>Back</span>
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary"
                        style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        disabled={!regBatch || !regHouse || regMobile.trim().length < 10}
                        onClick={() => setRegStep(3)}
                      >
                        <span>Verify Certificate</span>
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3 Contents: Leaving Certificate / Marksheet Verification */}
                {regStep === 3 && (
                  <div className="auth-step-container">
                    <div className="auth-input-block">
                      <label className="auth-input-label">Upload Leaving Certificate / Marksheet</label>
                      <div 
                        className={`auth-upload-drag-box ${regFile ? 'has-file' : ''}`}
                        onClick={() => document.getElementById('certInput')?.click()}
                      >
                        <UploadCloud size={32} style={{ color: regFile ? 'var(--text-success)' : 'var(--text-muted)', marginBottom: '8px', display: 'inline-block' }} />
                        <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: regFile ? 'var(--text-success)' : 'white' }}>
                          {regFile ? `📄 ${regFile.name}` : "Click to select certificate scan (PDF/JPG)"}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          This document is strictly used for school identity validation.
                        </span>
                        <input 
                          type="file" 
                          id="certInput" 
                          accept="image/*,application/pdf" 
                          style={{ display: 'none' }} 
                          onChange={(e) => e.target.files && setRegFile(e.target.files[0])}
                        />
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="auth-btn-row">
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => setRegStep(2)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <ArrowLeft size={18} />
                        <span>Back</span>
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <span>Submit Registration</span>
                        <CheckCircle size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating toast notification panel */}
      <div className="toast-container" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`} style={{
            display: 'flex', alignItems: 'center', gap: '10px', background: toast.type === 'success' ? 'rgba(72,187,120,0.95)' : toast.type === 'danger' ? 'rgba(252,129,129,0.95)' : 'rgba(66,153,225,0.95)',
            color: 'white', padding: '12px 20px', borderRadius: '4px', boxShadow: 'var(--shadow-md)', transition: 'all 0.3s ease'
          }}>
            <span style={{ fontSize: '1.1rem' }}>{toast.type === 'success' ? '✅' : toast.type === 'danger' ? '⚠️' : 'ℹ️'}</span>
            <span className="toast-message" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Single Detailed Profile View Modal Overlay */}
      {selectedProfile && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-card profile-modal-card" style={{ maxWidth: '650px', background: 'var(--bg-dark)' }}>
            
            {/* Cover header */}
            <div className="profile-cover" style={{ background: `linear-gradient(135deg, var(--secondary-color) 0%, ${getHouseColor(selectedProfile.house)} 100%)`, height: '140px', position: 'relative' }}>
              <button 
                className="icon-btn" 
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.4)', border: 'none' }} 
                onClick={() => setSelectedProfileId(null)}
              >
                <X size={16} style={{ color: 'white' }} />
              </button>
              
              <div className="profile-avatar-large-wrap" style={{ position: 'absolute', bottom: '-40px', left: '30px' }}>
                <img 
                  src={selectedProfile.profile_photo} 
                  alt={selectedProfile.full_name} 
                  className="profile-avatar-large" 
                  style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--bg-dark)' }} 
                />
              </div>
            </div>

            {/* Modal Body content */}
            <div className="profile-modal-body" style={{ padding: '60px 30px 30px' }}>
              
              <div className="profile-details-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h3 className="profile-details-name" style={{ fontSize: '1.4rem', color: 'white' }}>{selectedProfile.full_name}</h3>
                  <div className="profile-details-sub" style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>Batch of {selectedProfile.batch_year}</span>
                    <span>•</span>
                    <span>{selectedProfile.house}</span>
                  </div>
                </div>
                <div className="badge badge-role" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>{selectedProfile.role}</div>
              </div>

              {/* Specifications grid */}
              <div className="profile-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginBottom: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '6px' }}>
                <div className="profile-detail-item">
                  <span className="profile-detail-label" style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Current Designation</span>
                  <span className="profile-detail-value" style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{selectedProfile.profession}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label" style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Company / Institute</span>
                  <span className="profile-detail-value" style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{selectedProfile.company}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label" style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Location City</span>
                  <span className="profile-detail-value" style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{selectedProfile.city}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label" style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Country</span>
                  <span className="profile-detail-value" style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{selectedProfile.country}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label" style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Email Address</span>
                  <span className="profile-detail-value" style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>
                    {selectedProfile.privacy?.show_email ? selectedProfile.email : "📧 Locked by User"}
                  </span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label" style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Mobile Contact</span>
                  <span className="profile-detail-value" style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>
                    {selectedProfile.privacy?.show_mobile ? selectedProfile.mobile : "📞 Locked by User"}
                  </span>
                </div>
              </div>

              {/* Bio and memories */}
              <div className="profile-bio-box" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '6px', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-gold)', marginBottom: '8px' }}>Alumni Bio & School Memories</h4>
                <p className="profile-bio-text" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {selectedProfile.bio}
                </p>
              </div>

              {/* Actions row */}
              <div className="profile-modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {selectedProfile.linkedin_url && (
                  <a href={selectedProfile.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-linkedin"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                    <span>LinkedIn</span>
                  </a>
                )}
                {currentUser && currentUser.id !== selectedProfile.id && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleProfileConnect(selectedProfile.id, selectedProfile.full_name)}
                  >
                    <span>Connect Request</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
