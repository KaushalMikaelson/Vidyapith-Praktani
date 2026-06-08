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

// Icons
import { 
  Mail, Lock, User as UserIcon, Calendar, Home, Phone, UploadCloud, 
  CheckCircle, ArrowRight, X, Eye, EyeOff, ArrowLeft, Check, Sparkles,
  Search, BookOpen, Award, Briefcase, GraduationCap, Compass, Heart, Menu, ShieldCheck, ChevronRight
} from 'lucide-react';

interface ToastMsg {
  id: string;
  message: string;
  type: 'success' | 'danger' | 'info';
}

export default function App() {
  const { currentUser, login, register } = useAuth();
  
  const [activeScreen, setActiveScreen] = useState('feed');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

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

  // Profile Modal
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<User | null>(null);

  // Landing Page & Auth Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAuthModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      setShowAuthModal(false);
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
      setShowAuthModal(false);
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
      case 'explore':
      case 'notes':
        return (
          <FeedScreen 
            showToast={showToast} 
            onViewProfile={setSelectedProfileId} 
            screenMode={activeScreen}
            refreshKey={feedRefreshKey}
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
      case 'notifications':
        return <NotificationsScreen showToast={showToast} />;
      case 'messages':
        return <MessagesScreen showToast={showToast} onViewProfile={setSelectedProfileId} />;
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
          {renderActiveScreen()}
        </Layout>
      ) : (
        <div className="landing-root">
          {/* Ambient Background Glows */}
          <div className="auth-ambient-glow">
            <div className="auth-sphere sphere-saffron"></div>
            <div className="auth-sphere sphere-gold"></div>
            <div className="auth-sphere sphere-navy"></div>
          </div>

          {/* Sticky Navbar */}
          <nav className="landing-nav">
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
            <div className="landing-hero-bg-wrapper">
              <img src="/temple.jpg" alt="Universal Temple" className="landing-hero-bg" />
              <div className="landing-hero-overlay"></div>
            </div>
            
            <div className="landing-hero-content">
              <div className="landing-hero-text-side">
                <div className="landing-hero-badge">
                  <Sparkles size={14} className="text-accent-gold" />
                  <span>Over a Century of Spiritual & Academic Legacy</span>
                </div>
                <h1 className="landing-hero-title">
                  The Eternal Legacy of <span className="text-gradient-saffron">Vidyapith</span>
                </h1>
                <p className="landing-hero-subtitle">
                  Reconnecting generations of Ramakrishna Mission Vidyapith, Deoghar ex-students worldwide. Fostering a lifetime bond of brotherhood, character, and spiritual values.
                </p>
                <div className="landing-hero-actions">
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
                <div className="landing-hero-glass-card">
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
          </header>

          {/* Heritage Section */}
          <section className="landing-heritage-section" id="heritage">
            <div className="landing-container">
              <div className="landing-heritage-grid">
                <div className="landing-heritage-visual">
                  <div className="emblem-glowing-wrapper">
                    <img src="/logo.png" alt="Ramakrishna Mission Emblem" className="landing-heritage-emblem" />
                    <div className="glowing-halo"></div>
                  </div>
                </div>
                <div className="landing-heritage-text">
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
                <div className="landing-stat-card">
                  <h3 className="stat-title">5,000+</h3>
                  <p className="stat-desc">Ex-Students Worldwide</p>
                </div>
                <div className="landing-stat-card">
                  <h3 className="stat-title">75+</h3>
                  <p className="stat-desc">Alumni Batches</p>
                </div>
                <div className="landing-stat-card">
                  <h3 className="stat-title">30+</h3>
                  <p className="stat-desc">Countries Represented</p>
                </div>
                <div className="landing-stat-card">
                  <h3 className="stat-title">1,200+</h3>
                  <p className="stat-desc">Mentorship Connections</p>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="landing-features-section" id="features">
            <div className="landing-container">
              <div className="section-header-centered">
                <div className="section-label">Portal Experience</div>
                <h2 className="section-title">Designed for Vidyapith Brotherhood</h2>
                <p className="section-subtitle">
                  Reconnecting classmates, offering guidance, and supporting the school's developmental projects.
                </p>
              </div>

              <div className="landing-features-grid">
                <div className="landing-feature-card" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
                  <div className="feature-icon-wrap bg-saffron-transparent">
                    <UserIcon size={24} className="text-saffron" />
                  </div>
                  <h3 className="feature-card-title">Alumni Directory</h3>
                  <p className="feature-card-desc">
                    Find and filter batchmates by location, profession, industry, and student hostel (house).
                  </p>
                  <span className="feature-card-link">Explore Directory <ChevronRight size={14} /></span>
                </div>

                <div className="landing-feature-card" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
                  <div className="feature-icon-wrap bg-blue-transparent">
                    <BookOpen size={24} className="text-blue" />
                  </div>
                  <h3 className="feature-card-title">Mentorship Platform</h3>
                  <p className="feature-card-desc">
                    Experienced ex-students provide direct career counseling, exam guides, and life guidance to younger students.
                  </p>
                  <span className="feature-card-link">View Mentors <ChevronRight size={14} /></span>
                </div>

                <div className="landing-feature-card" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
                  <div className="feature-icon-wrap bg-gold-transparent">
                    <Briefcase size={24} className="text-gold" />
                  </div>
                  <h3 className="feature-card-title">Careers & Job Board</h3>
                  <p className="feature-card-desc">
                    Post job openings, request professional referrals, and discover career opportunities within the trusted alumni circle.
                  </p>
                  <span className="feature-card-link">Browse Jobs <ChevronRight size={14} /></span>
                </div>

                <div className="landing-feature-card" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
                  <div className="feature-icon-wrap bg-green-transparent">
                    <Calendar size={24} className="text-green" />
                  </div>
                  <h3 className="feature-card-title">Events & Reunions</h3>
                  <p className="feature-card-desc">
                    Coordinate batch get-togethers, Maharaj-led virtual satsangs, and regional ex-student meetups.
                  </p>
                  <span className="feature-card-link">See Schedule <ChevronRight size={14} /></span>
                </div>

                <div className="landing-feature-card" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
                  <div className="feature-icon-wrap bg-purple-transparent">
                    <Heart size={24} className="text-purple" />
                  </div>
                  <h3 className="feature-card-title">Philanthropy & Giving</h3>
                  <p className="feature-card-desc">
                    Contribute directly to student scholarship funds, healthcare units, and developmental projects of Vidyapith.
                  </p>
                  <span className="feature-card-link">Support Projects <ChevronRight size={14} /></span>
                </div>

                <div className="landing-feature-card" onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}>
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
