"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Search, PlusCircle, AlertCircle, X, Check, Mail } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface JobsScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

export const JobsScreen: React.FC<JobsScreenProps> = ({ showToast, onViewProfile }) => {
  const { currentUser } = useAuth();
  
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterReferral, setFilterReferral] = useState(false);
  const [activeTab, setActiveTab] = useState<'explore' | 'applications'>('explore');

  // Modal post job
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobType, setJobType] = useState<'Full-time' | 'Internship' | 'Contract' | 'Remote'>('Full-time');
  const [jobDesc, setJobDesc] = useState('');
  const [jobSkills, setJobSkills] = useState('');
  const [referralAvailable, setReferralAvailable] = useState(true);
  const [contactEmail, setContactEmail] = useState('');

  // Modal apply state
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [applyMemo, setApplyMemo] = useState('');

  // Response modal states
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [responseApplicant, setResponseApplicant] = useState<any | null>(null);
  const [responseJob, setResponseJob] = useState<any | null>(null);
  const [responseText, setResponseText] = useState('');

  const loadJobsData = async () => {
    try {
      let list = await apiFetch('/jobs');
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter((j: any) => 
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q)
        );
      }
      
      if (filterType) {
        list = list.filter((j: any) => j.type === filterType);
      }

      if (filterReferral) {
        list = list.filter((j: any) => j.referral_available);
      }

      setJobs(list);
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  useEffect(() => {
    loadJobsData();
  }, [searchQuery, filterType, filterReferral]);

  if (!currentUser) return null;

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !jobCompany.trim() || !jobLocation.trim() || !jobDesc.trim()) {
      showToast("Please fill in all required fields.", "danger");
      return;
    }

    const skillsArr = jobSkills.split(',').map(s => s.trim()).filter(s => s.length > 0);

    // Optimistic: add job instantly and close modal
    const tempJob = {
      id: `temp-job-${Date.now()}`,
      title: jobTitle.trim(),
      company: jobCompany.trim(),
      location: jobLocation.trim(),
      type: jobType,
      description: jobDesc.trim(),
      skills: skillsArr.length > 0 ? skillsArr : ['Communication', 'Logical Reasoning'],
      referral_available: referralAvailable,
      contact_email: contactEmail.trim() || currentUser.email,
      posted_by: currentUser.id,
      created_at: new Date().toISOString(),
      applications: []
    };
    setJobs(prev => [tempJob, ...prev]);
    showToast("Job opportunity posted successfully!", "success");
    setPostModalVisible(false);
    setJobTitle('');
    setJobCompany('');
    setJobLocation('');
    setJobDesc('');
    setJobSkills('');
    setContactEmail('');

    try {
      await apiFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: tempJob.title,
          company: tempJob.company,
          location: tempJob.location,
          type: jobType,
          description: tempJob.description,
          skills: tempJob.skills,
          referralAvailable: referralAvailable,
          contactEmail: tempJob.contact_email
        })
      });
      // Silently refresh to get real server ID
      loadJobsData();
    } catch (err: any) {
      setJobs(prev => prev.filter((j: any) => j.id !== tempJob.id));
      showToast(err.message, 'danger');
    }
  };

  const openApplyModal = (job: any) => {
    setSelectedJob(job);
    setApplyMemo('');
    setApplyModalVisible(true);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    // Optimistic: close modal immediately and mark job as applied
    const jobId = selectedJob.id;
    const jobTitle = selectedJob.title;
    const jobCompany = selectedJob.company;
    const posterName = selectedJob.poster?.full_name || 'sponsor';
    const posterId = selectedJob.posted_by;
    const memo = applyMemo.trim();

    setApplyModalVisible(false);
    setJobs(prev => prev.map((j: any) =>
      j.id === jobId
        ? { ...j, applications: [...(j.applications || []), currentUser.id] }
        : j
    ));

    try {
      await apiFetch(`/jobs/${jobId}/apply`, { method: 'POST' });

      if (memo && posterId) {
        const referralRequestMsg = `Hello! I have just applied for your posted role "${jobTitle}" at "${jobCompany}" on Vidyapith Praktani.

Cover Note / Referral Request:
"${memo}"

Here is my verified Vidyapith profile: http://localhost:3000/profile/${currentUser.id}`;
        try {
          await apiFetch(`/messages/${posterId}`, {
            method: 'POST',
            body: JSON.stringify({ content: referralRequestMsg })
          });
          showToast(`Application filed and referral request sent to ${posterName}!`, "success");
        } catch {
          showToast(`Applied successfully, but referral message could not be sent.`, "info");
        }
      } else {
        showToast(`Application successfully filed for ${jobTitle}!`, "success");
      }
    } catch (err: any) {
      // Revert on failure
      setJobs(prev => prev.map((j: any) =>
        j.id === jobId
          ? { ...j, applications: (j.applications || []).filter((id: string) => id !== currentUser.id) }
          : j
      ));
      showToast(err.message, 'danger');
    }
  };

  return (
    <div className="heritage-page" style={{ padding: '24px 0' }}>
      
      {/* Redesigned Heritage Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--heritage-orange, #ff9f0a) 0%, var(--heritage-gold, #f4b820) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(255, 159, 10, 0.2)'
          }}>
            <Briefcase size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--heritage-ink, #161719)', margin: 0 }}>
              Careers Hub
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: 'var(--heritage-muted, #77797d)', fontWeight: 500 }}>
              Locate openings, internships, and internal referrals shared exclusively by Vidyapith alumni.
            </p>
          </div>
        </div>

        <button 
          onClick={() => setPostModalVisible(true)} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'var(--heritage-orange, #ff9f0a)', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '8px', 
            padding: '10px 18px', 
            fontWeight: 700, 
            fontSize: '0.9rem',
            cursor: 'pointer', 
            boxShadow: '0 2px 6px rgba(255, 159, 10, 0.15)',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <PlusCircle size={18} />
          <span>Post Opening</span>
        </button>
      </div>

      {/* Main Redesigned Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.8fr 1.2fr', gap: '28px' }} className="jobs-layout-grid">
        
        {/* Main Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Underline Tabs Switcher */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--heritage-line, #e7e7e7)', marginBottom: '8px' }}>
            <button 
              type="button"
              onClick={() => setActiveTab('explore')}
              style={{
                background: 'none', 
                border: 'none', 
                color: activeTab === 'explore' ? 'var(--heritage-orange, #ff9f0a)' : 'var(--heritage-muted, #77797d)',
                fontWeight: 700, 
                fontSize: '0.95rem', 
                cursor: 'pointer', 
                paddingBottom: '12px',
                borderBottom: activeTab === 'explore' ? '2.5px solid var(--heritage-orange, #ff9f0a)' : '2.5px solid transparent',
                marginBottom: -2,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Briefcase size={16} />
              Explore Openings ({jobs.length})
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('applications')}
              style={{
                background: 'none', 
                border: 'none', 
                color: activeTab === 'applications' ? 'var(--heritage-orange, #ff9f0a)' : 'var(--heritage-muted, #77797d)',
                fontWeight: 700, 
                fontSize: '0.95rem', 
                cursor: 'pointer', 
                paddingBottom: '12px',
                borderBottom: activeTab === 'applications' ? '2.5px solid var(--heritage-orange, #ff9f0a)' : '2.5px solid transparent',
                marginBottom: -2,
                marginLeft: '24px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Mail size={16} />
              My Applications ({jobs.filter(j => j.applications?.includes(currentUser.id)).length})
            </button>
          </div>

          {/* Listings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(() => {
              const listToShow = activeTab === 'explore' 
                ? jobs 
                : jobs.filter(j => j.applications?.includes(currentUser.id));
                
              if (listToShow.length === 0) {
                return (
                  <div style={{ 
                    minHeight: '250px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--heritage-card, #ffffff)',
                    border: '1px dashed var(--heritage-line, #e7e7e7)',
                    borderRadius: '16px',
                    padding: '40px',
                    color: 'var(--heritage-muted, #77797d)',
                    textAlign: 'center'
                  }}>
                    <Briefcase size={48} style={{ color: 'var(--heritage-line, #e7e7e7)', marginBottom: '16px' }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                      {activeTab === 'explore' 
                        ? 'No job listings matching these filters have been posted.'
                        : 'You have not applied to any jobs yet.'}
                    </p>
                  </div>
                );
              }

              return listToShow.map(job => {
                const poster = (job as any).poster;
                const alreadyApplied = job.applications?.includes(currentUser.id) || false;

                return (
                  <div 
                    key={job.id} 
                    style={{ 
                      background: 'var(--heritage-card, #ffffff)',
                      border: '1px solid var(--heritage-line, #e7e7e7)',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: 'var(--heritage-shadow)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      transition: 'all 0.2s'
                    }}
                    className="job-card-premium"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            padding: '3px 10px', 
                            borderRadius: '20px', 
                            background: job.type === 'Full-time' ? 'rgba(99, 102, 241, 0.08)' : job.type === 'Internship' ? 'rgba(236, 72, 153, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            color: job.type === 'Full-time' ? '#4f46e5' : job.type === 'Internship' ? '#db2777' : '#059669',
                            border: `1px solid ${job.type === 'Full-time' ? 'rgba(99, 102, 241, 0.15)' : job.type === 'Internship' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`
                          }}>
                            {job.type}
                          </span>
                          
                          {job.referral_available && (
                            <span style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 700, 
                              padding: '3px 10px', 
                              borderRadius: '20px', 
                              background: 'rgba(255, 159, 10, 0.08)', 
                              color: 'var(--heritage-orange, #ff9f0a)',
                              border: '1px solid rgba(255, 159, 10, 0.2)'
                            }}>
                              🤝 Referral Available
                            </span>
                          )}
                        </div>

                        <h3 style={{ fontSize: '1.25rem', color: 'var(--heritage-ink, #161719)', margin: '4px 0 2px 0', fontWeight: 800 }}>{job.title}</h3>
                        <h4 style={{ fontSize: '0.92rem', color: 'var(--heritage-orange, #ff9f0a)', margin: 0, fontWeight: 700 }}>
                          {job.company} — <span style={{ color: 'var(--heritage-muted, #77797d)', fontWeight: 500 }}>{job.location}</span>
                        </h4>
                      </div>

                      <span style={{ fontSize: '0.76rem', color: 'var(--heritage-muted, #77797d)', fontWeight: 500 }}>
                        {new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                      {job.description}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '4px 0' }}>
                      {job.skills?.map((skill: string) => (
                        <span key={skill} style={{ 
                          fontSize: '0.75rem', 
                          background: '#f1f5f9', 
                          color: '#475569', 
                          padding: '3px 8px', 
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          fontWeight: 500
                        }}>
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      borderTop: '1px solid var(--heritage-line, #e7e7e7)', 
                      paddingTop: '12px', 
                      fontSize: '0.8rem', 
                      color: 'var(--heritage-muted, #77797d)',
                      marginTop: '4px'
                    }}>
                      {poster ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>Sponsor:</span>
                          <img 
                            src={poster.profile_photo} 
                            alt={poster.full_name} 
                            style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '1.5px solid var(--heritage-line)' }}
                            onClick={() => onViewProfile(poster.id)}
                          />
                          <strong 
                            style={{ color: 'var(--heritage-ink, #161719)', cursor: 'pointer', fontWeight: 700 }} 
                            onClick={() => onViewProfile(poster.id)}
                          >
                            {poster.full_name} ({poster.profession})
                          </strong>
                        </div>
                      ) : (
                        <div />
                      )}

                      <div>
                        {alreadyApplied ? (
                          <button 
                            disabled 
                            style={{ 
                              background: 'rgba(16, 185, 129, 0.08)', 
                              border: '1px solid #10b981', 
                              color: '#10b981', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              fontSize: '0.8rem',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              cursor: 'default'
                            }}
                          >
                            <Check size={14} />
                            <span>Applied</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => openApplyModal(job)}
                            style={{
                              background: 'var(--heritage-orange, #ff9f0a)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '7px 14px',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                          >
                            <span>Apply / Request Referral</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Sidebar Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ 
            background: 'var(--heritage-card, #ffffff)',
            border: '1px solid var(--heritage-line, #e7e7e7)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: 'var(--heritage-shadow)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: 'var(--heritage-ink, #161719)' }}>Search Filters</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '6px' }}>Keywords</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--heritage-muted, #77797d)' }} />
                <input 
                  type="text" 
                  placeholder="Title, company, etc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 10px 10px 36px', 
                    background: '#ffffff', 
                    border: '1px solid var(--heritage-line, #e7e7e7)', 
                    color: 'var(--heritage-ink, #161719)', 
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '6px' }}>Job Type</label>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  background: '#ffffff', 
                  border: '1px solid var(--heritage-line, #e7e7e7)', 
                  color: 'var(--heritage-ink, #161719)', 
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                id="refOnlyCheck" 
                checked={filterReferral}
                onChange={(e) => setFilterReferral(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--heritage-orange, #ff9f0a)' }}
              />
              <label htmlFor="refOnlyCheck" style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--heritage-ink, #161719)', fontWeight: 600 }}>
                Referral Available Only
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {postModalVisible && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(15, 23, 42, 0.45)', 
          backdropFilter: 'blur(6px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }} onClick={() => setPostModalVisible(false)}>
          <div onClick={e => e.stopPropagation()} style={{ 
            background: 'var(--heritage-card, #ffffff)', 
            borderRadius: '16px', 
            padding: '28px', 
            width: '500px', 
            maxWidth: '95vw', 
            maxHeight: '90vh', 
            display: 'flex', 
            flexDirection: 'column', 
            boxShadow: '0 20px 60px -15px rgba(0,0,0,0.2)',
            color: 'var(--heritage-ink, #161719)',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Post Career Opportunity</h3>
              <button onClick={() => setPostModalVisible(false)} style={{ background: 'none', border: 'none', color: 'var(--heritage-muted, #77797d)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handlePostJob}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '6px' }}>Job / Role Title *</label>
                <input 
                  type="text" 
                  placeholder="E.g., Software Architect" 
                  required 
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1px solid var(--heritage-line, #e7e7e7)', color: 'var(--heritage-ink)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '6px' }}>Company *</label>
                  <input 
                    type="text" 
                    placeholder="E.g., Google" 
                    required 
                    value={jobCompany}
                    onChange={(e) => setJobCompany(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1px solid var(--heritage-line, #e7e7e7)', color: 'var(--heritage-ink)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '6px' }}>Type *</label>
                  <select 
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1px solid var(--heritage-line, #e7e7e7)', color: 'var(--heritage-ink)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '6px' }}>Location / City *</label>
                <input 
                  type="text" 
                  placeholder="E.g., Bangalore, India (Hybrid)" 
                  required 
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1px solid var(--heritage-line, #e7e7e7)', color: 'var(--heritage-ink)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '6px' }}>Description *</label>
                <textarea 
                  rows={4}
                  placeholder="Role description, requirements, etc..." 
                  required 
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1px solid var(--heritage-line, #e7e7e7)', color: 'var(--heritage-ink)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '6px' }}>Skills (Comma-separated)</label>
                <input 
                  type="text" 
                  placeholder="Go, React, Docker, Kubernetes" 
                  value={jobSkills}
                  onChange={(e) => setJobSkills(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1px solid var(--heritage-line, #e7e7e7)', color: 'var(--heritage-ink)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '6px' }}>Referral Contact Email</label>
                <input 
                  type="email" 
                  placeholder="E.g., referral.alumni@google.com" 
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1px solid var(--heritage-line, #e7e7e7)', color: 'var(--heritage-ink)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
                <input 
                  type="checkbox" 
                  id="refComposerCheck" 
                  checked={referralAvailable}
                  onChange={(e) => setReferralAvailable(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--heritage-orange, #ff9f0a)' }}
                />
                <label htmlFor="refComposerCheck" style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--heritage-ink, #161719)', fontWeight: 600 }}>
                  I will offer an internal referral for qualified candidates.
                </label>
              </div>

              <button 
                type="submit" 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: 'var(--heritage-orange, #ff9f0a)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: 700, 
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(255, 159, 10, 0.1)'
                }}
              >
                <span>Publish Job Opening</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {applyModalVisible && selectedJob && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(15, 23, 42, 0.45)', 
          backdropFilter: 'blur(6px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }} onClick={() => setApplyModalVisible(false)}>
          <div onClick={e => e.stopPropagation()} style={{ 
            background: 'var(--heritage-card, #ffffff)', 
            borderRadius: '16px', 
            padding: '28px', 
            width: '440px', 
            maxWidth: '95vw', 
            boxShadow: '0 20px 60px -15px rgba(0,0,0,0.2)',
            color: 'var(--heritage-ink, #161719)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Apply / Request Referral</h3>
              <button onClick={() => setApplyModalVisible(false)} style={{ background: 'none', border: 'none', color: 'var(--heritage-muted, #77797d)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleApplySubmit}>
              <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--heritage-line, #e7e7e7)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--heritage-muted, #77797d)', textTransform: 'uppercase', fontWeight: 700 }}>Job Selection:</span>
                <h4 style={{ color: 'var(--heritage-ink, #161719)', margin: '4px 0 2px 0', fontSize: '1rem', fontWeight: 800 }}>{selectedJob.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--heritage-orange, #ff9f0a)', margin: 0, fontWeight: 700 }}>{selectedJob.company} • {selectedJob.location}</p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '8px' }}>
                  Write a brief note to the Alumni Sponsor *
                </label>
                <textarea 
                  rows={4} 
                  placeholder="Describe your qualifications, skills, and why you are interested in this position..." 
                  required 
                  value={applyMemo}
                  onChange={(e) => setApplyMemo(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1px solid var(--heritage-line, #e7e7e7)', color: 'var(--heritage-ink)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '20px', padding: '12px 14px', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <AlertCircle size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ color: '#065f46', textAlign: 'left', margin: 0, fontSize: '0.78rem', lineHeight: 1.4, fontWeight: 500 }}>
                  A link to your verified Vidyapith profile and this cover note will be shared with the alumnus sponsor immediately.
                </p>
              </div>

              <button 
                type="submit" 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: 'var(--heritage-orange, #ff9f0a)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: 700, 
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(255, 159, 10, 0.1)'
                }}
              >
                <span>File Application / Request</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
