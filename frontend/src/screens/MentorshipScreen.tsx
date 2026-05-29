import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RKMV_DB, User, Mentorship } from '../database/database';
import { GraduationCap, Sparkles, X, Plus } from 'lucide-react';

interface MentorshipScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

export const MentorshipScreen: React.FC<MentorshipScreenProps> = ({ showToast, onViewProfile }) => {
  const { currentUser } = useAuth();
  const [selectedField, setSelectedField] = useState('');
  const [mentors, setMentors] = useState<User[]>([]);
  const [activeMentorships, setActiveMentorships] = useState<Mentorship[]>([]);

  // Request Modal States
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [requestGoals, setRequestGoals] = useState('');
  const [requestTime, setRequestTime] = useState('3 Months');

  const loadMentorship = () => {
    let list = RKMV_DB.getApprovedAlumni();
    
    if (selectedField) {
      if (selectedField === 'Software Engineering') {
        list = list.filter(m => m.profession.toLowerCase().includes('architect') || m.profession.toLowerCase().includes('software') || m.profession.toLowerCase().includes('tech'));
      } else if (selectedField === 'Healthcare & Medicine') {
        list = list.filter(m => m.profession.toLowerCase().includes('cardiologist') || m.profession.toLowerCase().includes('doctor') || m.profession.toLowerCase().includes('surgeon'));
      } else if (selectedField === 'Civil Services') {
        list = list.filter(m => m.profession.toLowerCase().includes('officer') || m.profession.toLowerCase().includes('service') || m.profession.toLowerCase().includes('ifs') || m.profession.toLowerCase().includes('ias'));
      } else if (selectedField === 'Entrepreneurship') {
        list = list.filter(m => m.profession.toLowerCase().includes('founder') || m.profession.toLowerCase().includes('ceo') || m.profession.toLowerCase().includes('consultant'));
      }
    }

    setMentors(list);
    setActiveMentorships(RKMV_DB.getMentorships());
  };

  useEffect(() => {
    loadMentorship();
  }, [selectedField]);

  if (!currentUser) return null;

  const openRequestModal = (mentorId: string) => {
    setSelectedMentorId(mentorId);
    setRequestModalVisible(true);
  };

  const handleRequestMentorship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestGoals.trim()) {
      showToast("Please provide your mentorship goals.", "danger");
      return;
    }

    const newPair: Mentorship = {
      id: 'ment-' + Math.random().toString(36).substr(2, 9),
      mentor_id: selectedMentorId,
      mentee_id: currentUser.id,
      status: "active", // Simulate auto-acceptance
      goals: requestGoals.trim(),
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      created_at: new Date().toISOString()
    };

    RKMV_DB.addMentorship(newPair);
    showToast("Mentorship requested and accepted successfully!", "success");

    // Reset and close
    setRequestModalVisible(false);
    setRequestGoals('');
    setRequestTime('3 Months');
    
    // Trigger notification to mentor
    RKMV_DB.addNotification({
      id: 'not-' + Math.random().toString(36).substr(2, 9),
      user_id: selectedMentorId,
      title: "New Mentee Paired",
      body: `${currentUser.full_name} has requested your mentorship guidance.`,
      type: "success",
      read: false,
      created_at: new Date().toISOString()
    });

    loadMentorship();
  };

  const getSkillsForMentor = (mentorId: string) => {
    if (mentorId === 'usr-alumni-1') return ['Cloud Architecture', 'React Native', 'TypeScript', 'JEE Prep'];
    if (mentorId === 'usr-alumni-2') return ['Clinical Medicine', 'Cardiology', 'Bio-Ethics', 'Social Work'];
    if (mentorId === 'usr-alumni-3') return ['Diplomacy', 'UPSC Strategy', 'International Relations'];
    return ['Character Building', 'Leadership', 'Ethics'];
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

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', lineHeight: 1.4 }}>
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
              <GraduationCap size={48} style={{ color: 'var(--text-muted)' }} />
              <p>No active mentors found matching the {selectedField} domain in our database.</p>
            </div>
          ) : (
            mentors.map(m => {
              const skills = getSkillsForMentor(m.id);
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
                      <h3 style={{ cursor: 'pointer' }} onClick={() => onViewProfile(m.id)}>{m.full_name}</h3>
                      <span className="mentor-batch">Batch of {m.batch_year} • {m.house}</span>
                      <span className="mentor-work">{m.profession}</span>
                    </div>
                  </div>

                  <div className="mentor-field-box" style={{ margin: '14px 0' }}>
                    <div className="mentor-skills" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {skills.map(s => (
                        <span key={s} className="skill-tag" style={{ background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="mentor-bio" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px', minHeight: '3.6em', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {m.bio}
                  </p>

                  <div className="mentor-stats" style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px' }}>
                    <div className="mentor-stat">
                      <span className="stat-val" style={{ display: 'block', fontWeight: 700, color: 'white' }}>{currentActivePairings} / 3</span>
                      <span className="stat-lbl" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active Mentees</span>
                    </div>
                    <div className="mentor-stat" style={{ textAlign: 'right' }}>
                      <span className="stat-val" style={{ display: 'block', fontWeight: 700, color: 'white' }}>98%</span>
                      <span className="stat-lbl" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rating Score</span>
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
