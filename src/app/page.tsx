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
import { CreateScreen } from '../screens/CreateScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { MessagesScreen } from '../screens/MessagesScreen';

import { 
  Mail, Lock, User as UserIcon, Calendar, Home, Phone, UploadCloud, 
  CheckCircle, ArrowRight, X, Eye, EyeOff, ArrowLeft, Check, Sparkles,
  Search, BookOpen, Award, Briefcase, GraduationCap, Compass, Heart, Menu, ShieldCheck, ChevronRight,
  MapPin, UserPlus, MessageCircle, Globe
} from 'lucide-react';

interface ToastMsg {
  id: string;
  message: string;
  type: 'success' | 'danger' | 'info';
}

export default function App() {
  const { currentUser, login, register, refreshSession } = useAuth();
  
  const [activeScreen, setActiveScreen] = useState('feed');
  const [visitedScreens, setVisitedScreens] = useState<string[]>(['feed']);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      setVisitedScreens(['feed']);
    } else {
      setVisitedScreens(prev => prev.includes(activeScreen) ? prev : [...prev, activeScreen]);
    }
  }, [activeScreen, currentUser]);

  const triggerFeedRefresh = () => setFeedRefreshKey(k => k + 1);

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
  const [authError, setAuthError] = useState<string | null>(null);

  // Email OTP registration verification states
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(true);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Forgot password flow states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);

  // Profile Modal
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profileRelations, setProfileRelations] = useState<{ followers: any[]; following: any[]; connections: any[] } | null>(null);
  const [activeRelationsTab, setActiveRelationsTab] = useState<'followers' | 'following' | 'connections' | null>(null);
  const [relationsSearchQuery, setRelationsSearchQuery] = useState('');
  const [connections, setConnections] = useState<any[]>([]);
  const [connectionSentIds, setConnectionSentIds] = useState<string[]>([]);

  const getUsername = (user: any) => {
    if (user.email) {
      return user.email.split('@')[0];
    }
    return (user.full_name || 'user').toLowerCase().replace(/\s+/g, '_');
  };

  useEffect(() => {
    if (currentUser) {
      apiFetch('/directory/connections')
        .then(data => setConnections(data || []))
        .catch(err => console.error("Error loading connections:", err));
    } else {
      setConnections([]);
    }
  }, [currentUser]);

  // Landing Page & Auth Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setAuthError(null);
  }, [showAuthModal, authTab, selectedLoginRole]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAuthModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll Reveal Observer Effect
  useEffect(() => {
    if (currentUser) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => {
      // Immediately reveal elements already in the viewport
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('is-revealed');
      }
      observer.observe(el);
    });

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [currentUser]);

  const showToast = (message: string, type: 'success' | 'danger' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const loadRelations = (profileId: string) => {
    apiFetch(`/directory/relations/${profileId}`)
      .then(data => setProfileRelations(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    if (selectedProfileId) {
      apiFetch(`/directory/profile/${selectedProfileId}`)
        .then(data => setSelectedProfile(data))
        .catch(err => {
          showToast(err.message, 'danger');
          setSelectedProfileId(null);
        });
      loadRelations(selectedProfileId);
    } else {
      setSelectedProfile(null);
      setProfileRelations(null);
      setActiveRelationsTab(null);
      setRelationsSearchQuery('');
    }
  }, [selectedProfileId]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPass || isSubmitting) return;
    setAuthError(null);
    setIsSubmitting(true);
    
    try {
      const res = await login(loginEmail.trim(), loginPass);
      if (res.success) {
        showToast("Signed in successfully! Welcome back.", "success");
        setLoginEmail('');
        setLoginPass('');
        setShowAuthModal(false);
      } else {
        setAuthError(res.error || "Incorrect login credentials.");
        showToast(res.error || "Incorrect login credentials.", "danger");
      }
    } catch (err: any) {
      setAuthError(err.message || "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regBatch || !regHouse || !regPass || isSubmitting) {
      showToast("Please fill in all required fields.", "danger");
      return;
    }
    setAuthError(null);
    setIsSubmitting(true);

    try {
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
        setShowAuthModal(false);
      } else {
        setAuthError(res.error || "Registration failed.");
        showToast(res.error || "Registration failed.", "danger");
      }
    } catch (err: any) {
      setAuthError(err.message || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!regEmail.trim()) {
      showToast("Please enter an email address first.", "danger");
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await apiFetch('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email: regEmail.trim() })
      });
      setEmailOtpSent(true);
      showToast(`Verification OTP sent to ${regEmail} (Check console for mock OTP).`, "info");
      if (res.otp) {
        console.log("Mock Registration OTP:", res.otp);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to send OTP.", "danger");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!emailOtp.trim()) {
      showToast("Please enter the 6-digit OTP code.", "danger");
      return;
    }
    setVerifyingOtp(true);
    try {
      await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: regEmail.trim(), otp: emailOtp.trim() })
      });
      setEmailOtpVerified(true);
      showToast("Email address verified successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Invalid OTP code.", "danger");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      setForgotToken(res.token || '');
      setForgotStep(2);
      showToast("Verification code generated (Check console).", "info");
      console.log("Mock Reset Token:", res.token);
    } catch (err: any) {
      showToast(err.message || "No account found with this email.", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotToken || !forgotNewPass.trim()) return;
    setIsSubmitting(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: forgotToken.trim(), newPassword: forgotNewPass.trim() })
      });
      showToast("Password reset successfully. Please Sign In.", "success");
      setShowForgotModal(false);
      setForgotStep(1);
      setForgotEmail('');
      setForgotToken('');
      setForgotNewPass('');
      setAuthTab('login');
      setSelectedLoginRole(null);
    } catch (err: any) {
      showToast(err.message || "Password reset failed.", "danger");
    } finally {
      setIsSubmitting(false);
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

  const renderScreenInstance = (screenId: string) => {
    switch (screenId) {
      case 'feed':
      case 'discover':
      case 'batch':
      case 'memories':
      case 'reunions':
      case 'archives':
      case 'saved':
      case 'settings':
      case 'explore':
      case 'notes':
        return (
          <FeedScreen 
            showToast={showToast} 
            onViewProfile={setSelectedProfileId} 
            screenMode={screenId}
            refreshKey={feedRefreshKey}
            onNavigate={setActiveScreen}
          />
        );
      case 'profile':
        return (
          <FeedScreen 
            showToast={showToast} 
            onViewProfile={setSelectedProfileId} 
            screenMode="profile" 
            forceProfileId={currentUser?.id} 
            onNavigate={setActiveScreen}
          />
        );
      case 'notifications':
        return <NotificationsScreen showToast={showToast} onNavigate={setActiveScreen} />;
      case 'messages':
        return <MessagesScreen showToast={showToast} onViewProfile={setSelectedProfileId} onNavigate={setActiveScreen} />;
      case 'search':
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
      case 'create':
        return <CreateScreen showToast={showToast} setActiveScreen={setActiveScreen} onPublished={triggerFeedRefresh} />;
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
          {visitedScreens.map((screenId) => (
            <div
              key={screenId}
              style={{ display: activeScreen === screenId ? 'contents' : 'none' }}
            >
              {renderScreenInstance(screenId)}
            </div>
          ))}
        </Layout>
      ) : (
        <div className="landing-root">
          {/* Ambient Background Glows */}
          <div className="auth-ambient-glow">
            <div className="auth-sphere sphere-saffron"></div>
            <div className="auth-sphere sphere-gold"></div>
            <div className="auth-sphere sphere-navy"></div>
          </div>

          {/* Decorative Section Glows */}
          <div className="landing-background-glow glow-left"></div>
          <div className="landing-background-glow glow-right"></div>
          <div className="landing-background-glow glow-center"></div>

          {/* Sticky Navbar */}
          <nav className="landing-nav anim-fade-in-down">
            <div className="landing-nav-container">
              <a href="#" className="landing-nav-brand">
                <img src="/logo.png" alt="Emblem" className="landing-nav-logo" />
                <span className="landing-nav-title">Vidyapith Connect</span>
              </a>
              
              <div className="landing-nav-links">
                <a href="#heritage" className="landing-nav-link">Heritage</a>
                <a href="#stats" className="landing-nav-link">Network</a>
                <a href="#features" className="landing-nav-link">Features</a>
                <a href="#houses" className="landing-nav-link">Houses</a>
                <a href="#testimonials" className="landing-nav-link">Alumni Spotlight</a>
              </div>

              <div className="landing-nav-actions">
                <button onClick={() => { setAuthTab('login'); setSelectedLoginRole(null); setShowAuthModal(true); }} className="landing-btn-signin">Sign In</button>
                <button onClick={() => { setAuthTab('register'); setSelectedLoginRole(null); setShowAuthModal(true); setRegStep(1); }} className="landing-btn-join">Join Portal</button>
              </div>

              <button className="landing-nav-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            {/* Mobile Nav Menu */}
            {mobileMenuOpen && (
              <div className="landing-nav-mobile-menu">
                <a href="#heritage" className="landing-nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>Heritage</a>
                <a href="#stats" className="landing-nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>Network</a>
                <a href="#features" className="landing-nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>Features</a>
                <a href="#houses" className="landing-nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>Houses</a>
                <a href="#testimonials" className="landing-nav-mobile-link" onClick={() => setMobileMenuOpen(false)}>Alumni Spotlight</a>
                <div className="landing-nav-mobile-actions">
                  <button onClick={() => { setAuthTab('login'); setSelectedLoginRole(null); setShowAuthModal(true); setMobileMenuOpen(false); }} className="landing-btn-signin w-full">Sign In</button>
                  <button onClick={() => { setAuthTab('register'); setSelectedLoginRole(null); setShowAuthModal(true); setRegStep(1); setMobileMenuOpen(false); }} className="landing-btn-join w-full">Join Portal</button>
                </div>
              </div>
            )}
          </nav>

          {/* Hero Section */}
          <header className="landing-hero" id="hero">
            {/* Floating Sparkles & Particles */}
            <div className="landing-particles">
              <div className="landing-particle particle-1" style={{ left: '10%', animationDelay: '0s', animationDuration: '18s', width: '6px', height: '6px' }}></div>
              <div className="landing-particle particle-2" style={{ left: '30%', animationDelay: '2s', animationDuration: '22s', width: '8px', height: '8px' }}></div>
              <div className="landing-particle particle-3" style={{ left: '50%', animationDelay: '5s', animationDuration: '16s', width: '4px', height: '4px' }}></div>
              <div className="landing-particle particle-4" style={{ left: '70%', animationDelay: '1s', animationDuration: '25s', width: '10px', height: '10px' }}></div>
              <div className="landing-particle particle-5" style={{ left: '85%', animationDelay: '7s', animationDuration: '20s', width: '5px', height: '5px' }}></div>
            </div>

            <div className="landing-hero-inner">
              {/* Bright Temple Image Showcase Banner */}
              <div className="landing-hero-banner-wrapper anim-banner-zoom-in">
                <img src="/temple.jpg" alt="Universal Temple of Sri Ramakrishna" className="landing-hero-banner-img" />
                <div className="landing-hero-banner-glass-overlay">
                  <span>Universal Sri Ramakrishna Temple, Deoghar Vidyapith</span>
                </div>
              </div>
              
              <div className="landing-hero-content below-image">
                <div className="landing-hero-text-side">
                  <div className="landing-hero-badge anim-fade-in-up anim-delay-100">
                    <Sparkles size={14} className="text-accent-gold" />
                    <span>Over a Century of Spiritual & Academic Legacy</span>
                  </div>
                  <h1 className="landing-hero-title anim-fade-in-up anim-delay-200">
                    The Eternal Legacy of <span className="text-gradient-saffron">Vidyapith</span>
                  </h1>
                  <p className="landing-hero-subtitle anim-fade-in-up anim-delay-300">
                    Reconnecting generations of Ramakrishna Mission Vidyapith, Deoghar ex-students worldwide. Fostering a lifetime bond of brotherhood, character, and spiritual values.
                  </p>
                  <div className="landing-hero-actions anim-fade-in-up anim-delay-400">
                    <button 
                      onClick={() => { setAuthTab('login'); setSelectedLoginRole(null); setShowAuthModal(true); }} 
                      className="landing-btn-primary-glowing"
                    >
                      <span>Enter Portal</span>
                      <ArrowRight size={18} />
                    </button>
                    <a href="#features" className="landing-btn-secondary-glass">
                      <span>Explore Features</span>
                    </a>
                  </div>
                </div>

                <div className="landing-hero-visual-side">
                  <div className="landing-hero-glass-card anim-fade-in-up anim-delay-500">
                    <div className="glass-card-header">
                      <div className="pulse-dot"></div>
                      <span>Live Portal Status</span>
                    </div>
                    <div className="glass-card-stat">
                      <span className="stat-num">5,000+</span>
                      <span className="stat-label">Alumni Registered</span>
                    </div>
                    <div className="glass-card-list">
                      <div className="glass-card-list-item">
                        <GraduationCap size={16} className="text-saffron" />
                        <span>75+ Graduating Batches active</span>
                      </div>
                      <div className="glass-card-list-item">
                        <Compass size={16} className="text-blue" />
                        <span>Global reach across 30+ countries</span>
                      </div>
                      <div className="glass-card-list-item">
                        <Award size={16} className="text-gold" />
                        <span>1,200+ Mentorship Sessions conducted</span>
                      </div>
                    </div>
                    <div className="glass-card-footer">
                      <button 
                        onClick={() => { setAuthTab('register'); setSelectedLoginRole(null); setShowAuthModal(true); setRegStep(1); }} 
                        className="landing-glass-card-btn"
                      >
                        Verify & Join Network
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Heritage Section */}
          <section className="landing-heritage-section" id="heritage">
            <div className="landing-container">
              <div className="landing-heritage-grid">
                <div className="landing-heritage-visual reveal-on-scroll">
                  <div className="emblem-glowing-wrapper">
                    <img src="/logo.png" alt="Ramakrishna Mission Emblem" className="landing-heritage-emblem" />
                    <div className="glowing-halo"></div>
                  </div>
                </div>
                <div className="landing-heritage-text reveal-on-scroll stagger-1">
                  <div className="section-label">Heritage & Foundation</div>
                  <h2 className="section-title">Character Building Education</h2>
                  <p className="section-desc">
                    Founded in 1922, Ramakrishna Mission Vidyapith, Deoghar is a premier residential institution based on the man-making principles of Swami Vivekananda. The Universal Temple of Sri Ramakrishna stands as a beacon of harmony, spiritual strength, and academic excellence.
                  </p>
                  
                  <div className="vivekananda-quote-card">
                    <div className="quote-mark">“</div>
                    <p className="quote-text">
                      Education is the manifestation of the perfection already in man. We want that education by which character is formed, strength of mind is increased, the intellect is expanded, and by which one can stand on one's own feet.
                    </p>
                    <div className="quote-author">— Swami Vivekananda</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Row Section */}
          <section className="landing-stats-section" id="stats">
            <div className="landing-container">
              <div className="landing-stats-row">
                <div className="landing-stat-card reveal-on-scroll stagger-1">
                  <h3 className="stat-title">5,000+</h3>
                  <p className="stat-desc">Ex-Students Worldwide</p>
                </div>
                <div className="landing-stat-card reveal-on-scroll stagger-2">
                  <h3 className="stat-title">75+</h3>
                  <p className="stat-desc">Alumni Batches</p>
                </div>
                <div className="landing-stat-card reveal-on-scroll stagger-3">
                  <h3 className="stat-title">30+</h3>
                  <p className="stat-desc">Countries Represented</p>
                </div>
                <div className="landing-stat-card reveal-on-scroll stagger-4">
                  <h3 className="stat-title">1,200+</h3>
                  <p className="stat-desc">Mentorship Connections</p>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="landing-features-section" id="features">
            <div className="landing-container">
              <div className="section-header-centered reveal-on-scroll">
                <div className="section-label">Portal Experience</div>
                <h2 className="section-title">Designed for Vidyapith Brotherhood</h2>
                <p className="section-subtitle">
                  Reconnecting classmates, offering guidance, and supporting the school's developmental projects.
                </p>
              </div>

              <div className="landing-features-grid">
                <div className="landing-feature-card reveal-on-scroll stagger-1" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
                  <div className="feature-icon-wrap bg-saffron-transparent">
                    <UserIcon size={24} className="text-saffron" />
                  </div>
                  <h3 className="feature-card-title">Alumni Directory</h3>
                  <p className="feature-card-desc">
                    Find and filter batchmates by location, profession, industry, and student hostel (house).
                  </p>
                  <span className="feature-card-link">Explore Directory <ChevronRight size={14} /></span>
                </div>

                <div className="landing-feature-card reveal-on-scroll stagger-2" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
                  <div className="feature-icon-wrap bg-blue-transparent">
                    <BookOpen size={24} className="text-blue" />
                  </div>
                  <h3 className="feature-card-title">Mentorship Platform</h3>
                  <p className="feature-card-desc">
                    Experienced ex-students provide direct career counseling, exam guides, and life guidance to younger students.
                  </p>
                  <span className="feature-card-link">View Mentors <ChevronRight size={14} /></span>
                </div>

                <div className="landing-feature-card reveal-on-scroll stagger-3" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
                  <div className="feature-icon-wrap bg-gold-transparent">
                    <Briefcase size={24} className="text-gold" />
                  </div>
                  <h3 className="feature-card-title">Careers & Job Board</h3>
                  <p className="feature-card-desc">
                    Post job openings, request professional referrals, and discover career opportunities within the trusted alumni circle.
                  </p>
                  <span className="feature-card-link">Browse Jobs <ChevronRight size={14} /></span>
                </div>

                <div className="landing-feature-card reveal-on-scroll stagger-4" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
                  <div className="feature-icon-wrap bg-green-transparent">
                    <Calendar size={24} className="text-green" />
                  </div>
                  <h3 className="feature-card-title">Events & Reunions</h3>
                  <p className="feature-card-desc">
                    Coordinate batch get-togethers, Maharaj-led virtual satsangs, and regional ex-student meetups.
                  </p>
                  <span className="feature-card-link">See Schedule <ChevronRight size={14} /></span>
                </div>

                <div className="landing-feature-card reveal-on-scroll stagger-5" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
                  <div className="feature-icon-wrap bg-purple-transparent">
                    <Heart size={24} className="text-purple" />
                  </div>
                  <h3 className="feature-card-title">Philanthropy & Giving</h3>
                  <p className="feature-card-desc">
                    Contribute directly to student scholarship funds, healthcare units, and developmental projects of Vidyapith.
                  </p>
                  <span className="feature-card-link">Support Projects <ChevronRight size={14} /></span>
                </div>

                <div className="landing-feature-card reveal-on-scroll stagger-6" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
                  <div className="feature-icon-wrap bg-pink-transparent">
                    <Compass size={24} className="text-pink" />
                  </div>
                  <h3 className="feature-card-title">Stories & Archives</h3>
                  <p className="feature-card-desc">
                    Share text, image, and video stories. Save memories and look back at old campus snapshots.
                  </p>
                  <span className="feature-card-link">Enter Feed <ChevronRight size={14} /></span>
                </div>
              </div>
            </div>
          </section>

          {/* Houses Section */}
          <section className="landing-houses-section" id="houses">
            <div className="landing-container">
              <div className="section-header-centered">
                <div className="section-label">Campus Brotherhood</div>
                <h2 className="section-title">The Legend of the Houses</h2>
                <p className="section-subtitle">
                  Every Vidyapith ex-student carries a lifelong allegiance to their hostel house. Hover to reveal the house colors.
                </p>
              </div>

              <div className="landing-houses-grid">
                <div className="house-glow-card house-vivekananda">
                  <div className="house-color-strip bg-house-vivekananda"></div>
                  <h4 className="house-card-name">Vivekananda House</h4>
                  <p className="house-card-motto">Saffron - Strength & Renunciation</p>
                  <p className="house-card-text">Characterized by the fiery spirit of service and fearlessness, carrying the standard of Swami Vivekananda's ideals.</p>
                </div>

                <div className="house-glow-card house-brahmananda">
                  <div className="house-color-strip bg-house-brahmananda"></div>
                  <h4 className="house-card-name">Brahmananda House</h4>
                  <p className="house-card-motto">Blue - Calmness & Wisdom</p>
                  <p className="house-card-text">Fostering deep contemplation, balanced excellence, and academic devotion, inspired by the first President of the Order.</p>
                </div>

                <div className="house-glow-card house-ramakrishnananda">
                  <div className="house-color-strip bg-house-ramakrishnananda"></div>
                  <h4 className="house-card-name">Ramakrishnananda House</h4>
                  <p className="house-card-motto">Gold - Devotion & Steadfastness</p>
                  <p className="house-card-text">Pioneering in dedication, ritual discipline, and selfless love, mirroring Swami Ramakrishnananda's unshakeable devotion.</p>
                </div>

                <div className="house-glow-card house-shardananda">
                  <div className="house-color-strip bg-house-shardananda"></div>
                  <h4 className="house-card-name">Saradananda House</h4>
                  <p className="house-card-motto">Green - Harmony & Caring</p>
                  <p className="house-card-text">Nurturing a supportive brotherhood, organizational diligence, and compassion, in honor of Holy Mother's trusted companion.</p>
                </div>

                <div className="house-glow-card house-premananda">
                  <div className="house-color-strip bg-house-premananda"></div>
                  <h4 className="house-card-name">Premananda House</h4>
                  <p className="house-card-motto">Purple - Pure Love & Fellowship</p>
                  <p className="house-card-text">Famous for sweet camaraderie, selfless care, and an open heart, inspired by Swami Premananda's motherly love.</p>
                </div>

                <div className="house-glow-card house-yogananda">
                  <div className="house-color-strip bg-house-yogananda"></div>
                  <h4 className="house-card-name">Yogananda House</h4>
                  <p className="house-card-motto">Pink - Joy & Service</p>
                  <p className="house-card-text">Cultivating joy in action, discipline, and aesthetic appreciation, carrying forward Swami Yogananda's noble ideals.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials Section */}
          <section className="landing-testimonials-section" id="testimonials">
            <div className="landing-container">
              <div className="section-header-centered">
                <div className="section-label">Alumni Spotlights</div>
                <h2 className="section-title">Voices of the Brotherhood</h2>
                <p className="section-subtitle">
                  Hear from ex-students who are carrying the values of Vidyapith into the professional world.
                </p>
              </div>

              <div className="landing-testimonials-grid">
                <div className="landing-testimonial-card">
                  <p className="testimonial-text">
                    “Vidyapith formed the foundation of my moral character. Reconnecting with batchmates and guiding the current students through this portal is a matter of absolute privilege.”
                  </p>
                  <div className="testimonial-profile">
                    <div className="testimonial-avatar-placeholder bg-house-vivekananda">AR</div>
                    <div className="testimonial-info">
                      <h4 className="testimonial-name">Dr. Abhijit Ray</h4>
                      <p className="testimonial-title">Batch of 1988 • Vivekananda House</p>
                      <p className="testimonial-subtitle">Chief Oncologist, Apollo Hospitals</p>
                    </div>
                  </div>
                </div>

                <div className="landing-testimonial-card">
                  <p className="testimonial-text">
                    “From the ashram life in Deoghar to leading engineering projects in California, the values of self-reliance and brotherhood taught at Vidyapith are my guiding lights.”
                  </p>
                  <div className="testimonial-profile">
                    <div className="testimonial-avatar-placeholder bg-house-brahmananda">SS</div>
                    <div className="testimonial-info">
                      <h4 className="testimonial-name">Subhro Sen</h4>
                      <p className="testimonial-title">Batch of 2004 • Brahmananda House</p>
                      <p className="testimonial-subtitle">Principal Software Engineer, Google</p>
                    </div>
                  </div>
                </div>

                <div className="landing-testimonial-card">
                  <p className="testimonial-text">
                    “The mentorship program is outstanding. Offering mock interviews and civil service prep suggestions to the younger boys helps us keep the eternal torch of Vidyapith glowing.”
                  </p>
                  <div className="testimonial-profile">
                    <div className="testimonial-avatar-placeholder bg-house-ramakrishnananda">MC</div>
                    <div className="testimonial-info">
                      <h4 className="testimonial-name">Manish Chatterjee, IAS</h4>
                      <p className="testimonial-title">Batch of 1995 • Ramakrishnananda House</p>
                      <p className="testimonial-subtitle">Joint Secretary, Ministry of Finance</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Banner Section */}
          <section className="landing-cta-section">
            <div className="landing-container">
              <div className="landing-cta-banner">
                <div className="cta-banner-content">
                  <h2 className="cta-title">Join the Vidyapith Connect Brotherhood</h2>
                  <p className="cta-desc">
                    Verify your ex-student certificate, find batchmates, share jobs, and give back to the ashram.
                  </p>
                  <div className="cta-actions">
                    <button 
                      onClick={() => { setAuthTab('register'); setSelectedLoginRole(null); setShowAuthModal(true); setRegStep(1); }} 
                      className="landing-btn-primary-glowing-gold"
                    >
                      Verify & Join Now
                    </button>
                    <button 
                      onClick={() => { setAuthTab('login'); setSelectedLoginRole(null); setShowAuthModal(true); }} 
                      className="landing-btn-secondary-outline"
                    >
                      Sign In to Your Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer Section */}
          <footer className="landing-footer">
            <div className="landing-container">
              <div className="landing-footer-grid">
                <div className="landing-footer-brand">
                  <div className="footer-logo-wrap">
                    <img src="/logo.png" alt="Emblem" className="footer-logo" />
                    <h4>Vidyapith Connect</h4>
                  </div>
                  <p className="footer-brand-desc">
                    Ramakrishna Mission Vidyapith, Deoghar Alumni Platform. Fostering connections, mentorship, and support since 1922.
                  </p>
                </div>
                <div className="landing-footer-links-col">
                  <h5>Quick Links</h5>
                  <a href="#hero">Back to Top</a>
                  <a href="#heritage">Legacy & Heritage</a>
                  <a href="#stats">Network Stats</a>
                  <a href="#features">Features</a>
                  <a href="#houses">Hostel Houses</a>
                </div>
                <div className="landing-footer-links-col">
                  <h5>Institutional</h5>
                  <a href="https://rkmvdeoghar.org" target="_blank" rel="noopener noreferrer">Official Website</a>
                  <a href="https://belurmath.org" target="_blank" rel="noopener noreferrer">Ramakrishna Math & Mission</a>
                  <a href="#heritage">Sri Ramakrishna Temple</a>
                </div>
                <div className="landing-footer-links-col">
                  <h5>Contact</h5>
                  <p>Ramakrishna Mission Vidyapith,</p>
                  <p>Ramakrishna Nagar, Deoghar,</p>
                  <p>Jharkhand - 814112, India</p>
                  <p className="mt-2 text-white">praktani@rkmvdeoghar.org</p>
                </div>
              </div>
              <div className="landing-footer-bottom">
                <p>© 2026 Deoghar Vidyapith Praktani (Alumni) Association. All rights reserved.</p>
                <div className="footer-bottom-badges">
                  <span className="badge-item"><ShieldCheck size={14} /> Verified Ex-Students Only</span>
                </div>
              </div>
            </div>
          </footer>

          {/* Authentication Modal Drawer Overlay */}
          {showAuthModal && (
            <div className="landing-auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
              <div className="landing-auth-modal-content" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="landing-auth-modal-close" 
                  onClick={() => setShowAuthModal(false)}
                  aria-label="Close form"
                >
                  <X size={24} />
                </button>

                <div className="auth-premium-container">
                  {/* Brand Logo */}
                  <div className="auth-brand-badge">
                    <img src="/logo.png" alt="Vidyapith Emblem" className="auth-brand-logo-image" />
                  </div>
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

                  {/* Error Alert Box */}
                  {authError && (
                    <div 
                      style={{ 
                        background: '#fef2f2', 
                        border: '1px solid #fecaca', 
                        borderRadius: '8px', 
                        padding: '10px 14px', 
                        color: '#dc2626', 
                        fontSize: '0.85rem', 
                        fontWeight: 500, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '16px',
                        width: '100%',
                        boxSizing: 'border-box',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
                      <span style={{ flexGrow: 1 }}>{authError}</span>
                    </div>
                  )}

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
                              placeholder={selectedLoginRole === 'admin' ? "admin@example.com" : selectedLoginRole === 'alumni' ? "alumni@example.com" : "student@example.com"} 
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="auth-input-label">Password</label>
                            <button
                              type="button"
                              onClick={() => { setShowForgotModal(true); setForgotStep(1); }}
                              style={{ background: 'none', border: 'none', color: '#ec4899', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                            >
                              Forgot Password?
                            </button>
                          </div>
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
                        <button 
                          type="submit" 
                          disabled={isSubmitting}
                          className="btn btn-primary btn-block" 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px', 
                            marginTop: '24px', 
                            width: '100%', 
                            padding: '13px',
                            opacity: isSubmitting ? 0.6 : 1,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <span>{isSubmitting ? "Signing In..." : "Sign In"}</span>
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
                          {/* Certificate upload segment */}
                          <div>
                            <div className="auth-input-block" style={{ marginBottom: '16px' }}>
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

                            {/* Submit button */}
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
                                disabled={isSubmitting || !emailOtpVerified}
                                className="btn btn-primary"
                                style={{ 
                                  flexGrow: 1, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  gap: '8px',
                                  opacity: (isSubmitting || !emailOtpVerified) ? 0.6 : 1,
                                  cursor: (isSubmitting || !emailOtpVerified) ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <span>{isSubmitting ? "Submitting..." : "Submit Registration"}</span>
                                <CheckCircle size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
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
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '680px', width: '90%', background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflowY: 'auto', maxHeight: '90vh', position: 'relative', color: '#1e293b' }}>
            
            {/* Close button */}
            <button 
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', outline: 'none' }} 
              onClick={() => setSelectedProfileId(null)}
            >
              <X size={20} />
            </button>

            {/* Top Section Info */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
              <div className="profile-avatar-gradient-ring">
                <img 
                  src={selectedProfile.profile_photo} 
                  alt={selectedProfile.full_name} 
                  style={{ width: '100px', height: '100px' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>{selectedProfile.full_name}</h3>
                  <span className="profile-header-badge" style={{ padding: '4px 10px', fontSize: '0.7rem' }}>
                    Class of {selectedProfile.batch_year}
                  </span>
                  {selectedProfile.role === 'admin' && (
                    <span className="profile-header-badge" style={{ padding: '4px 10px', fontSize: '0.7rem' }}>🛡️ Admin</span>
                  )}
                  {selectedProfile.verify_status === 'approved' && (
                    <span className="profile-header-badge" style={{ padding: '4px 10px', fontSize: '0.7rem' }}>✓ Verified</span>
                  )}
                </div>

                <div style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
                  {selectedProfile.profession} at {selectedProfile.company || 'Not specified'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: '#64748b' }}>
                  <MapPin size={12} style={{ color: '#f43f5e' }} /> 
                  {selectedProfile.city}, {selectedProfile.country}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {currentUser && currentUser.id !== selectedProfile.id && (
                <button 
                  className="btn-ig-black" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    handleProfileConnect(selectedProfile.id, selectedProfile.full_name);
                  }}
                >
                  <UserPlus size={16} /> Connect Request
                </button>
              )}
              <button 
                className="btn-ig-grey" 
                style={{ flex: 1 }}
                onClick={() => showToast(`Opening chat with ${selectedProfile.full_name}`, 'info')}
              >
                <MessageCircle size={16} /> Message
              </button>
            </div>

            {/* Metrics Row */}
            <div className="profile-stats-grid" style={{ marginTop: 0, marginBottom: '24px' }}>
              <div className="profile-stat-box" style={{ padding: '12px' }}>
                <span className="profile-stat-number" style={{ fontSize: '1.3rem' }}>128</span>
                <span className="profile-stat-label" style={{ fontSize: '0.75rem' }}>Posts</span>
              </div>
              <div 
                className="profile-stat-box" 
                style={{ padding: '12px', cursor: 'pointer' }}
                onClick={() => setActiveRelationsTab('followers')}
              >
                <span className="profile-stat-number" style={{ fontSize: '1.3rem' }}>
                  {profileRelations ? profileRelations.followers.length : '24.8K'}
                </span>
                <span className="profile-stat-label" style={{ fontSize: '0.75rem' }}>Followers</span>
              </div>
              <div 
                className="profile-stat-box" 
                style={{ padding: '12px', cursor: 'pointer' }}
                onClick={() => setActiveRelationsTab('following')}
              >
                <span className="profile-stat-number" style={{ fontSize: '1.3rem' }}>
                  {profileRelations ? profileRelations.following.length : '312'}
                </span>
                <span className="profile-stat-label" style={{ fontSize: '0.75rem' }}>Following</span>
              </div>
              <div 
                className="profile-stat-box" 
                style={{ padding: '12px', cursor: 'pointer' }}
                onClick={() => setActiveRelationsTab('connections')}
              >
                <span className="profile-stat-number" style={{ fontSize: '1.3rem' }}>
                  {profileRelations ? profileRelations.connections.length : '1.2K'}
                </span>
                <span className="profile-stat-label" style={{ fontSize: '0.75rem' }}>Connections</span>
              </div>
              <div className="profile-stat-box" style={{ padding: '12px' }}>
                <span className="profile-stat-number" style={{ fontSize: '1.3rem' }}>48</span>
                <span className="profile-stat-label" style={{ fontSize: '0.75rem' }}>Mentorships</span>
              </div>
            </div>

            {/* Side-by-Side Widgets */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {/* About Column */}
              <div style={{ flex: 1.3, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} style={{ color: '#a855f7' }} /> About
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                    {selectedProfile.bio || "Alumni Portal member contributing to Deoghar Vidyapith's development and spiritual ecosystem."}
                  </p>
                </div>

                {/* Contact details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569' }}>
                    <span>Email Address:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedProfile.privacy?.show_email ? selectedProfile.email : "📧 Locked"}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569' }}>
                    <span>Mobile Contact:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedProfile.privacy?.show_mobile ? selectedProfile.mobile : "📞 Locked"}
                    </strong>
                  </div>
                </div>

                <div>
                  <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); showToast("Opening website...", "info"); }} 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}
                  >
                    <Globe size={14} style={{ color: '#3b82f6' }} /> {selectedProfile.full_name ? selectedProfile.full_name.toLowerCase().replace(/\s+/g, '') + '.dev' : 'portfolio.dev'}
                  </a>
                </div>
              </div>

              {/* Highlights Column */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={14} style={{ color: '#22c55e' }} /> Highlights
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['Education', 'Achievements', 'Reunion', 'Career', 'Events', 'Travel', 'Mentorship'].map(tag => (
                    <span 
                      key={tag} 
                      style={{ background: '#f1f5f9', color: '#0f172a', padding: '6px 12px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 600, border: '1px solid #e2e8f0' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* RELATIONS MODAL OVERLAY */}
            {activeRelationsTab && profileRelations && (
              <div 
                className="modal-overlay" 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveRelationsTab(null);
                  setRelationsSearchQuery('');
                }}
                style={{ 
                  position: 'fixed', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  background: 'rgba(15,23,42,0.3)', 
                  backdropFilter: 'blur(8px)', 
                  zIndex: 2000, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}
              >
                <div 
                  className="modal-card" 
                  onClick={(e) => e.stopPropagation()}
                  style={{ 
                    maxWidth: '440px', 
                    width: '90%', 
                    background: '#ffffff', 
                    borderRadius: '16px', 
                    padding: '0', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', 
                    color: '#1e293b', 
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '70vh',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}
                >
                  {/* Modal Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 16px', borderBottom: '1px solid #efefef', position: 'relative' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#000000', textTransform: 'capitalize', textAlign: 'center' }}>
                      {activeRelationsTab === 'connections' ? 'Connections' : activeRelationsTab}
                    </h3>
                    <button 
                      style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#000000', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', outline: 'none' }} 
                      onClick={() => {
                        setActiveRelationsTab(null);
                        setRelationsSearchQuery('');
                      }}
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Search Bar Container */}
                  <div style={{ padding: '12px 16px 8px 16px', position: 'relative' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', color: '#9ca3af' }} />
                      <input 
                        type="text"
                        value={relationsSearchQuery}
                        onChange={(e) => setRelationsSearchQuery(e.target.value)}
                        placeholder="Search"
                        style={{
                          width: '100%',
                          background: '#f3f4f6',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px 8px 36px',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      {relationsSearchQuery && (
                        <button 
                          onClick={() => setRelationsSearchQuery('')}
                          style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Relations list */}
                  <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 16px 16px 16px' }}>
                    {(() => {
                      const list = profileRelations[activeRelationsTab] || [];
                      const filtered = list.filter((u: any) => {
                        const uname = getUsername(u);
                        const fname = u.full_name || '';
                        const q = relationsSearchQuery.toLowerCase();
                        return uname.toLowerCase().includes(q) || fname.toLowerCase().includes(q);
                      });

                      if (filtered.length === 0) {
                        return (
                          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', padding: '32px 0', margin: 0 }}>
                            No results found.
                          </p>
                        );
                      }

                      return filtered.map((u: any) => {
                        const username = getUsername(u);
                        const isSelf = currentUser?.id === u.id;
                        const doIFollowThem = connections.some((c: any) => c.id === u.id) || connectionSentIds.includes(u.id) || isSelf;

                        return (
                          <div 
                            key={u.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              padding: '8px 0'
                            }}
                          >
                            {/* Avatar */}
                            <img 
                              src={u.profile_photo} 
                              alt={u.full_name} 
                              style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                              onClick={() => {
                                setActiveRelationsTab(null);
                                setRelationsSearchQuery('');
                                setSelectedProfileId(u.id);
                              }}
                            />

                            {/* Name & Details */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                <span 
                                  style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', cursor: 'pointer' }}
                                  onClick={() => {
                                    setActiveRelationsTab(null);
                                    setRelationsSearchQuery('');
                                    setSelectedProfileId(u.id);
                                  }}
                                >
                                  {username}
                                </span>
                                {!doIFollowThem && (
                                  <span 
                                    onClick={async () => {
                                      try {
                                        await apiFetch('/directory/connect', {
                                          method: 'POST',
                                          body: JSON.stringify({ targetId: u.id })
                                        });
                                        setConnectionSentIds(prev => [...prev, u.id]);
                                        showToast(`Connection request sent to ${u.full_name}!`, 'success');
                                        if (selectedProfileId) loadRelations(selectedProfileId);
                                      } catch (err: any) {
                                        showToast(err.message, 'danger');
                                      }
                                    }}
                                    style={{ fontSize: '0.88rem', color: '#0095f6', fontWeight: 600, cursor: 'pointer' }}
                                  >
                                    · Follow
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                {u.full_name}
                              </span>
                            </div>

                            {/* Action Button */}
                            <div>
                              {isSelf ? (
                                <span style={{ fontSize: '0.82rem', color: '#9ca3af', fontWeight: 600 }}>You</span>
                              ) : activeRelationsTab === 'followers' ? (
                                <button
                                  onClick={async () => {
                                    if (confirm(`Remove ${u.full_name} as a follower?`)) {
                                      await apiFetch(`/directory/connections/${u.id}`, { method: 'DELETE' });
                                      showToast(`Removed ${u.full_name} from followers`, 'success');
                                      if (selectedProfileId) loadRelations(selectedProfileId);
                                    }
                                  }}
                                  style={{
                                    background: '#f3f4f6',
                                    border: 'none',
                                    padding: '6px 12px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: '#000000',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Remove
                                </button>
                              ) : activeRelationsTab === 'following' ? (
                                <button
                                  onClick={async () => {
                                    if (confirm(`Unfollow ${u.full_name}?`)) {
                                      await apiFetch(`/directory/connections/${u.id}`, { method: 'DELETE' });
                                      showToast(`Unfollowed ${u.full_name}`, 'info');
                                      setConnections(prev => prev.filter(c => c.id !== u.id));
                                      if (selectedProfileId) loadRelations(selectedProfileId);
                                    }
                                  }}
                                  style={{
                                    background: '#f3f4f6',
                                    border: 'none',
                                    padding: '6px 12px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: '#000000',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {connectionSentIds.includes(u.id) ? 'Requested' : 'Following'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setActiveRelationsTab(null);
                                    setRelationsSearchQuery('');
                                    setSelectedProfileId(u.id);
                                  }}
                                  style={{
                                    background: '#f3f4f6',
                                    border: 'none',
                                    padding: '6px 12px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: '#000000',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  View
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {showForgotModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '440px', width: '90%', background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', color: '#1e293b', position: 'relative' }}>
            <button 
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', outline: 'none' }} 
              onClick={() => setShowForgotModal(false)}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 10px', color: '#0f172a' }}>Forgot Password</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
              Reset your password via verified secure token.
            </p>

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestPasswordReset}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Email Address</label>
                  <input 
                    type="email" 
                    placeholder="your.email@example.com" 
                    required 
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%', padding: '12px' }}>
                  Send Verification Code
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Verification Token</label>
                  <input 
                    type="text" 
                    placeholder="Enter reset token from console" 
                    required 
                    value={forgotToken}
                    onChange={(e) => setForgotToken(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>New Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    required 
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%', padding: '12px' }}>
                  Reset Password
                </button>
              </form>
            )}
          </div>
        </div>
      )}


    </>
  );
}
