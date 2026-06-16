"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Event } from '../database/database';
import { Calendar, Check, Clock, Filter, Image as ImageIcon, Lightbulb, MapPin, Plus, Send, Users, X } from 'lucide-react';
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
      const source = list.length ? list : fallbackEvents;
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
    try {
      await apiFetch(`/events/${rsvpEventId}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ guestCount: parseInt(rsvpGuests), dietaryPref: rsvpDiet })
      });
      showToast("RSVP registered successfully! Ticket generated.", "success");
      setRsvpModalVisible(false);
      loadEvents();
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const handleCreateEventSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!evtTitle.trim() || !evtDesc.trim() || !evtDate || !evtLocation.trim()) {
      showToast("Please fill all required fields.", "danger");
      return;
    }
    try {
      await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify({
          title: evtTitle.trim(),
          description: evtDesc.trim(),
          eventDate: new Date(evtDate).toISOString(),
          location: evtLocation.trim(),
          eventType: evtType,
          onlineLink: evtType === 'virtual' ? evtLocation.trim() : '',
          maxCapacity: parseInt(evtCapacity) || 100
        })
      });
      showToast("Community gathering published successfully!", "success");
      setCreateModalVisible(false);
      setEvtTitle('');
      setEvtDesc('');
      setEvtDate('');
      setEvtType('physical');
      setEvtLocation('');
      setEvtCapacity('100');
      loadEvents();
    } catch (err: any) {
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
                  <button onClick={() => openRSVPModal(evt.id)} disabled={isRSVPed}>
                    <Check size={16} /> {isRSVPed ? 'RSVPed' : evt.event_type === 'virtual' ? 'Join' : 'RSVP'}
                  </button>
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
            <h3><Calendar size={20} /> My Events</h3>
            <div className="my-event"><strong>DEC<br />15</strong><span>Centennial Grand Reunion<br /><small>6:00 PM · Grand Hall</small></span></div>
            <div className="my-event"><strong>NOV<br />28</strong><span>Careers in Tech Panel<br /><small>7:30 PM · Online</small></span></div>
            <button>View all my events <ChevronRightIcon /></button>
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
    </div>
  );
};

function ChevronRightIcon() {
  return <span aria-hidden="true">›</span>;
}
