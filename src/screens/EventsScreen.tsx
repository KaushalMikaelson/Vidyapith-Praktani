"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Event } from '../database/database';
import { Calendar, Check, Clock, Filter, Image as ImageIcon, Lightbulb, MapPin, Plus, Send, Users, X, QrCode } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface EventsScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
}

const fallbackEvents = [
  {
    id: 'mock-gala',
    title: 'Centennial Grand Reunion Gala',
    description: 'Celebrating a century of legacy with our largest gathering yet - dinner, awards, and live performances.',
    event_date: '2026-12-15T18:00:00.000Z',
    location: 'Grand Hall, Campus',
    event_type: 'physical',
    online_link: '',
    max_capacity: 500,
    created_by: 'system',
    created_at: new Date().toISOString(),
    rsvps: [{ user_id: 'demo' }, { user_id: 'demo-2' }]
  },
  {
    id: 'mock-tech',
    title: 'Careers in Tech: Alumni Panel',
    description: 'Hear from alumni leading at top tech companies. Q&A and mentorship matching included.',
    event_date: '2026-11-28T19:30:00.000Z',
    location: 'Online · Zoom',
    event_type: 'virtual',
    online_link: '#',
    max_capacity: 300,
    created_by: 'system',
    created_at: new Date().toISOString(),
    rsvps: []
  },
  {
    id: 'mock-coffee',
    title: 'Class of 2010 Coffee Catch-up',
    description: 'Casual morning meetup for the 2010 batch. Bring your families and reconnect over coffee.',
    event_date: '2026-12-02T11:00:00.000Z',
    location: 'Brew Lane, NYC',
    event_type: 'physical',
    online_link: '',
    max_capacity: 80,
    created_by: 'system',
    created_at: new Date().toISOString(),
    rsvps: []
  }
] as any[];

