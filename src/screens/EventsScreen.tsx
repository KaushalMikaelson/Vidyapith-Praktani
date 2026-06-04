"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RKMV_DB, Event, RSVP } from '../database/database';
import { Calendar, PlusCircle, Video, Users, MapPin, CheckCircle, X } from 'lucide-react';

interface EventsScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
}

export const EventsScreen: React.FC<EventsScreenProps> = ({ showToast }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'archive'>('upcoming');
  const [events, setEvents] = useState<Event[]>([]);
  
  // RSVP modal state
  const [rsvpModalVisible, setRsvpModalVisible] = useState(false);
  const [rsvpEventId, setRsvpEventId] = useState('');
  const [rsvpGuests, setRsvpGuests] = useState('0');
  const [rsvpDiet, setRsvpDiet] = useState('Vegetarian');

  // Create Event Modal state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtDate, setEvtDate] = useState('');
  const [evtType, setEvtType] = useState<'physical' | 'virtual' | 'hybrid'>('physical');
  const [evtLocation, setEvtLocation] = useState('');
  const [evtCapacity, setEvtCapacity] = useState('100');

  const loadEvents = () => {
    const list = RKMV_DB.getEvents();
    const now = new Date();

    if (activeTab === 'upcoming') {
      setEvents(list.filter(e => new Date(e.event_date) >= now));
    } else {
      setEvents(list.filter(e => new Date(e.event_date) < now));
    }
  };

  useEffect(() => {
    loadEvents();
  }, [activeTab]);

  if (!currentUser) return null;

  const canCreateEvent = currentUser.role === 'admin';

  const openRSVPModal = (eventId: string) => {
    setRsvpEventId(eventId);
    setRsvpGuests('0');
    setRsvpDiet('Vegetarian');
    setRsvpModalVisible(true);
  };

  const handleRSVPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newRsvp: RSVP = {
      id: 'rsvp-' + Math.random().toString(36).substr(2, 9),
      event_id: rsvpEventId,
      user_id: currentUser.id,
      guest_count: parseInt(rsvpGuests),
      dietary_pref: rsvpDiet,
      created_at: new Date().toISOString()
    };

    RKMV_DB.addRSVP(newRsvp);
    showToast("RSVP registered successfully! Ticket generated.", "success");
    setRsvpModalVisible(false);
    loadEvents();
  };

  const handleCreateEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtTitle.trim() || !evtDesc.trim() || !evtDate || !evtLocation.trim()) {
      showToast("Please fill all required fields.", "danger");
      return;
    }

    const newEvt: Event = {
      id: 'evt-' + Math.random().toString(36).substr(2, 9),
      title: evtTitle.trim(),
      description: evtDesc.trim(),
      event_date: new Date(evtDate).toISOString(),
      location: evtLocation.trim(),
      event_type: evtType,
      online_link: evtType === 'virtual' ? evtLocation.trim() : '',
      max_capacity: parseInt(evtCapacity) || 100,
      created_by: currentUser.id,
      created_at: new Date().toISOString()
    };

    RKMV_DB.addEvent(newEvt);
    showToast("Community gathering published successfully!", "success");
    
    // Reset and close
    setCreateModalVisible(false);
    setEvtTitle('');
    setEvtDesc('');
    setEvtDate('');
    setEvtType('physical');
    setEvtLocation('');
    setEvtCapacity('100');
    loadEvents();
  };

  const formatEventDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="events-layout">
      {/* Page Title & CTA */}
      <div className="page-title-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-title-text">
          <h2>Gatherings & Vidyapith Events</h2>
          <p>Stay updated on upcoming chapter meetings, webinars, and the centennial celebrations in Deoghar.</p>
        </div>
        {canCreateEvent && (
          <button className="btn btn-primary" onClick={() => setCreateModalVisible(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} />
            <span>Create Event</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="events-tabs" style={{ display: 'flex', gap: '14px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button 
          className={`event-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`} 
          onClick={() => setActiveTab('upcoming')}
          style={{ background: 'none', border: 'none', padding: '12px 16px', color: activeTab === 'upcoming' ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: 600, borderBottom: activeTab === 'upcoming' ? '2px solid var(--primary-color)' : undefined, cursor: 'pointer' }}
        >
          Upcoming Events
        </button>
        <button 
          className={`event-tab-btn ${activeTab === 'archive' ? 'active' : ''}`} 
          onClick={() => setActiveTab('archive')}
          style={{ background: 'none', border: 'none', padding: '12px 16px', color: activeTab === 'archive' ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: 600, borderBottom: activeTab === 'archive' ? '2px solid var(--primary-color)' : undefined, cursor: 'pointer' }}
        >
          Memory Archive & Past Events
        </button>
      </div>

      {/* Events Grid */}
      <div className="events-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {events.length === 0 ? (
          <div className="glass-panel loading-state" style={{ gridColumn: '1 / -1', minHeight: '250px' }}>
            <Calendar size={48} style={{ color: 'var(--text-muted)' }} />
            <p>No {activeTab} events logged in the platform.</p>
          </div>
        ) : (
          events.map(evt => {
            const isPast = new Date(evt.event_date) < new Date();
            const isRSVPed = RKMV_DB.hasUserRSVPed(evt.id, currentUser.id);
            const rsvpCount = RKMV_DB.getRSVPs(evt.id).length;

            return (
              <div key={evt.id} className="glass-panel event-card">
                <div className="event-card-banner" style={{ background: 'linear-gradient(135deg, #0c1e36 0%, #1e3a5f 100%)', height: '120px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                  <span className="event-banner-emblem">🏵️</span>
                  <div className="event-banner-overlay" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    <span className={`badge ${evt.event_type === 'physical' ? 'badge-role' : evt.event_type === 'virtual' ? 'badge-admin' : 'badge-approved'}`}>
                      {evt.event_type}
                    </span>
                  </div>
                </div>
                
                <div className="event-card-body" style={{ padding: '20px' }}>
                  <span className="event-date-badge" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-gold)', marginBottom: '8px' }}>
                    {formatEventDate(evt.event_date)}
                  </span>
                  <h3 className="event-card-title" style={{ fontSize: '1.15rem', marginBottom: '8px' }}>{evt.title}</h3>
                  <p className="event-card-desc" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', minHeight: '3.6em', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {evt.description}
                  </p>
                  
                  <div className="event-meta-lines" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginBottom: '16px' }}>
                    <div className="event-meta-line" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} />
                      <span>{evt.location}</span>
                    </div>
                    <div className="event-meta-line" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} />
                      <span>{rsvpCount} Alumnus Confirmed (Capacity: {evt.max_capacity})</span>
                    </div>
                    {evt.event_type === 'virtual' && isRSVPed && (
                      <div className="event-meta-line" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-success)' }}>
                        <Video size={14} />
                        <a href={evt.online_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-success)', fontWeight: 600, textDecoration: 'underline' }}>
                          Click to Join Webinar
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="event-card-actions">
                    {isPast ? (
                      <button className="btn btn-secondary btn-block" disabled>
                        <span>Gathering Concluded</span>
                      </button>
                    ) : isRSVPed ? (
                      <button className="btn btn-secondary btn-block" style={{ borderColor: 'var(--text-success)', color: 'var(--text-success)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={(e) => e.preventDefault()}>
                        <CheckCircle size={14} />
                        <span>RSVP Confirmed</span>
                      </button>
                    ) : (
                      <button className="btn btn-primary btn-block" onClick={() => openRSVPModal(evt.id)}>
                        <span>RSVP & Register</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RSVP Modal Overlay */}
      {rsvpModalVisible && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-card" style={{ maxWidth: '440px', padding: '30px' }}>
            <div className="page-title-box" style={{ marginBottom: '20px' }}>
              <h3>Event RSVP Registration</h3>
              <button className="icon-btn" onClick={() => setRsvpModalVisible(false)}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleRSVPSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Number of Guests (Family members)
                </label>
                <input 
                  type="number" 
                  min={0} 
                  max={5} 
                  required 
                  value={rsvpGuests}
                  onChange={(e) => setRsvpGuests(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Dietary Preferences
                </label>
                <select 
                  value={rsvpDiet}
                  onChange={(e) => setRsvpDiet(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                >
                  <option value="Vegetarian">Strictly Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="None">No Preference / N/A</option>
                </select>
              </div>

              <div className="motto-box" style={{ marginBottom: '18px', padding: '12px', background: 'rgba(243,112,33,0.08)', borderRadius: '4px' }}>
                <p className="motto-text" style={{ color: 'var(--primary-color)' }}>
                  Note: Vidyapith dining works on structured timings. Please confirm strictly if you are attending.
                </p>
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                <span>Confirm RSVP Allocation</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {createModalVisible && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-card" style={{ maxWidth: '500px', padding: '30px' }}>
            <div className="page-title-box" style={{ marginBottom: '20px' }}>
              <h3>Create New Gathering</h3>
              <button className="icon-btn" onClick={() => setCreateModalVisible(false)}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleCreateEventSubmit}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Event Title</label>
                <input 
                  type="text" 
                  placeholder="E.g., Bangalore Chapter Reunion 2026" 
                  required 
                  value={evtTitle}
                  onChange={(e) => setEvtTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Description</label>
                <textarea 
                  rows={3} 
                  placeholder="Provide agenda, timings, guest info..." 
                  required 
                  value={evtDesc}
                  onChange={(e) => setEvtDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontFamily: 'inherit' }}
                />
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Date & Time</label>
                  <input 
                    type="datetime-local" 
                    required 
                    value={evtDate}
                    onChange={(e) => setEvtDate(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Type</label>
                  <select 
                    value={evtType}
                    onChange={(e) => setEvtType(e.target.value as any)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  >
                    <option value="physical">Physical Meeting</option>
                    <option value="virtual">Virtual Webinar</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Venue / Location Link</label>
                <input 
                  type="text" 
                  placeholder="E.g., Hotel Taj West End / Zoom Link" 
                  required 
                  value={evtLocation}
                  onChange={(e) => setEvtLocation(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Max Seating Capacity</label>
                <input 
                  type="number" 
                  min={5}
                  value={evtCapacity}
                  onChange={(e) => setEvtCapacity(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                <span>Publish Event Listing</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

