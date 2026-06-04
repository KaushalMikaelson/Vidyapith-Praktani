"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RKMV_DB, JobListing } from '../database/database';
import { Briefcase, Search, PlusCircle, AlertCircle, X, Check, Mail } from 'lucide-react';

interface JobsScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

export const JobsScreen: React.FC<JobsScreenProps> = ({ showToast, onViewProfile }) => {
  const { currentUser } = useAuth();
  
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterReferral, setFilterReferral] = useState(false);

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
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [applyMemo, setApplyMemo] = useState('');

  const loadJobsData = () => {
    let list = RKMV_DB.getJobs();
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(j => 
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q)
      );
    }
    
    if (filterType) {
      list = list.filter(j => j.type === filterType);
    }

    if (filterReferral) {
      list = list.filter(j => j.referral_available);
    }

    setJobs(list);
  };

  useEffect(() => {
    loadJobsData();
  }, [searchQuery, filterType, filterReferral]);

  if (!currentUser) return null;

  const handlePostJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !jobCompany.trim() || !jobLocation.trim() || !jobDesc.trim()) {
      showToast("Please fill in all required fields.", "danger");
      return;
    }

    const skillsArr = jobSkills.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const newJob: JobListing = {
      id: 'job-' + Math.random().toString(36).substr(2, 9),
      posted_by: currentUser.id,
      title: jobTitle.trim(),
      company: jobCompany.trim(),
      location: jobLocation.trim(),
      type: jobType,
      description: jobDesc.trim(),
      skills: skillsArr.length > 0 ? skillsArr : ['Communication', 'Logical Reasoning'],
      referral_available: referralAvailable,
      contact_email: contactEmail.trim() || currentUser.email,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      created_at: new Date().toISOString(),
      applications: []
    };

    RKMV_DB.addJob(newJob);
    showToast("Job opportunity posted successfully!", "success");

    setPostModalVisible(false);
    setJobTitle('');
    setJobCompany('');
    setJobLocation('');
    setJobDesc('');
    setJobSkills('');
    setContactEmail('');
    loadJobsData();
  };

  const openApplyModal = (job: JobListing) => {
    setSelectedJob(job);
    setApplyMemo('');
    setApplyModalVisible(true);
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    RKMV_DB.applyForJob(selectedJob.id, currentUser.id);
    showToast(`Application successfully filed for ${selectedJob.title}!`, "success");
    setApplyModalVisible(false);

    // Notify job owner
    RKMV_DB.addNotification({
      id: 'not-' + Math.random().toString(36).substr(2, 9),
      user_id: selectedJob.posted_by,
      title: "New Job Application",
      body: `${currentUser.full_name} applied for your ${selectedJob.title} opening at ${selectedJob.company}.`,
      type: "success",
      read: false,
      created_at: new Date().toISOString()
    });

    loadJobsData();
  };

  return (
    <div className="jobs-layout" style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '30px' }}>
      
      {/* Main Panel */}
      <div className="jobs-main-column">
        <div className="page-title-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="page-title-text">
            <h2>Career Opportunities Board</h2>
            <p>Locate openings, internships, and internal referrals shared exclusively by Vidyapith alumni.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setPostModalVisible(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PlusCircle size={18} />
            <span>Post Opening</span>
          </button>
        </div>

        {/* Listings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {jobs.length === 0 ? (
            <div className="glass-panel loading-state" style={{ minHeight: '250px' }}>
              <Briefcase size={48} style={{ color: 'var(--text-muted)' }} />
              <p>No job listings matching these filters have been posted.</p>
            </div>
          ) : (
            jobs.map(job => {
              const poster = RKMV_DB.getUserById(job.posted_by);
              const alreadyApplied = job.applications?.includes(currentUser.id) || false;

              return (
                <div key={job.id} className="glass-panel cause-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className={`badge ${job.type === 'Full-time' ? 'badge-role' : job.type === 'Internship' ? 'badge-admin' : 'badge-approved'}`} style={{ marginBottom: '8px' }}>
                        {job.type}
                      </span>
                      <h3 style={{ fontSize: '1.25rem', color: 'white' }}>{job.title}</h3>
                      <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-gold)' }}>{job.company} — <span style={{ color: 'var(--text-secondary)' }}>{job.location}</span></h4>
                    </div>

                    {job.referral_available && (
                      <span className="badge badge-approved" style={{ background: 'rgba(104, 211, 145, 0.1)', color: 'var(--text-success)', borderColor: 'rgba(104, 211, 145, 0.3)' }}>
                        Internal Referral Available
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {job.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '6px 0' }}>
                    {job.skills.map(skill => (
                      <span key={skill} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px' }}>
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {poster && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Sponsor:</span>
                        <img 
                          src={poster.profile_photo} 
                          alt={poster.full_name} 
                          style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => onViewProfile(poster.id)}
                        />
                        <strong 
                          style={{ color: 'white', cursor: 'pointer' }} 
                          onClick={() => onViewProfile(poster.id)}
                        >
                          {poster.full_name} ({poster.profession})
                        </strong>
                      </div>
                    )}

                    <div>
                      {alreadyApplied ? (
                        <button className="btn btn-secondary btn-sm" disabled style={{ borderColor: 'var(--text-success)', color: 'var(--text-success)' }}>
                          <Check size={14} style={{ marginRight: '4px' }} />
                          <span>Applied</span>
                        </button>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => openApplyModal(job)}>
                          <span>Apply / Request Referral</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sidebar Filters */}
      <div className="jobs-sidebar">
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 className="widget-title" style={{ marginBottom: '14px' }}>Search Filters</h3>
          
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Keywords</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <Search size={16} className="search-icon" style={{ top: '50%', transform: 'translateY(-50%)', left: '12px' }} />
              <input 
                type="text" 
                placeholder="Search job title, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Job Type</label>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
            >
              <option value="">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Internship">Internship</option>
              <option value="Contract">Contract</option>
              <option value="Remote">Remote</option>
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              id="refOnlyCheck" 
              checked={filterReferral}
              onChange={(e) => setFilterReferral(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="refOnlyCheck" style={{ textTransform: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              Referral Available Only
            </label>
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {postModalVisible && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-card" style={{ maxWidth: '500px', padding: '30px' }}>
            <div className="page-title-box" style={{ marginBottom: '20px' }}>
              <h3>Post Career Opportunity</h3>
              <button className="icon-btn" onClick={() => setPostModalVisible(false)}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handlePostJob}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Job / Role Title</label>
                <input 
                  type="text" 
                  placeholder="E.g., Software Architect" 
                  required 
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                />
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Company</label>
                  <input 
                    type="text" 
                    placeholder="E.g., Google" 
                    required 
                    value={jobCompany}
                    onChange={(e) => setJobCompany(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Type</label>
                  <select 
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value as any)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Location / City</label>
                <input 
                  type="text" 
                  placeholder="E.g., Bangalore, India (Hybrid)" 
                  required 
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Skills (Comma-separated)</label>
                <input 
                  type="text" 
                  placeholder="Go, React, Docker, Kubernetes" 
                  value={jobSkills}
                  onChange={(e) => setJobSkills(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Referral Contact Email</label>
                <input 
                  type="email" 
                  placeholder="E.g., referral.alumni@google.com" 
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                <input 
                  type="checkbox" 
                  id="refComposerCheck" 
                  checked={referralAvailable}
                  onChange={(e) => setReferralAvailable(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="refComposerCheck" style={{ textTransform: 'none', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  I will offer an internal referral for qualified candidates.
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                <span>Publish Job Opening</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {applyModalVisible && selectedJob && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-card" style={{ maxWidth: '440px', padding: '30px' }}>
            <div className="page-title-box" style={{ marginBottom: '20px' }}>
              <h3>Apply / Request Referral</h3>
              <button className="icon-btn" onClick={() => setApplyModalVisible(false)}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleApplySubmit}>
              <div style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '4px', border: '1px dashed var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Job Selection:</span>
                <h4 style={{ color: 'white', margin: '4px 0 2px' }}>{selectedJob.title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>{selectedJob.company} • {selectedJob.location}</p>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Write a brief note to the Alumni Sponsor
                </label>
                <textarea 
                  rows={4} 
                  placeholder="Describe your qualifications, skills, and why you are interested in this position..." 
                  required 
                  value={applyMemo}
                  onChange={(e) => setApplyMemo(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontFamily: 'inherit' }}
                />
              </div>

              <div className="motto-box" style={{ marginBottom: '18px', padding: '12px', background: 'rgba(104,211,145,0.08)', borderRadius: '4px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertCircle size={16} style={{ color: 'var(--text-success)', flexShrink: 0, marginTop: '2px' }} />
                <p className="motto-text" style={{ color: 'var(--text-success)', textAlign: 'left' }}>
                  A link to your verified Vidyapith profile and this cover note will be shared with the alumnus sponsor immediately.
                </p>
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                <span>File Application / request</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