export const EventsScreen: React.FC<EventsScreenProps> = ({ showToast }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'archive'>('upcoming');
  const [events, setEvents] = useState<any[]>([]);
  const [rsvpModalVisible, setRsvpModalVisible] = useState(false);
  const [rsvpEventId, setRsvpEventId] = useState('');
  const [rsvpGuests, setRsvpGuests] = useState('0');
  const [rsvpDiet, setRsvpDiet] = useState('Vegetarian');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtDate, setEvtDate] = useState('');
  const [evtType, setEvtType] = useState<'physical' | 'virtual' | 'hybrid'>('physical');
  const [evtLocation, setEvtLocation] = useState('');
  const [evtCapacity, setEvtCapacity] = useState('100');

  // Feature 2: RSVP Ticket & ICS states
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [ticketEvent, setTicketEvent] = useState<any | null>(null);

  const downloadICS = (event: any) => {
    const dDate = new Date(event.event_date);
    const start = dDate.toISOString().replace(/-|:|\.\d\d\d/g, ""); // YYYYMMDDTHHmmssZ
    const end = new Date(dDate.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const title = event.title;
    const desc = event.description.replace(/\n/g, "\\n");
    const loc = event.location;

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Vidyapith Connect//Event Calendar//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@vidyapithconnect.in`,
      `DTSTAMP:${start}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc}`,
      `LOCATION:${loc}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, "_")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Calendar invitation downloaded!`, 'success');
  };

  const openTicketModal = (event: any) => {
    setTicketEvent(event);
    setTicketModalVisible(true);
  };

  const [filterBatch, setFilterBatch] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterLocation, setFilterLocation] = useState<string>('All');

  const getCountdownText = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return '';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    if (days > 0) {
      return `${days}d ${hours}h left`;
    }
    return `${hours}h ${minutes}m left`;
  };

  const loadEvents = async () => {
    try {
      const list = await apiFetch('/events');
      const source = list;
      const now = new Date();
      setEvents(source.filter((event: any) => activeTab === 'upcoming' ? new Date(event.event_date) >= now : new Date(event.event_date) < now));
    } catch (err: any) {
      setEvents(fallbackEvents);
      showToast(err.message, 'danger');
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

  const handleRSVPSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Optimistic: close modal and update RSVP count instantly
    const currentEventId = rsvpEventId;
    setRsvpModalVisible(false);
    showToast("RSVP registered successfully! Ticket generated.", "success");
    setEvents(prev => prev.map((e: any) =>
      e.id === currentEventId
        ? { ...e, rsvps: [...(e.rsvps || []), { user_id: currentUser!.id, guest_count: parseInt(rsvpGuests), dietary_pref: rsvpDiet }] }
        : e
    ));
    try {
      await apiFetch(`/events/${currentEventId}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ guestCount: parseInt(rsvpGuests), dietaryPref: rsvpDiet })
      });
    } catch (err: any) {
      // Revert on failure
      setEvents(prev => prev.map((e: any) =>
        e.id === currentEventId
          ? { ...e, rsvps: (e.rsvps || []).filter((r: any) => r.user_id !== currentUser!.id) }
          : e
      ));
      showToast(err.message, 'danger');
    }
  };

  const handleCreateEventSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!evtTitle.trim() || !evtDesc.trim() || !evtDate || !evtLocation.trim()) {
      showToast("Please fill all required fields.", "danger");
      return;
    }
    // Optimistic: add event instantly and close modal
    const tempEvent = {
      id: `temp-evt-${Date.now()}`,
      title: evtTitle.trim(),
      description: evtDesc.trim(),
      event_date: new Date(evtDate).toISOString(),
      location: evtLocation.trim(),
      event_type: evtType,
      online_link: evtType === 'virtual' ? evtLocation.trim() : '',
      max_capacity: parseInt(evtCapacity) || 100,
      created_by: currentUser!.id,
      created_at: new Date().toISOString(),
      rsvps: []
    };
    setEvents(prev => [tempEvent, ...prev]);
    showToast("Community gathering published successfully!", "success");
    setCreateModalVisible(false);
    setEvtTitle('');
    setEvtDesc('');
    setEvtDate('');
    setEvtType('physical');
    setEvtLocation('');
    setEvtCapacity('100');
    try {
      await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify({
          title: tempEvent.title,
          description: tempEvent.description,
          eventDate: tempEvent.event_date,
          location: tempEvent.location,
          eventType: evtType,
          onlineLink: tempEvent.online_link,
          maxCapacity: tempEvent.max_capacity
        })
      });
      // Silently refresh to get real ID from server
      loadEvents();
    } catch (err: any) {
      setEvents(prev => prev.filter((e: any) => e.id !== tempEvent.id));
      showToast(err.message, 'danger');
    }
  };

  const dateParts = (isoString: string) => {
    const d = new Date(isoString);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const eventImages = [
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=500&h=330&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&h=330&fit=crop&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&h=330&fit=crop&q=80'
  ];

  const uniqueLocations = Array.from(new Set(events.map(e => e.location))).filter(Boolean) as string[];
  const uniqueBatches = Array.from(new Set(events.map(e => {
    const match = e.title.match(/\b(19\d\d|20\d\d)\b/) || e.description.match(/\b(19\d\d|20\d\d)\b/);
    return match ? match[0] : null;
  }))).filter(Boolean) as string[];

  const filteredEvents = events.filter(evt => {
    if (filterBatch !== 'All') {
      const matchesBatch = evt.title.includes(filterBatch) || evt.description.includes(filterBatch);
      if (!matchesBatch) return false;
    }
    if (filterType !== 'All') {
      if (evt.event_type !== filterType) return false;
    }
    if (filterLocation !== 'All') {
      if (evt.location !== filterLocation) return false;
    }
    return true;
  });

  return (
    <div className="heritage-page events-redesign">
      <section className="events-hero">
        <div>
          <span>100 Years of Legacy</span>
          <h1>Reunions & Events</h1>
          <p>Relive the Legacy</p>
          {canCreateEvent && (
            <button onClick={() => setCreateModalVisible(true)}><Plus size={18} /> Create Event</button>
          )}
        </div>
      </section>

      <section className="events-filter-strip">
        <label>
          <Users size={16} /> <span>Year / Batch</span>
          <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)}>
            <option value="All">All Batches</option>
            {uniqueBatches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>
        <label>
          <Calendar size={16} /> <span>Event Type</span>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="All">All Types</option>
            <option value="physical">Physical Meeting</option>
            <option value="virtual">Virtual Webinar</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>
        <label>
          <MapPin size={16} /> <span>Location</span>
          <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
            <option value="All">Anywhere</option>
            {uniqueLocations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </label>
        <button onClick={() => { setFilterBatch('All'); setFilterType('All'); setFilterLocation('All'); }} style={{ cursor: 'pointer' }}>
          <Filter size={18} /> Reset
        </button>
      </section>

      <div className="events-shell">
        <main>
          <div className="events-section-head">
            <h2>{activeTab === 'upcoming' ? 'Upcoming Events' : 'Past Events'}</h2>
            <div>
              <button className={activeTab === 'upcoming' ? 'active' : ''} onClick={() => setActiveTab('upcoming')}>Upcoming</button>
              <button className={activeTab === 'archive' ? 'active' : ''} onClick={() => setActiveTab('archive')}>Past</button>
            </div>
          </div>

          <div className="events-list">
            {filteredEvents.map((evt: any, index) => {
              const isRSVPed = evt.rsvps?.some((r: any) => r.user_id === currentUser.id) || false;
              const parts = dateParts(evt.event_date);
              const guestsCount = (evt.rsvps || []).reduce((acc: number, r: any) => acc + 1 + (r.guest_count || 0), 0);
              const baseCount = index === 1 ? 112 : index === 2 ? 34 : 248;
              const totalAttending = baseCount + guestsCount;
              const countdown = activeTab === 'upcoming' ? getCountdownText(evt.event_date) : '';
              const categoryLabel = evt.event_type === 'virtual' ? '🌐 Webinar' : evt.event_type === 'hybrid' ? '👥 Hybrid Meetup' : '🏛️ On-Campus Reunion';

              return (
                <article key={evt.id} className="event-row-card">
                  <img src={eventImages[index % eventImages.length]} alt={evt.title} />
                  <div>
                    <span className={`event-type ${evt.event_type}`}>{categoryLabel}</span>
                    {countdown && (
                      <span style={{
                        fontSize: '0.74rem',
                        background: 'rgba(236,72,153,0.1)',
                        color: '#ec4899',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginLeft: '12px',
                        verticalAlign: 'middle'
                      }}>
                        <Clock size={12} /> {countdown}
                      </span>
                    )}
                    <h3 style={{ marginTop: '8px' }}>{evt.title}</h3>
                    <div className="event-meta"><Calendar size={16} /> {parts.date} <Clock size={16} /> {parts.time} <MapPin size={16} /> {evt.location}</div>
                    <p>{evt.description}</p>
                    <small>{totalAttending} attending</small>
                  </div>
                  {isRSVPed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '120px' }}>
                      <button 
                        type="button"
                        onClick={() => openTicketModal(evt)} 
                        className="heritage-primary-btn" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: '36px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <QrCode size={14} /> Pass
                      </button>
                      <button 
                        type="button"
                        onClick={() => downloadICS(evt)} 
                        style={{ padding: '6px 12px', fontSize: '0.78rem', minHeight: '34px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', cursor: 'pointer', width: '100%' }}
                      >
                        Add to Cal
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => openRSVPModal(evt.id)}>
                      <Check size={16} /> {evt.event_type === 'virtual' ? 'Join' : 'RSVP'}
                    </button>
                  )}
                </article>
              );
            })}
          </div>

          <h2 className="past-title">Past Events</h2>
          {['Silver Jubilee Homecoming 2024', 'Heritage Campus Walk & Tour'].map((title, index) => (
            <article key={title} className="event-row-card muted">
              <img src={index === 0 ? 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=500&h=330&fit=crop&q=80' : 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=500&h=330&fit=crop&q=80'} alt={title} />
              <div>
                <span className="event-type past">Past · {index === 0 ? 'Reunion' : 'Meetup'}</span>
                <h3>{title}</h3>
                <div className="event-meta"><Calendar size={16} /> {index === 0 ? 'Oct 12, 2024' : 'Sep 05, 2024'} <MapPin size={16} /> {index === 0 ? 'Main Auditorium' : 'Heritage Campus'}</div>
                <p>{index === 0 ? 'A memorable evening reconnecting 320 alumni. Browse the photo gallery and event recap.' : 'A nostalgic walk through the historic halls where it all began. Relive the memories.'}</p>
                <small><ImageIcon size={15} /> {index === 0 ? 184 : 96} photos</small>
              </div>
              <button className="ghost">View Highlights</button>
            </article>
          ))}
        </main>

        <aside>
          <section className="heritage-widget">
            <h3><Calendar size={20} /> My RSVPs</h3>
            {(() => {
              const myRsvps = events.filter((e: any) => e.rsvps?.some((r: any) => r.user_id === currentUser.id));
              if (myRsvps.length === 0) {
                return <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', padding: '10px 0' }}>No active RSVPs. Click RSVP on any event to join!</span>;
              }
              return myRsvps.slice(0, 3).map((myEvt: any) => {
                const dateObj = new Date(myEvt.event_date);
                const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                const day = dateObj.toLocaleDateString('en-US', { day: '2-digit' });
                const time = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={myEvt.id} className="my-event" style={{ cursor: 'pointer' }} onClick={() => openTicketModal(myEvt)}>
                    <strong>{month}<br />{day}</strong>
                    <span>
                      {myEvt.title}<br />
                      <small>{time} · {myEvt.location.substring(0, 18)}{myEvt.location.length > 18 ? '...' : ''}</small>
                    </span>
                  </div>
                );
              });
            })()}
          </section>

          <section className="suggest-card">
            <Lightbulb size={34} />
            <h3>Suggest a Reunion</h3>
            <p>Got an idea for the next gathering? Let the alumni board know.</p>
            <button onClick={() => showToast('Suggestion captured for the alumni board.', 'success')}><Send size={18} /> Suggest Now</button>
          </section>

          <section className="calendar-card">
            <h3>December 2026</h3>
            <div className="mini-calendar">
              {['S','M','T','W','T','F','S',30,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map((day, index) => (
                <span key={`${day}-${index}`} className={day === 2 ? 'green' : day === 15 ? 'gold' : day === 20 ? 'ring' : ''}>{day}</span>
              ))}
            </div>
            <p><span className="dot gold"></span> Reunion <span className="dot green"></span> Meetup</p>
          </section>
        </aside>
      </div>

      {rsvpModalVisible && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-card heritage-modal">
            <div className="modal-head">
              <h3>Event RSVP Registration</h3>
              <button className="icon-btn" onClick={() => setRsvpModalVisible(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleRSVPSubmit}>
              <label>Number of Guests<input type="number" min={0} max={5} required value={rsvpGuests} onChange={(event) => setRsvpGuests(event.target.value)} /></label>
              <label>Dietary Preferences<select value={rsvpDiet} onChange={(event) => setRsvpDiet(event.target.value)}><option>Vegetarian</option><option>Non-Vegetarian</option><option>None</option></select></label>
              <button type="submit" className="heritage-primary-btn">Confirm RSVP Allocation</button>
            </form>
          </div>
        </div>
      )}

      {createModalVisible && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-card heritage-modal">
            <div className="modal-head">
              <h3>Create New Gathering</h3>
              <button className="icon-btn" onClick={() => setCreateModalVisible(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateEventSubmit}>
              <label>Event Title<input required value={evtTitle} onChange={(event) => setEvtTitle(event.target.value)} /></label>
              <label>Description<textarea rows={3} required value={evtDesc} onChange={(event) => setEvtDesc(event.target.value)} /></label>
              <label>Date & Time<input type="datetime-local" required value={evtDate} onChange={(event) => setEvtDate(event.target.value)} /></label>
              <label>Type<select value={evtType} onChange={(event) => setEvtType(event.target.value as any)}><option value="physical">Physical Meeting</option><option value="virtual">Virtual Webinar</option><option value="hybrid">Hybrid</option></select></label>
              <label>Venue / Location Link<input required value={evtLocation} onChange={(event) => setEvtLocation(event.target.value)} /></label>
              <label>Max Seating Capacity<input type="number" min={5} value={evtCapacity} onChange={(event) => setEvtCapacity(event.target.value)} /></label>
              <button type="submit" className="heritage-primary-btn">Publish Event Listing</button>
            </form>
          </div>
        </div>
      )}
      {/* Ticket Pass Modal */}
      {ticketModalVisible && ticketEvent && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '380px', padding: '0', background: 'none', border: 'none', boxShadow: 'none' }}>
            {/* The Ticket Pass Container */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              border: '2px solid #d4af37',
              borderRadius: '20px',
              padding: '24px',
              color: 'white',
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              {/* Ticket Notch Cutouts */}
              <div style={{ position: 'absolute', left: '-12px', top: '55%', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', borderRight: '2px solid #d4af37' }}></div>
              <div style={{ position: 'absolute', right: '-12px', top: '55%', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', borderLeft: '2px solid #d4af37' }}></div>

              {/* Header */}
              <div style={{ borderBottom: '1px dashed rgba(212, 175, 55, 0.3)', width: '100%', paddingBottom: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#d4af37', fontWeight: 800 }}>Vidyapith Alumni Association</span>
                <h4 style={{ margin: '6px 0 0', fontSize: '1.1rem', fontWeight: 800 }}>OFFICIAL EVENT PASS</h4>
              </div>

              {/* Body */}
              <div style={{ flexGrow: 1, width: '100%', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '12px', lineHeight: 1.3 }}>{ticketEvent.title}</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', textAlign: 'left', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: '#94a3b8', display: 'block' }}>Date</span>
                    <strong>{dateParts(ticketEvent.event_date).date}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: '#94a3b8', display: 'block' }}>Time</span>
                    <strong>{dateParts(ticketEvent.event_date).time}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: '#94a3b8', display: 'block' }}>Location</span>
                    <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>{ticketEvent.location}</strong>
                  </div>
                </div>

                {/* QR Code Container */}
                <div style={{
                  background: 'white',
                  padding: '12px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '10px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                }}>
                  <QrCode size={110} style={{ color: '#0f172a' }} />
                </div>
                
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  <span>PASS ID: </span>
                  <strong style={{ color: '#d4af37', fontFamily: 'monospace' }}>TK-{ticketEvent.id?.substring(0,8).toUpperCase()}</strong>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ borderTop: '1px dashed rgba(212, 175, 55, 0.3)', width: '100%', paddingTop: '16px', display: 'flex', gap: '10px' }}>
                <button 
                  type="button"
                  onClick={() => downloadICS(ticketEvent)} 
                  style={{ flexGrow: 1, padding: '8px 12px', fontSize: '0.78rem', fontWeight: 700, background: '#d4af37', border: 'none', color: '#0f172a', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  Save to Calendar
                </button>
                <button 
                  type="button"
                  onClick={() => setTicketModalVisible(false)} 
                  style={{ padding: '8px 16px', fontSize: '0.78rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function ChevronRightIcon() {
  return <span aria-hidden="true">›</span>;
}
