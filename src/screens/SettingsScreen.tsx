"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { Shield, Eye, User as UserIcon, Building, Briefcase, MapPin, Globe, Link, Check, X, GitBranch } from 'lucide-react';

interface SettingsScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
}

const INDUSTRIES = ["Technology", "Finance", "Healthcare", "Education", "Government", "Consulting", "Entrepreneurship", "Other"];
const HELP_OPTIONS = ["Career Guidance", "Mentorship", "Job Referrals", "Internship Referrals", "Mock Interviews", "Startup Advice", "Higher Studies Guidance", "Networking"];
const LOOKING_FOR_OPTIONS = ["Networking", "Mentorship", "Job Opportunities", "Business Partnerships", "Hiring Talent", "Investors", "Co-founders"];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ showToast }) => {
  const { currentUser, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy'>('profile');
  const [saving, setSaving] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [profession, setProfession] = useState('');
  const [company, setCompany] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [personalUrl, setPersonalUrl] = useState('');
  const [department, setDepartment] = useState('');
  const [industry, setIndustry] = useState('');
  const [mobile, setMobile] = useState('');
  
  // New States
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [helpCategories, setHelpCategories] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [mentorshipStatus, setMentorshipStatus] = useState('Not Available');

  // Upgraded Professional States
  const [designation, setDesignation] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [education, setEducation] = useState('');
  const [openFor, setOpenFor] = useState<string[]>([]);

  // Privacy State
  const [showEmail, setShowEmail] = useState(true);
  const [showMobile, setShowMobile] = useState(false);
  const [showSocial, setShowSocial] = useState(true);

  // Populate state with currentUser details
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name || '');
      setBio(currentUser.bio || '');
      setProfession(currentUser.profession || '');
      setCompany(currentUser.company || '');
      setCity(currentUser.city || '');
      setCountry(currentUser.country || 'India');
      setProfilePhoto(currentUser.profile_photo || '');
      setLinkedinUrl(currentUser.linkedin_url || '');
      setGithubUrl(currentUser.github_url || '');
      setPortfolioUrl(currentUser.portfolio_url || '');
      setPersonalUrl(currentUser.personal_url || '');
      setDepartment(currentUser.department || '');
      setIndustry(currentUser.industry || '');
      setMobile(currentUser.mobile || '');
      setShowEmail(currentUser.privacy?.show_email ?? true);
      setShowMobile(currentUser.privacy?.show_mobile ?? false);
      setShowSocial((currentUser.privacy as any)?.show_social ?? true);
      
      setSkills(currentUser.skills || []);
      setHelpCategories(currentUser.help_categories || []);
      setLookingFor(currentUser.looking_for || []);
      setMentorshipStatus(currentUser.mentorship_status || 'Not Available');

      setDesignation(currentUser.designation || '');
      setYearsOfExperience(currentUser.years_of_experience ? String(currentUser.years_of_experience) : '');
      setEducation(currentUser.education || '');
      setOpenFor(currentUser.open_for || []);
    }
  }, [currentUser]);

  if (!currentUser) return null;

  // Tag helper functions
  const handleSkillInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = skillInput.trim().replace(/,$/, '');
      if (val && !skills.includes(val)) {
        setSkills([...skills, val]);
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleHelpCheckboxChange = (opt: string) => {
    if (helpCategories.includes(opt)) {
      setHelpCategories(helpCategories.filter(x => x !== opt));
    } else {
      setHelpCategories([...helpCategories, opt]);
    }
  };

  const handleLookingForCheckboxChange = (opt: string) => {
    if (lookingFor.includes(opt)) {
      setLookingFor(lookingFor.filter(x => x !== opt));
    } else {
      setLookingFor([...lookingFor, opt]);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Validate URLs
    const isValidUrl = (url: string): boolean => {
      if (!url) return true;
      const urlRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/i;
      return urlRegex.test(url);
    };

    if (linkedinUrl && !isValidUrl(linkedinUrl)) {
      showToast("Invalid LinkedIn URL. Must start with http:// or https://", "danger");
      setSaving(false);
      return;
    }
    if (githubUrl && !isValidUrl(githubUrl)) {
      showToast("Invalid GitHub URL. Must start with http:// or https://", "danger");
      setSaving(false);
      return;
    }
    if (portfolioUrl && !isValidUrl(portfolioUrl)) {
      showToast("Invalid Portfolio URL. Must start with http:// or https://", "danger");
      setSaving(false);
      return;
    }
    if (personalUrl && !isValidUrl(personalUrl)) {
      showToast("Invalid Personal Website URL. Must start with http:// or https://", "danger");
      setSaving(false);
      return;
    }

    try {
      await apiFetch('/directory/profile/update', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          bio,
          profession_category: profession,
          company,
          city,
          country,
          profile_photo: profilePhoto,
          linkedin_url: linkedinUrl,
          github_url: githubUrl,
          portfolio_url: portfolioUrl,
          personal_url: personalUrl,
          department,
          industry,
          mobile,
          skills,
          help_categories: helpCategories,
          looking_for: lookingFor,
          mentorship_status: mentorshipStatus,
          designation,
          years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience) : 0,
          education,
          open_for: openFor,
          show_social: showSocial
        })
      });
      showToast("Profile details updated successfully!", "success");
      refreshSession();
    } catch (err: any) {
      showToast(err.message || "Failed to update profile details.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const handlePrivacySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/directory/profile/update', {
        method: 'POST',
        body: JSON.stringify({
          show_email: showEmail,
          show_mobile: showMobile,
          show_social: showSocial
        })
      });
      showToast("Privacy preferences saved successfully!", "success");
      refreshSession();
    } catch (err: any) {
      showToast(err.message || "Failed to save privacy preferences.", "danger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '24px', padding: '24px', minHeight: 'calc(100vh - 100px)', flexWrap: 'wrap' }}>
      {/* Settings Navigation Sidebar */}
      <div style={{ width: '280px', flexShrink: 0 }} className="glass-panel">
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Account Settings</h3>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>Control your identity and visibility</p>
        </div>
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button 
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('profile')}
            style={{ width: '100%', justifyContent: 'flex-start', gap: '10px', display: 'flex', alignItems: 'center', padding: '12px' }}
          >
            <UserIcon size={16} />
            <span>Profile Details</span>
          </button>
          <button 
            className={`btn ${activeTab === 'privacy' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('privacy')}
            style={{ width: '100%', justifyContent: 'flex-start', gap: '10px', display: 'flex', alignItems: 'center', padding: '12px' }}
          >
            <Shield size={16} />
            <span>Privacy Preferences</span>
          </button>
        </div>
      </div>

      {/* Settings Form Body */}
      <div style={{ flexGrow: 1, minWidth: '320px' }} className="glass-panel">
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Edit Profile Information</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              <div className="auth-input-block">
                <label className="auth-input-label">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="auth-input-block">
                <label className="auth-input-label">Mobile Number</label>
                <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} />
              </div>
            </div>

            <div className="auth-input-block">
              <label className="auth-input-label">Bio / Headline</label>
              <textarea 
                value={bio} 
                onChange={e => setBio(e.target.value)} 
                rows={3} 
                style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '12px', borderRadius: '6px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              <div className="auth-input-block">
                <label className="auth-input-label">Profession Category</label>
                <input type="text" value={profession} onChange={e => setProfession(e.target.value)} placeholder="e.g. Software Development, Medicine" />
              </div>
              <div className="auth-input-block">
                <label className="auth-input-label">Professional Designation / Title</label>
                <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Tech Lead, MD, Consultant" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              <div className="auth-input-block">
                <label className="auth-input-label">Company / Organization</label>
                <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google, AIIMS" />
              </div>
              <div className="auth-input-block">
                <label className="auth-input-label">Years of Experience</label>
                <input type="number" value={yearsOfExperience} onChange={e => setYearsOfExperience(e.target.value)} placeholder="e.g. 5" />
              </div>
            </div>

            <div className="auth-input-block">
              <label className="auth-input-label">Education (optional)</label>
              <input type="text" value={education} onChange={e => setEducation(e.target.value)} placeholder="e.g. B.Tech from Stanford University" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              <div className="auth-input-block">
                <label className="auth-input-label">City</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div className="auth-input-block">
                <label className="auth-input-label">Country</label>
                <input type="text" value={country} onChange={e => setCountry(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              <div className="auth-input-block">
                <label className="auth-input-label">Department (e.g. Science, Commerce)</label>
                <input type="text" value={department} onChange={e => setDepartment(e.target.value)} />
              </div>
              <div className="auth-input-block">
                <label className="auth-input-label">Industry</label>
                <select 
                  value={industry} 
                  onChange={e => setIndustry(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '12px', borderRadius: '6px', outline: 'none', height: '46px', cursor: 'pointer' }}
                >
                  <option value="" style={{ background: '#1e293b' }}>Select Industry</option>
                  {INDUSTRIES.map(ind => (
                    <option key={ind} value={ind} style={{ background: '#1e293b' }}>{ind}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              <div className="auth-input-block">
                <label className="auth-input-label">Mentorship Status</label>
                <select 
                  value={mentorshipStatus} 
                  onChange={e => setMentorshipStatus(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '12px', borderRadius: '6px', outline: 'none', height: '46px', cursor: 'pointer' }}
                >
                  <option value="Available" style={{ background: '#1e293b' }}>Available</option>
                  <option value="Limited Availability" style={{ background: '#1e293b' }}>Limited Availability</option>
                  <option value="Not Available" style={{ background: '#1e293b' }}>Not Available</option>
                </select>
              </div>
              <div className="auth-input-block">
                <label className="auth-input-label">Profile Photo URL</label>
                <input type="text" value={profilePhoto} onChange={e => setProfilePhoto(e.target.value)} />
              </div>
            </div>

            {/* Skills Tag Editor */}
            <div className="auth-input-block">
              <label className="auth-input-label">Skills (Press Enter or comma to add)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', minHeight: '44px', alignItems: 'center' }}>
                {skills.map(skill => (
                  <span key={skill} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--primary-color)', color: 'white', padding: '4px 10px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600 }}>
                    {skill}
                    <button type="button" onClick={() => handleRemoveSkill(skill)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', fontSize: '0.9rem', outline: 'none' }}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input 
                  type="text" 
                  value={skillInput} 
                  onChange={e => setSkillInput(e.target.value)} 
                  onKeyDown={handleSkillInputKeyDown}
                  placeholder={skills.length === 0 ? "e.g. Java, React, Node.js" : "Add more..."} 
                  style={{ border: 'none', background: 'transparent', color: 'white', outline: 'none', flexGrow: 1, padding: '2px 4px', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {/* Checkboxes: How I Can Help */}
            <div className="auth-input-block">
              <label className="auth-input-label" style={{ marginBottom: '10px' }}>How I Can Help</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                {HELP_OPTIONS.map(opt => (
                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={helpCategories.includes(opt)} 
                      onChange={() => handleHelpCheckboxChange(opt)} 
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Checkboxes: Looking For */}
            <div className="auth-input-block">
              <label className="auth-input-label" style={{ marginBottom: '10px' }}>Looking For</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                {LOOKING_FOR_OPTIONS.map(opt => (
                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={lookingFor.includes(opt)} 
                      onChange={() => handleLookingForCheckboxChange(opt)} 
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Checkboxes: Open For */}
            <div className="auth-input-block">
              <label className="auth-input-label" style={{ marginBottom: '10px' }}>Open For Badges (badges shown on profile)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                {["Mentorship", "Networking", "Referrals", "Hiring", "Collaborations", "Career Guidance"].map(opt => (
                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={openFor.includes(opt)} 
                      onChange={() => setOpenFor(openFor.includes(opt) ? openFor.filter(x => x !== opt) : [...openFor, opt])} 
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Social & Web Links</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="auth-input-block">
                  <label className="auth-input-label">LinkedIn URL</label>
                  <input type="text" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/username" />
                </div>
                <div className="auth-input-block">
                  <label className="auth-input-label">GitHub URL</label>
                  <input type="text" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/username" />
                </div>
                <div className="auth-input-block">
                  <label className="auth-input-label">Portfolio Website URL</label>
                  <input type="text" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://username.com" />
                </div>
                <div className="auth-input-block">
                  <label className="auth-input-label">Personal Website URL</label>
                  <input type="text" value={personalUrl} onChange={e => setPersonalUrl(e.target.value)} placeholder="https://yourwebsite.com" />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 24px', marginTop: '10px' }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}

        {activeTab === 'privacy' && (
          <form onSubmit={handlePrivacySubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Directory Privacy & Visibility</h3>
            
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Choose what contact details are visible to other verified members of the Vidyapith Praktani alumni directory.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <input 
                  type="checkbox" 
                  id="showEmailCheck" 
                  checked={showEmail} 
                  onChange={e => setShowEmail(e.target.checked)} 
                  style={{ marginTop: '4px', cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor="showEmailCheck" style={{ fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>Show Email Address</label>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Allow other alumni to see your school/work email address on your profile.</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <input 
                  type="checkbox" 
                  id="showMobileCheck" 
                  checked={showMobile} 
                  onChange={e => setShowMobile(e.target.checked)} 
                  style={{ marginTop: '4px', cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor="showMobileCheck" style={{ fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>Show Mobile Number</label>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Allow other alumni to see your phone/WhatsApp number on your profile.</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <input 
                  type="checkbox" 
                  id="showSocialCheck" 
                  checked={showSocial} 
                  onChange={e => setShowSocial(e.target.checked)} 
                  style={{ marginTop: '4px', cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor="showSocialCheck" style={{ fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>Show Social Links</label>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Allow other alumni to see your LinkedIn, GitHub, Portfolio, and Personal website links on your profile.</span>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 24px', marginTop: '12px' }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Privacy Options'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
