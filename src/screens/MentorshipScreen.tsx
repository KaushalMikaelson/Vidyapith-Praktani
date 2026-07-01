"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Sparkles, X } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface MentorshipScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

export const MentorshipScreen: React.FC<MentorshipScreenProps> = ({ showToast, onViewProfile }) => {
  const { currentUser } = useAuth();
  const [selectedField, setSelectedField] = useState('');
  const [mentors, setMentors] = useState<any[]>([]);
  const [activeMentorships, setActiveMentorships] = useState<any[]>([]); 

  // Request Modal States
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [requestGoals, setRequestGoals] = useState('');
  const [requestTime, setRequestTime] = useState('3 Months');

  const loadMentorship = async () => {
    try {
      const mentorsList = await apiFetch(`/mentorship/mentors?expertiseField=${selectedField}`);
      setMentors(mentorsList);
      
      const pairings = await apiFetch('/mentorship/pairings');
      setActiveMentorships(pairings);
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  useEffect(() => {
    loadMentorship();
  }, [selectedField]);

  if (!currentUser) return null;

  const openRequestModal = (mentorId: string) => {
    setSelectedMentorId(mentorId);
    setRequestModalVisible(true);
  };

  const handleRequestMentorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestGoals.trim()) {
      showToast("Please provide your mentorship goals.", "danger");
      return;
    }

    try {
      await apiFetch('/mentorship/request', {
        method: 'POST',
        body: JSON.stringify({
          mentorId: selectedMentorId,
          goals: requestGoals.trim()
        })
      });
      showToast("Mentorship requested and accepted successfully!", "success");

      // Reset and close
      setRequestModalVisible(false);
      setRequestGoals('');
      setRequestTime('3 Months');
      loadMentorship();
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const getSkillsForMentor = (mentor: any): string[] => {
    const skillMap: Record<string, string[]> = {
      'Software Engineering': ['System Design', 'Cloud Architecture', 'DSA', 'Competitive Programming'],
      'Healthcare & Medicine': ['Clinical Practice', 'Medical Ethics', 'Research Methods', 'Patient Care'],
      'Civil Services': ['UPSC Strategy', 'GS Paper Prep', 'Essay Writing', 'Interview Coaching'],
      'Entrepreneurship': ['Startup Strategy', 'Fundraising', 'Product Management', 'Go-to-Market'],
    };
    const field = mentor.profession || selectedField;
    for (const [key, skills] of Object.entries(skillMap)) {
      if (field.toLowerCase().includes(key.toLowerCase().split(' ')[0].toLowerCase())) {
        return skills;
      }
    }
    return ['Leadership', 'Character Building', 'Goal Setting', 'Career Mentoring'];
  };

  return (
    <div className="mentorship-layout">
      {/* Sidebar Filters */}
      <div className="glass-panel mentor-search-sidebar" style={{ padding: '20px' }}>
        <h3 className="widget-title" style={{ marginBottom: '14px' }}>Expertise Areas</h3>
        
        <div className="groups-list">
          <button 
            className={`group-item-btn ${selectedField === '' ? 'active' : ''}`} 
            onClick={() => setSelectedField('')}
          >
            <span>All Expertise Fields</span>
          </button>
          <button 
            className={`group-item-btn ${selectedField === 'Software Engineering' ? 'active' : ''}`} 
            onClick={() => setSelectedField('Software Engineering')}
          >
            <span>Software Engineering</span>
          </button>
          <button 
            className={`group-item-btn ${selectedField === 'Healthcare & Medicine' ? 'active' : ''}`} 
            onClick={() => setSelectedField('Healthcare & Medicine')}
          >
            <span>Healthcare & Medicine</span>
          </button>
          <button 
            className={`group-item-btn ${selectedField === 'Civil Services' ? 'active' : ''}`} 
            onClick={() => setSelectedField('Civil Services')}
          >
            <span>Civil Services</span>
          </button>
          <button 
            className={`group-item-btn ${selectedField === 'Entrepreneurship' ? 'active' : ''}`} 
            onClick={() => setSelectedField('Entrepreneurship')}
          >
            <span>Entrepreneurship & VCs</span>
          </button>
        </div>

        {/* Active Pairings Widget */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
          <h3 className="widget-title" style={{ marginBottom: '14px', fontSize: '0.9rem', color: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>My Active Pairings</span>
            <span style={{ background: '#ec4899', color: 'white', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem' }}>
              {activeMentorships.filter(p => p.status === 'active').length}
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeMentorships.filter(p => p.status === 'active').length === 0 ? (
              <span style={{ fontSize: '0.8rem', color: 'inherit', opacity: 0.6 }}>No active mentorship pairings.</span>
            ) : (
              activeMentorships.filter(p => p.status === 'active').map((pair: any) => {
                const partner = pair.mentor_id === currentUser.id ? pair.mentee : pair.mentor;
                const isMentorOfUser = pair.mentor_id === currentUser.id;
                if (!partner) return null;
                return (
                  <div key={pair.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(0,0,0,0.02)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <img 
                      src={partner.profile_photo} 
                      alt="" 
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => onViewProfile(partner.id)}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => onViewProfile(partner.id)}>
                        {partner.full_name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'inherit', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isMentorOfUser ? 'Menteé' : 'Mentor'} • {partner.profession}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'inherit', opacity: 0.6, display: 'block', lineHeight: 1.4 }}>
            Active pairings are reviewed by the school headmaster monthly to assure proper standards.
          </span>
        </div>
      </div>

      {/* Mentors Column */}
      <div className="mentors-main-column">
        <div className="page-title-box">
          <div className="page-title-text">
            <h2>Mentorship Pairing Hub</h2>
            <p>Acquire wisdom, career counseling, and values-driven guidance from senior Vidyapith ex-students.</p>
          </div>
        </div>

        <div className="mentor-grid">
          {mentors.length === 0 ? (
            <div className="glass-panel loading-state" style={{ gridColumn: '1 / -1', minHeight: '250px' }}>
              <GraduationCap size={48} style={{ color: 'inherit', opacity: 0.5 }} />
              <p>No active mentors found matching the {selectedField} domain in our database.</p>
            </div>
          ) : (
            mentors.map(m => {
              const skills = getSkillsForMentor(m);
              const currentActivePairings = activeMentorships.filter(pair => pair.mentor_id === m.id && pair.status === 'active').length;
              const isAlreadyMentee = activeMentorships.some(pair => pair.mentor_id === m.id && pair.mentee_id === currentUser.id && pair.status === 'active');

              return (
                <div key={m.id} className="glass-panel mentor-card" style={{ padding: '24px' }}>
                  <span className="mentor-badge">Verified Mentor</span>
                  
                  <div className="mentor-card-header">
                    <img 
                      src={m.profile_photo} 
                      alt={m.full_name} 
                      className="mentor-photo" 
                      onClick={() => onViewProfile(m.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div className="mentor-meta">
                      <h3 style={{ cursor: 'pointer', margin: 0 }} onClick={() => onViewProfile(m.id)}>{m.full_name}</h3>
                      <span className="mentor-batch">
                        Batch of {m.batch_year}
                        {m.leaving_class && (
                          <span style={{ marginLeft: '5px', fontSize: '0.68rem', background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '10px', padding: '0px 6px', fontWeight: 700 }}>
                            Cls {m.leaving_class}
                          </span>
                        )}
                        {' '}• {m.house}
                      </span>
                      <span className="mentor-work">{m.profession}</span>
                    </div>
                  </div>

                  <div className="mentor-field-box" style={{ margin: '14px 0' }}>
                    <div className="mentor-skills" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {skills.map(s => (
                        <span key={s} className="skill-tag" style={{ background: 'rgba(0,0,0,0.05)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', color: 'inherit', opacity: 0.8 }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="mentor-bio" style={{ fontSize: '0.85rem', color: 'inherit', opacity: 0.7, marginBottom: '14px', minHeight: '3.6em', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {m.bio}
                  </p>

                  <div className="mentor-stats" style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.02)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px' }}>
                    <div className="mentor-stat">
                      <span className="stat-val" style={{ display: 'block', fontWeight: 700, color: 'inherit' }}>{currentActivePairings} / 3</span>
                      <span className="stat-lbl" style={{ fontSize: '0.7rem', color: 'inherit', opacity: 0.6 }}>Active Mentees</span>
                    </div>
                    <div className="mentor-stat" style={{ textAlign: 'right' }}>
                      <span className="stat-val" style={{ display: 'block', fontWeight: 700, color: 'var(--text-success)' }}>Verified</span>
                      <span className="stat-lbl" style={{ fontSize: '0.7rem', color: 'inherit', opacity: 0.6 }}>Alumni Status</span>
                    </div>
                  </div>

                  {isAlreadyMentee ? (
                    <button className="btn btn-secondary btn-block" style={{ borderColor: 'var(--text-success)', color: 'var(--text-success)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={(e) => e.preventDefault()}>
                      <Sparkles size={16} />
                      <span>Active Mentor</span>
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-block" onClick={() => openRequestModal(m.id)}>
                      <GraduationCap size={16} style={{ marginRight: '8px' }} />
                      <span>Request Mentoring</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Request Modal Overlay */}
      {requestModalVisible && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-card" style={{ maxWidth: '460px', padding: '30px' }}>
            <div className="page-title-box" style={{ marginBottom: '20px' }}>
              <h3>Request Mentorship Support</h3>
              <button className="icon-btn" onClick={() => setRequestModalVisible(false)}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleRequestMentorship}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  What are your primary mentorship goals?
                </label>
                <textarea 
                  rows={4} 
                  placeholder="Describe what you want guidance on (e.g. college applications, learning web architecture, civil service exams preparation...)" 
                  required 
                  value={requestGoals}
                  onChange={(e) => setRequestGoals(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontFamily: 'inherit'
                  }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Estimated Timeline commitment
                </label>
                <select 
                  value={requestTime}
                  onChange={(e) => setRequestTime(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px'
                  }}
                >
                  <option value="3 Months">3 Months (Short-term focus)</option>
                  <option value="6 Months">6 Months (Comprehensive guidance)</option>
                  <option value="1 Year">1 Year (Long-term career pairing)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                <span>Submit Request to Mentor</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

