"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Search, PlusCircle, AlertCircle, X, Check, Mail, Users, Sparkles, Copy, FileText, Clipboard, Trash2, Lightbulb, ListTodo, Plus, Info, Share2 } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface JobsScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

export const JobsScreen: React.FC<JobsScreenProps> = ({ showToast, onViewProfile }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterReferral, setFilterReferral] = useState(false);
  const [activeTab, setActiveTab] = useState<'explore' | 'applications'>('explore');
  const [trackedJobs, setTrackedJobs] = useState<any[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'filters' | 'tracker'>('filters');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Job Details Overlay & Embedded Chat States
  const [selectedDetailJob, setSelectedDetailJob] = useState<any | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatText, setChatText] = useState('');
  const [popupApplyNotes, setPopupApplyNotes] = useState('');
  const [popupApplying, setPopupApplying] = useState(false);

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

  // Load and Save Tracked Jobs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vidyapith_tracked_jobs');
      if (stored) {
        try {
          setTrackedJobs(JSON.parse(stored));
        } catch {}
      }
    }
  }, []);

  const saveTrackedJobs = (newTracked: any[]) => {
    setTrackedJobs(newTracked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vidyapith_tracked_jobs', JSON.stringify(newTracked));
    }
  };

  const handleAddJobToTracker = (job: any) => {
    if (trackedJobs.some(tj => tj.id === job.id)) {
      showToast(`"${job.title}" is already in your Tracker!`, "info");
      return;
    }
    const newTracked = [...trackedJobs, {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      status: 'Saved',
      trackedAt: new Date().toISOString()
    }];
    saveTrackedJobs(newTracked);
    showToast(`Added "${job.title}" to your AI Career Copilot Tracker!`, "success");
  };

  const handleUpdateTrackerStatus = (jobId: string, status: string) => {
    const updated = trackedJobs.map(tj => tj.id === jobId ? { ...tj, status } : tj);
    saveTrackedJobs(updated);
    showToast(`Updated status to ${status}!`, "success");
  };

  const handleRemoveFromTracker = (jobId: string) => {
    const updated = trackedJobs.filter(tj => tj.id !== jobId);
    saveTrackedJobs(updated);
    showToast(`Removed from Tracker.`, "info");
  };

  const handleUpdateTrackerNotes = (jobId: string, notes: string) => {
    const updated = trackedJobs.map(tj => tj.id === jobId ? { ...tj, notes } : tj);
    saveTrackedJobs(updated);
  };

  const handleUpdateTrackerDate = (jobId: string, date: string) => {
    const updated = trackedJobs.map(tj => tj.id === jobId ? { ...tj, interviewDate: date } : tj);
    saveTrackedJobs(updated);
  };

  const handleUpdateTrackerReferralContact = (jobId: string, contact: string) => {
    const updated = trackedJobs.map(tj => tj.id === jobId ? { ...tj, referralContact: contact } : tj);
    saveTrackedJobs(updated);
  };

  const loadChatMessages = async (partnerId: string) => {
    setChatLoading(true);
    try {
      const response = await apiFetch(`/messages/${partnerId}`);
      setChatMessages(response?.messages || []);
    } catch (err: any) {
      showToast(err.message, 'danger');
    } finally {
      setChatLoading(false);
    }
  };

  const sendChatReply = async (partnerId: string) => {
    if (!chatText.trim()) return;
    const text = chatText.trim();
    setChatText('');
    
    // Add locally to state first for instant update
    const tempMsg = {
      id: `temp-${Date.now()}`,
      sender_id: currentUser.id,
      receiver_id: partnerId,
      content: text,
      created_at: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, tempMsg]);

    try {
      await apiFetch(`/messages/${partnerId}`, {
        method: 'POST',
        body: JSON.stringify({ content: text })
      });
      loadChatMessages(partnerId);
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const updateApplicantPipelineStatus = async (jobId: string, applicantId: string, newStatus: string) => {
    try {
      await apiFetch(`/jobs/${jobId}/applications/${applicantId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus })
      });
      
      if (selectedDetailJob && selectedDetailJob.id === jobId) {
        const updatedApplicants = selectedDetailJob.applicants.map((a: any) => 
          a.id === applicantId ? { ...a, status: newStatus } : a
        );
        setSelectedDetailJob({
          ...selectedDetailJob,
          applicants: updatedApplicants
        });
      }

      loadJobsData();
      showToast(`Applicant stage updated to ${newStatus}!`, "success");
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const handlePopupApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetailJob) return;
    
    setPopupApplying(true);
    try {
      await apiFetch(`/jobs/${selectedDetailJob.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ coverNote: popupApplyNotes })
      });
      showToast("Application submitted successfully!", "success");
      setPopupApplyNotes('');
      
      // Reload jobs
      let list = await apiFetch('/jobs');
      setJobs(list);
      
      // Update selectedDetailJob state locally
      const updatedJob = list.find((j: any) => j.id === selectedDetailJob.id);
      if (updatedJob) {
        setSelectedDetailJob(updatedJob);
        loadChatMessages(updatedJob.posted_by);
      }
    } catch (err: any) {
      showToast(err.message, 'danger');
    } finally {
      setPopupApplying(false);
    }
  };

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
      await apiFetch(`/jobs/${jobId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ coverNote: memo })
      });

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

  const openMessageModal = (applicant: any, job: any) => {
    setResponseApplicant(applicant);
    setResponseJob(job);
    setResponseText('');
    setResponseModalVisible(true);
  };

  const handleResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseApplicant || !responseText.trim()) return;

    const applicantId = responseApplicant.id;
    const applicantName = responseApplicant.full_name;
    const text = responseText.trim();

    setResponseModalVisible(false);
    showToast(`Response sent to ${applicantName}!`, "success");

    try {
      await apiFetch(`/messages/${applicantId}`, {
        method: 'POST',
        body: JSON.stringify({ content: text })
      });
    } catch (err: any) {
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
              My Applications ({jobs.filter(j => {
                const apps = j.applications || [];
                return apps.some((str: string) => {
                  try {
                    if (str.startsWith('{')) {
                      return JSON.parse(str).userId === currentUser.id;
                    }
                  } catch {}
                  return str === currentUser.id;
                });
              }).length})
            </button>
          </div>

          {/* Listings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(() => {
              const listToShow = activeTab === 'explore' 
                ? jobs 
                : jobs.filter(j => {
                    const apps = j.applications || [];
                    return apps.some((str: string) => {
                      try {
                        if (str.startsWith('{')) {
                          return JSON.parse(str).userId === currentUser.id;
                        }
                      } catch {}
                      return str === currentUser.id;
                    });
                  });
                
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
                      <div 
                        onClick={() => { 
                          setSelectedDetailJob(job); 
                          setSelectedApplicant(job.applicants && job.applicants.length > 0 ? job.applicants[0] : null);
                          const alreadyApplied = job.applicants?.find((a: any) => a.id === currentUser.id);
                          if (job.posted_by === currentUser.id && job.applicants && job.applicants.length > 0) {
                            loadChatMessages(job.applicants[0].id);
                          } else if (job.posted_by !== currentUser.id) {
                            loadChatMessages(job.posted_by);
                          }
                        }} 
                        style={{ cursor: 'pointer', flex: 1 }}
                        title="Click to view details and applicant pipeline"
                      >
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

                    {/* Sponsor Applicants Management Block */}
                    {job.posted_by === currentUser.id && (
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid var(--heritage-line, #e7e7e7)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginTop: '4px'
                      }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.86rem', fontWeight: 800, color: 'var(--heritage-ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={15} style={{ color: 'var(--heritage-orange, #ff9f0a)' }} /> 
                          Applicants ({job.applicants?.length || 0})
                        </h4>
                        
                        {job.applicants && job.applicants.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {job.applicants.map((applicant: any) => (
                              <div key={applicant.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <img 
                                    src={applicant.profile_photo} 
                                    alt={applicant.full_name} 
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--heritage-line)' }}
                                    onClick={(e) => { e.stopPropagation(); onViewProfile(applicant.id); }}
                                  />
                                  <div>
                                    <strong style={{ display: 'block', fontSize: '0.82rem', color: 'var(--heritage-ink)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onViewProfile(applicant.id); }}>
                                      {applicant.full_name}
                                    </strong>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                      {applicant.profession} • {applicant.company || 'Vidyapith Alumnus'}
                                    </span>
                                    {applicant.cover_note && (
                                      <p style={{ 
                                        margin: '6px 0 0 0', 
                                        fontSize: '0.76rem', 
                                        color: '#475569', 
                                        background: '#f1f5f9', 
                                        padding: '6px 10px', 
                                        borderRadius: '6px', 
                                        borderLeft: '2.5px solid var(--heritage-orange, #ff9f0a)',
                                        maxWidth: '280px',
                                        lineHeight: 1.4,
                                        whiteSpace: 'pre-wrap'
                                      }}>
                                        <strong>Note:</strong> "{applicant.cover_note}"
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => openMessageModal(applicant, job)}
                                  style={{
                                    background: 'rgba(255, 159, 10, 0.08)',
                                    color: 'var(--heritage-orange, #ff9f0a)',
                                    border: '1px solid rgba(255, 159, 10, 0.2)',
                                    borderRadius: '6px',
                                    padding: '5px 10px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s'
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 159, 10, 0.16)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 159, 10, 0.08)'; }}
                                >
                                  <Mail size={12} />
                                  <span>Send Message</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '10px 0' }}>
                            No applicants yet.
                          </div>
                        )}
                      </div>
                    )}

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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Track Job Action */}
                        <button
                          type="button"
                          onClick={() => handleAddJobToTracker(job)}
                          style={{
                            background: trackedJobs.some(tj => tj.id === job.id) ? 'rgba(255, 159, 10, 0.08)' : 'rgba(71, 85, 105, 0.06)',
                            border: '1px solid',
                            borderColor: trackedJobs.some(tj => tj.id === job.id) ? 'rgba(255, 159, 10, 0.3)' : 'rgba(71, 85, 105, 0.15)',
                            color: trackedJobs.some(tj => tj.id === job.id) ? 'var(--heritage-orange, #ff9f0a)' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = trackedJobs.some(tj => tj.id === job.id) ? 'rgba(255, 159, 10, 0.12)' : 'rgba(71, 85, 105, 0.12)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = trackedJobs.some(tj => tj.id === job.id) ? 'rgba(255, 159, 10, 0.08)' : 'rgba(71, 85, 105, 0.06)';
                          }}
                        >
                          <span>📌 {trackedJobs.some(tj => tj.id === job.id) ? 'Tracked' : 'Track'}</span>
                        </button>

                        {job.posted_by === currentUser.id ? (
                          <span style={{ 
                            fontSize: '0.74rem', 
                            fontWeight: 700, 
                            color: 'var(--heritage-orange, #ff9f0a)',
                            background: 'rgba(255, 159, 10, 0.08)',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 159, 10, 0.2)'
                          }}>
                            Your Posting
                          </span>
                        ) : alreadyApplied ? (
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

        {/* Right Column: Sidebar Filters & Job Tracker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ 
            background: 'var(--heritage-card, #ffffff)',
            border: '1px solid var(--heritage-line, #e7e7e7)',
            borderRadius: '16px',
            boxShadow: 'var(--heritage-shadow)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: '540px',
            boxSizing: 'border-box'
          }}>
            {/* Sidebar Tab Headers */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--heritage-line, #e7e7e7)', background: '#f8fafc' }}>
              <button 
                type="button" 
                onClick={() => setSidebarTab('filters')}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: sidebarTab === 'filters' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderBottom: sidebarTab === 'filters' ? '2.5px solid var(--heritage-orange, #ff9f0a)' : '2.5px solid transparent',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: sidebarTab === 'filters' ? 'var(--heritage-orange, #ff9f0a)' : 'var(--heritage-muted, #77797d)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                🔍 Search Filters
              </button>
              <button 
                type="button" 
                onClick={() => setSidebarTab('tracker')}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: sidebarTab === 'tracker' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderBottom: sidebarTab === 'tracker' ? '2.5px solid var(--heritage-orange, #ff9f0a)' : '2.5px solid transparent',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: sidebarTab === 'tracker' ? 'var(--heritage-orange, #ff9f0a)' : 'var(--heritage-muted, #77797d)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <Briefcase size={13} style={{ color: sidebarTab === 'tracker' ? 'var(--heritage-orange)' : 'inherit' }} />
                Job Tracker ({trackedJobs.length})
              </button>
            </div>

            {/* Sidebar Tab Contents */}
            {sidebarTab === 'filters' ? (
              <div style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--heritage-ink, #161719)' }}>Search Filters</h3>
                
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
            ) : (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, boxSizing: 'border-box', overflowY: 'auto', maxHeight: '540px' }}>
                {/* Pipeline Progress Breakdown */}
                {trackedJobs.length > 0 && (() => {
                  const saved = trackedJobs.filter(j => j.status === 'Saved').length;
                  const applied = trackedJobs.filter(j => j.status === 'Applied').length;
                  const interviewing = trackedJobs.filter(j => j.status === 'Interviewing').length;
                  const offered = trackedJobs.filter(j => j.status === 'Offer Received').length;
                  const rejected = trackedJobs.filter(j => j.status === 'Rejected').length;
                  const total = trackedJobs.length;

                  return (
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid var(--heritage-line, #e7e7e7)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--heritage-ink)' }}>
                        <span>Pipeline Progress</span>
                        <span>{offered} Offered / {total} Total</span>
                      </div>
                      
                      {/* Multi-segment Progress Bar */}
                      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: '#e2e8f0', marginBottom: '10px' }}>
                        {saved > 0 && <div style={{ width: `${(saved / total) * 100}%`, background: '#94a3b8' }} title={`${saved} Saved`} />}
                        {applied > 0 && <div style={{ width: `${(applied / total) * 100}%`, background: '#fef3c7' }} title={`${applied} Applied`} />}
                        {interviewing > 0 && <div style={{ width: `${(interviewing / total) * 100}%`, background: '#eff6ff' }} title={`${interviewing} Interviewing`} />}
                        {offered > 0 && <div style={{ width: `${(offered / total) * 100}%`, background: '#d1fae5' }} title={`${offered} Offered`} />}
                        {rejected > 0 && <div style={{ width: `${(rejected / total) * 100}%`, background: '#fee2e2' }} title={`${rejected} Rejected`} />}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', fontSize: '0.7rem', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} /> Saved ({saved})</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b45309' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff9f0a' }} /> Applied ({applied})</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1d4ed8' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }} /> Interview ({interviewing})</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#047857' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> Offer ({offered})</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#be123c' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} /> Rejected ({rejected})</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Pipeline List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {trackedJobs.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: 'var(--heritage-muted, #77797d)',
                      fontSize: '0.85rem',
                      border: '1px dashed var(--heritage-line, #e7e7e7)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Briefcase size={36} style={{ color: 'var(--heritage-line)' }} />
                      <div>
                        <strong>Your Job Tracker is empty.</strong>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.4 }}>
                          Click on a job card header or the "📌 Track" button on any opening to add it to your pipeline tracker.
                        </p>
                      </div>
                    </div>
                  ) : (
                    trackedJobs.map(tj => {
                      const isExpanded = expandedJobId === tj.id;
                      return (
                        <div 
                          key={tj.id} 
                          style={{ 
                            background: '#ffffff', 
                            border: '1px solid var(--heritage-line, #e7e7e7)', 
                            borderRadius: '12px', 
                            padding: '16px',
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '10px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--heritage-ink)' }}>{tj.title}</h4>
                              <div style={{ fontSize: '0.76rem', color: 'var(--heritage-orange, #ff9f0a)', fontWeight: 700, marginTop: '2px' }}>{tj.company}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--heritage-muted)', marginTop: '2px' }}>{tj.location} • {tj.type}</div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveFromTracker(tj.id)} 
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Delete from Tracker"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <select
                              value={tj.status}
                              onChange={(e) => handleUpdateTrackerStatus(tj.id, e.target.value)}
                              style={{
                                flex: 1,
                                fontSize: '0.76rem',
                                border: 'none',
                                outline: 'none',
                                cursor: 'pointer',
                                background: tj.status === 'Offer Received' ? '#d1fae5' : tj.status === 'Interviewing' ? '#eff6ff' : tj.status === 'Applied' ? '#fef3c7' : tj.status === 'Saved' ? '#f1f5f9' : '#fee2e2',
                                color: tj.status === 'Offer Received' ? '#065f46' : tj.status === 'Interviewing' ? '#1e40af' : tj.status === 'Applied' ? '#92400e' : tj.status === 'Saved' ? '#475569' : '#991b1b',
                                fontWeight: 700,
                                borderRadius: '6px',
                                padding: '6px 8px'
                              }}
                            >
                              <option value="Saved">Saved</option>
                              <option value="Applied">Applied</option>
                              <option value="Interviewing">Interviewing</option>
                              <option value="Offer Received">Offer Received</option>
                              <option value="Rejected">Rejected</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => setExpandedJobId(isExpanded ? null : tj.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--heritage-orange, #ff9f0a)',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '4px 6px'
                              }}
                            >
                              <span>{isExpanded ? 'Collapse' : 'Details'}</span>
                              <Info size={11} />
                            </button>
                          </div>

                          {/* Expandable Notes & Interview section */}
                          {isExpanded && (
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '10px', 
                              borderTop: '1px solid var(--heritage-line, #e7e7e7)', 
                              paddingTop: '12px',
                              marginTop: '2px',
                              boxSizing: 'border-box'
                            }}>
                              {/* Interview Date picker */}
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '4px' }}>
                                  Interview Date
                                </label>
                                <input 
                                  type="date"
                                  value={tj.interviewDate || ''}
                                  onChange={(e) => handleUpdateTrackerDate(tj.id, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    fontSize: '0.76rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--heritage-line, #e7e7e7)',
                                    background: '#f8fafc',
                                    color: 'var(--heritage-ink)',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>

                              {/* Referral contact details */}
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '4px' }}>
                                  Sponsor Referral Email
                                </label>
                                <input 
                                  type="text"
                                  placeholder="e.g. sponsor.name@company.com"
                                  value={tj.referralContact || ''}
                                  onChange={(e) => handleUpdateTrackerReferralContact(tj.id, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    fontSize: '0.76rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--heritage-line, #e7e7e7)',
                                    background: '#f8fafc',
                                    color: 'var(--heritage-ink)',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>

                              {/* Application Notes */}
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '4px' }}>
                                  Application Notes
                                </label>
                                <textarea
                                  rows={3}
                                  placeholder="Add notes about recruitment process, links to resumes used, portfolio updates, or preparation strategies..."
                                  value={tj.notes || ''}
                                  onChange={(e) => handleUpdateTrackerNotes(tj.id, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    fontSize: '0.76rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--heritage-line, #e7e7e7)',
                                    background: '#f8fafc',
                                    color: 'var(--heritage-ink)',
                                    outline: 'none',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
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
      {/* Sponsor Response Modal */}
      {responseModalVisible && responseApplicant && responseJob && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(15, 23, 42, 0.45)', 
          backdropFilter: 'blur(6px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }} onClick={() => setResponseModalVisible(false)}>
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
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Send Response Message</h3>
              <button onClick={() => setResponseModalVisible(false)} style={{ background: 'none', border: 'none', color: 'var(--heritage-muted, #77797d)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleResponseSubmit}>
              <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--heritage-line, #e7e7e7)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--heritage-muted, #77797d)', textTransform: 'uppercase', fontWeight: 700 }}>Applicant:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <img src={responseApplicant.profile_photo} alt={responseApplicant.full_name} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                  <strong style={{ color: 'var(--heritage-ink, #161719)', fontSize: '0.92rem' }}>{responseApplicant.full_name}</strong>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--heritage-orange, #ff9f0a)', margin: '4px 0 0 0', fontWeight: 600 }}>Role: {responseJob.title} @ {responseJob.company}</p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted, #77797d)', marginBottom: '8px' }}>
                  Your Message *
                </label>
                <textarea 
                  rows={5} 
                  placeholder="Type your feedback, interview schedule details, or referral updates here..." 
                  required 
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#ffffff', border: '1px solid var(--heritage-line, #e7e7e7)', color: 'var(--heritage-ink)', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none' }}
                />
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
                <span>Send Response</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Job Details Overlay Popup */}
      {selectedDetailJob && (() => {
        const job = selectedDetailJob;
        const isSponsor = job.posted_by === currentUser.id;
        const alreadyApplied = job.applicants?.find((a: any) => a.id === currentUser.id);
        const applicantStatus = alreadyApplied?.status || 'Applied';
        
        return (
          <div style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15, 23, 42, 0.45)', 
            backdropFilter: 'blur(8px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000 
          }} onClick={() => setSelectedDetailJob(null)}>
            <div onClick={e => e.stopPropagation()} style={{ 
              background: 'var(--heritage-card, #ffffff)', 
              borderRadius: '20px', 
              padding: '32px', 
              width: '940px', 
              maxWidth: '95vw', 
              maxHeight: '90vh', 
              display: 'flex', 
              gap: '32px',
              boxShadow: '0 25px 70px -10px rgba(0,0,0,0.3)',
              color: 'var(--heritage-ink, #161719)',
              overflow: 'hidden',
              boxSizing: 'border-box',
              position: 'relative'
            }}>
              {/* Close Button */}
              <button 
                onClick={() => setSelectedDetailJob(null)} 
                style={{ position: 'absolute', right: '24px', top: '24px', background: 'none', border: 'none', color: 'var(--heritage-muted, #77797d)', cursor: 'pointer', zIndex: 10 }}
              >
                <X size={20} />
              </button>

              {/* Left Column: Job Details */}
              <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto', paddingRight: '12px' }}>
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
                  
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 850, margin: '6px 0 4px 0', color: 'var(--heritage-ink)' }}>{job.title}</h2>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--heritage-orange, #ff9f0a)' }}>
                    {job.company} — <span style={{ color: 'var(--heritage-muted, #77797d)', fontWeight: 500 }}>{job.location}</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--heritage-muted)', marginTop: '6px' }}>
                    Posted on {new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--heritage-line)', paddingTop: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--heritage-muted)' }}>Role Description</h4>
                  <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {job.description}
                  </p>
                </div>

                {job.skills && job.skills.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--heritage-muted)' }}>Required Skills</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {job.skills.map((skill: string) => (
                        <span key={skill} style={{ fontSize: '0.76rem', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sponsor Profile Section */}
                <div style={{ borderTop: '1px solid var(--heritage-line)', paddingTop: '16px', marginTop: '8px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--heritage-muted)' }}>Alumni Sponsor</h4>
                  {job.poster ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--heritage-line)' }}>
                      <img 
                        src={job.poster.profile_photo} 
                        alt={job.poster.full_name} 
                        style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '1.5px solid var(--heritage-line)' }}
                        onClick={() => { setSelectedDetailJob(null); onViewProfile(job.poster.id); }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong 
                          style={{ display: 'block', fontSize: '0.94rem', color: 'var(--heritage-ink)', cursor: 'pointer', fontWeight: 700 }}
                          onClick={() => { setSelectedDetailJob(null); onViewProfile(job.poster.id); }}
                        >
                          {job.poster.full_name}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--heritage-muted)' }}>
                          {job.poster.profession} @ {job.poster.company || 'Vidyapith Alumnus'}
                        </span>
                      </div>
                      {!isSponsor && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDetailJob(null);
                            openMessageModal(job.poster, job);
                          }}
                          style={{
                            background: 'rgba(255, 159, 10, 0.08)',
                            color: 'var(--heritage-orange, #ff9f0a)',
                            border: '1px solid rgba(255, 159, 10, 0.2)',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s'
                          }}
                        >
                          <Mail size={12} />
                          <span>Direct Message</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--heritage-muted)' }}>Not specified</div>
                  )}
                </div>
              </div>

              {/* Right Column: Pipeline, Application, and Chat */}
              <div style={{ flex: 0.9, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--heritage-line)', paddingLeft: '28px', overflow: 'hidden', boxSizing: 'border-box' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--heritage-ink)' }}>Application Pipeline</h3>

                {isSponsor ? (
                  /* ── Sponsor View ────────────────────────────────── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflow: 'hidden' }}>
                    
                    {/* Applicants Carousel/List */}
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted)' }}>
                        Applicants ({job.applicants?.length || 0})
                      </h4>
                      {job.applicants && job.applicants.length > 0 ? (
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                          {job.applicants.map((a: any) => {
                            const isSelected = selectedApplicant?.id === a.id;
                            return (
                              <div 
                                key={a.id}
                                onClick={() => {
                                  setSelectedApplicant(a);
                                  loadChatMessages(a.id);
                                }}
                                style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  alignItems: 'center', 
                                  gap: '4px',
                                  cursor: 'pointer',
                                  opacity: isSelected ? 1 : 0.6,
                                  transition: 'opacity 0.15s'
                                }}
                              >
                                <img 
                                  src={a.profile_photo} 
                                  alt={a.full_name} 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDetailJob(null);
                                    onViewProfile(a.id);
                                  }}
                                  title="View profile"
                                  style={{ 
                                    width: '38px', 
                                    height: '38px', 
                                    borderRadius: '50%', 
                                    objectFit: 'cover',
                                    border: isSelected ? '2px solid var(--heritage-orange)' : '1px solid var(--heritage-line)' 
                                  }} 
                                />
                                <span style={{ fontSize: '0.64rem', fontWeight: 700, maxWidth: '50px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {a.full_name.split(' ')[0]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: 'var(--heritage-muted)', padding: '12px', border: '1px dashed var(--heritage-line)', borderRadius: '10px', textAlign: 'center' }}>
                          No applications have been filed yet.
                        </div>
                      )}
                    </div>

                    {selectedApplicant && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>
                        {/* Active Applicant details & pipeline progression */}
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid var(--heritage-line)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={selectedApplicant.profile_photo}
                              alt={selectedApplicant.full_name}
                              onClick={() => { setSelectedDetailJob(null); onViewProfile(selectedApplicant.id); }}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--heritage-line)' }}
                            />
                            <div>
                              <strong
                                style={{ fontSize: '0.86rem', color: 'var(--heritage-ink)', cursor: 'pointer' }}
                                onClick={() => { setSelectedDetailJob(null); onViewProfile(selectedApplicant.id); }}
                              >
                                {selectedApplicant.full_name}
                              </strong>
                              <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>{selectedApplicant.profession} • {selectedApplicant.company || 'Alumnus'}</span>
                            </div>
                          </div>
                          {selectedApplicant.cover_note && (
                            <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#475569', background: '#ffffff', padding: '6px 10px', borderRadius: '6px', borderLeft: '2.5px solid var(--heritage-orange)', fontStyle: 'italic' }}>
                              "{selectedApplicant.cover_note}"
                            </p>
                          )}

                          {/* Pipeline stage changer */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--heritage-muted)' }}>Pipeline Stage:</span>
                            <select
                              value={selectedApplicant.status || 'Applied'}
                              onChange={(e) => updateApplicantPipelineStatus(job.id, selectedApplicant.id, e.target.value)}
                              style={{
                                fontSize: '0.76rem',
                                border: 'none',
                                outline: 'none',
                                cursor: 'pointer',
                                background: selectedApplicant.status === 'Offer Received' ? '#d1fae5' : selectedApplicant.status === 'Interviewing' ? '#eff6ff' : selectedApplicant.status === 'Applied' ? '#fef3c7' : '#fee2e2',
                                color: selectedApplicant.status === 'Offer Received' ? '#065f46' : selectedApplicant.status === 'Interviewing' ? '#1e40af' : selectedApplicant.status === 'Applied' ? '#92400e' : '#991b1b',
                                fontWeight: 700,
                                borderRadius: '6px',
                                padding: '4px 8px'
                              }}
                            >
                              <option value="Applied">Applied</option>
                              <option value="Interviewing">Interviewing</option>
                              <option value="Offer Received">Offer Received</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </div>
                        </div>

                        {/* Embedded conversation component */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--heritage-line)', borderRadius: '12px', overflow: 'hidden' }}>
                          <div style={{ background: '#f8fafc', padding: '8px 12px', borderBottom: '1px solid var(--heritage-line)', fontSize: '0.76rem', fontWeight: 700, color: 'var(--heritage-muted)' }}>
                            💬 Follow-up with {selectedApplicant.full_name.split(' ')[0]}
                          </div>
                          
                          {/* Messages list */}
                          <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', background: '#ffffff' }}>
                            {chatLoading ? (
                              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                                <div style={{ width: '16px', height: '16px', border: '2px solid #ccc', borderTopColor: 'var(--heritage-orange)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                              </div>
                            ) : chatMessages.length === 0 ? (
                              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.74rem', padding: '20px 0' }}>
                                No follow-up messages sent yet. Send a note to start coordinating!
                              </div>
                            ) : (
                              chatMessages.map(m => {
                                const isSender = m.sender_id === currentUser.id;
                                return (
                                  <div key={m.id} style={{ display: 'flex', justifyContent: isSender ? 'flex-end' : 'flex-start' }}>
                                    <div style={{ 
                                      maxWidth: '80%', 
                                      padding: '8px 12px', 
                                      borderRadius: '12px', 
                                      background: isSender ? 'var(--heritage-orange, #ff9f0a)' : '#f1f5f9',
                                      color: isSender ? '#ffffff' : 'var(--heritage-ink)',
                                      fontSize: '0.78rem',
                                      lineHeight: 1.4,
                                      textAlign: 'left'
                                    }}>
                                      {m.content}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Message input */}
                          <form 
                            onSubmit={(e) => { e.preventDefault(); sendChatReply(selectedApplicant.id); }}
                            style={{ display: 'flex', borderTop: '1px solid var(--heritage-line)', padding: '6px', background: '#f8fafc' }}
                          >
                            <input 
                              type="text"
                              placeholder="Type a follow-up message..."
                              value={chatText}
                              onChange={(e) => setChatText(e.target.value)}
                              style={{ flex: 1, padding: '6px 10px', fontSize: '0.78rem', border: '1px solid var(--heritage-line)', borderRadius: '6px', outline: 'none', background: '#ffffff' }}
                            />
                            <button type="submit" style={{ marginLeft: '6px', background: 'var(--heritage-orange)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                              Send
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Applicant / Guest View ───────────────────────── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflow: 'hidden' }}>
                    {alreadyApplied ? (
                      /* If already applied */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflow: 'hidden' }}>
                        
                        {/* Visual Stage Timeline */}
                        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid var(--heritage-line)' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted)' }}>Application Stage</h4>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '0 10px' }}>
                            {/* Horizontal connecting line */}
                            <div style={{ position: 'absolute', top: '10px', left: '20px', right: '20px', height: '2px', background: '#e2e8f0', zIndex: 1 }} />
                            <div style={{ position: 'absolute', top: '10px', left: '20px', width: applicantStatus === 'Rejected' ? '0%' : applicantStatus === 'Interviewing' ? '50%' : applicantStatus === 'Offer Received' ? '100%' : '0%', height: '2px', background: 'var(--heritage-orange)', zIndex: 2, transition: 'all 0.3s' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3 }}>
                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--heritage-orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>✓</div>
                              <span style={{ fontSize: '0.64rem', fontWeight: 700, marginTop: '4px', color: 'var(--heritage-orange)' }}>Applied</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3 }}>
                              <div style={{ 
                                width: '22px', 
                                height: '22px', 
                                borderRadius: '50%', 
                                background: ['Interviewing', 'Offer Received'].includes(applicantStatus) ? 'var(--heritage-orange)' : '#e2e8f0', 
                                color: ['Interviewing', 'Offer Received'].includes(applicantStatus) ? '#fff' : '#64748b', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: '0.7rem', 
                                fontWeight: 700 
                              }}>
                                {['Interviewing', 'Offer Received'].includes(applicantStatus) ? '✓' : '2'}
                              </div>
                              <span style={{ fontSize: '0.64rem', fontWeight: 700, marginTop: '4px', color: ['Interviewing', 'Offer Received'].includes(applicantStatus) ? 'var(--heritage-orange)' : '#64748b' }}>Interview</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3 }}>
                              <div style={{ 
                                width: '22px', 
                                height: '22px', 
                                borderRadius: '50%', 
                                background: applicantStatus === 'Offer Received' ? '#10b981' : applicantStatus === 'Rejected' ? '#ef4444' : '#e2e8f0', 
                                color: ['Offer Received', 'Rejected'].includes(applicantStatus) ? '#fff' : '#64748b', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: '0.7rem', 
                                fontWeight: 700 
                              }}>
                                {applicantStatus === 'Offer Received' ? '✓' : applicantStatus === 'Rejected' ? '✗' : '3'}
                              </div>
                              <span style={{ fontSize: '0.64rem', fontWeight: 700, marginTop: '4px', color: applicantStatus === 'Offer Received' ? '#10b981' : applicantStatus === 'Rejected' ? '#ef4444' : '#64748b' }}>
                                {applicantStatus === 'Rejected' ? 'Rejected' : 'Offered'}
                              </span>
                            </div>
                          </div>

                          <div style={{ marginTop: '14px', fontSize: '0.78rem', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                            <strong>Your Cover Note:</strong> "{alreadyApplied.cover_note || 'None'}"
                          </div>
                        </div>

                        {/* Follow-up chat panel */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--heritage-line)', borderRadius: '12px', overflow: 'hidden' }}>
                          <div style={{ background: '#f8fafc', padding: '8px 12px', borderBottom: '1px solid var(--heritage-line)', fontSize: '0.76rem', fontWeight: 700, color: 'var(--heritage-muted)' }}>
                            💬 Follow-up with {job.poster?.full_name?.split(' ')[0] || 'Sponsor'}
                          </div>

                          {/* Messages list */}
                          <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', background: '#ffffff' }}>
                            {chatLoading ? (
                              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                                <div style={{ width: '16px', height: '16px', border: '2px solid #ccc', borderTopColor: 'var(--heritage-orange)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                              </div>
                            ) : chatMessages.length === 0 ? (
                              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.74rem', padding: '20px 0' }}>
                                No messages yet. Say hello to follow up on your request!
                              </div>
                            ) : (
                              chatMessages.map(m => {
                                const isSender = m.sender_id === currentUser.id;
                                return (
                                  <div key={m.id} style={{ display: 'flex', justifyContent: isSender ? 'flex-end' : 'flex-start' }}>
                                    <div style={{ 
                                      maxWidth: '80%', 
                                      padding: '8px 12px', 
                                      borderRadius: '12px', 
                                      background: isSender ? 'var(--heritage-orange, #ff9f0a)' : '#f1f5f9',
                                      color: isSender ? '#ffffff' : 'var(--heritage-ink)',
                                      fontSize: '0.78rem',
                                      lineHeight: 1.4,
                                      textAlign: 'left'
                                    }}>
                                      {m.content}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Message input */}
                          <form 
                            onSubmit={(e) => { e.preventDefault(); sendChatReply(job.posted_by); }}
                            style={{ display: 'flex', borderTop: '1px solid var(--heritage-line)', padding: '6px', background: '#f8fafc' }}
                          >
                            <input 
                              type="text"
                              placeholder="Type a follow-up message..."
                              value={chatText}
                              onChange={(e) => setChatText(e.target.value)}
                              style={{ flex: 1, padding: '6px 10px', fontSize: '0.78rem', border: '1px solid var(--heritage-line)', borderRadius: '6px', outline: 'none', background: '#ffffff' }}
                            />
                            <button type="submit" style={{ marginLeft: '6px', background: 'var(--heritage-orange)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                              Send
                            </button>
                          </form>
                        </div>

                      </div>
                    ) : (
                      /* If not applied: Apply form directly inside the overlay! */
                      <form onSubmit={handlePopupApplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                        <div style={{ background: 'rgba(255, 159, 10, 0.04)', border: '1px solid rgba(255, 159, 10, 0.15)', padding: '14px', borderRadius: '12px' }}>
                          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8rem', fontWeight: 800, color: 'var(--heritage-orange)' }}>Request a Referral</h4>
                          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', lineHeight: 1.4 }}>
                            Provide a cover note outlining your background, Scholastic house alignment, and skills to establish a verified connection with the Sponsor.
                          </p>
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--heritage-muted)', marginBottom: '6px' }}>
                            Your Cover Note / Message
                          </label>
                          <textarea
                            rows={6}
                            required
                            placeholder="Introduce yourself, state your graduation year, Scholastic house, and briefly highlight why your profile matches the role requirements..."
                            value={popupApplyNotes}
                            onChange={(e) => setPopupApplyNotes(e.target.value)}
                            style={{ 
                              width: '100%', 
                              flex: 1, 
                              padding: '10px 12px', 
                              background: '#ffffff', 
                              border: '1px solid var(--heritage-line)', 
                              color: 'var(--heritage-ink)', 
                              borderRadius: '8px', 
                              fontSize: '0.82rem', 
                              outline: 'none', 
                              boxSizing: 'border-box', 
                              fontFamily: 'inherit',
                              resize: 'none'
                            }}
                          />
                        </div>

                        <button 
                          type="submit" 
                          disabled={popupApplying}
                          style={{ 
                            width: '100%', 
                            padding: '12px', 
                            background: 'var(--heritage-orange, #ff9f0a)', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '8px', 
                            fontWeight: 700, 
                            fontSize: '0.9rem',
                            cursor: popupApplying ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 6px rgba(255, 159, 10, 0.1)'
                          }}
                        >
                          {popupApplying ? "Submitting application..." : "File Application / Request"}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
