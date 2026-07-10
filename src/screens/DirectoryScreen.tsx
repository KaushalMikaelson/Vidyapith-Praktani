"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { User } from '../database/database';
import { 
  Briefcase, ChevronDown, ChevronLeft, ChevronRight, Search, 
  Users, RefreshCw, X, Bell, MapPin, TrendingUp, LayoutGrid, List, BookOpen, Star, Filter,
  UserMinus, ShieldCheck
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface DirectoryScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

// Client-side cache for directory search results to prevent flash of loading state
const directoryClientCache = new Map<string, any>();

export const DirectoryScreen: React.FC<DirectoryScreenProps> = ({ showToast, onViewProfile }) => {
  const { currentUser } = useAuth();
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterProfession, setFilterProfession] = useState('');
  const [filterOpenFor, setFilterOpenFor] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'alumni' | 'student' | 'faculty'>('all');
  const [sortBy] = useState('seed_order');
  const [showFilters, setShowFilters] = useState(false);
  
  // List & Status State
  const [alumniList, setAlumniList] = useState<User[]>([]);
  const [connectionSentIds, setConnectionSentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalStats, setGlobalStats] = useState({ alumni: 0, students: 0, faculty: 0, range: 'N/A' });
  
  // B06: Dynamic filter options computed from real DB data
  const [availableCities, setAvailableCities] = useState<string[]>(['Mumbai', 'Delhi', 'Pune', 'Bangalore', 'Kolkata', 'Deoghar']);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(['Engineering', 'Science', 'Commerce', 'Arts', 'Physics', 'Chemistry']);

  // Advanced Connection Pipeline States
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, 'accepted' | 'pending_sent' | 'pending_received'>>({});
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const loadConnectionDetails = async () => {
    try {
      const statuses = await apiFetch('/directory/connections/status');
      setConnectionStatuses(statuses);
      const pending = await apiFetch('/directory/connections/pending');
      setPendingRequests(pending);
    } catch (err) {
      console.error("Failed to load connection details:", err);
    }
  };

  const handleRespondConnection = async (targetId: string, action: 'accept' | 'decline') => {
    // Optimistic: update status immediately
    if (action === 'accept') {
      setConnectionStatuses(prev => ({ ...prev, [targetId]: 'accepted' }));
    } else {
      setConnectionStatuses(prev => {
        const updated = { ...prev };
        delete updated[targetId];
        return updated;
      });
    }
    setPendingRequests(prev => prev.filter((r: any) => r.id !== targetId));
    showToast(`Connection request ${action === 'accept' ? 'accepted' : 'declined'}!`, 'success');

    try {
      await apiFetch('/directory/connections/respond', {
        method: 'POST',
        body: JSON.stringify({ targetId, action })
      });
    } catch (err: any) {
      // Revert on failure
      loadConnectionDetails();
      showToast(err.message, 'danger');
    }
  };

  useEffect(() => {
    loadConnectionDetails();
  }, []);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 12;

  const loadDirectory = async () => {
    const queryParams = new URLSearchParams();
    if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());
    if (filterBatch) queryParams.append('batchYear', filterBatch);
    if (filterState.trim()) queryParams.append('city', filterState.trim());
    if (filterDistrict.trim()) queryParams.append('city', filterDistrict.trim());
    if (filterRole && filterRole !== 'all') queryParams.append('role', filterRole);
    if (sortBy) queryParams.append('sortBy', sortBy);
    if (filterProfession) queryParams.append('profession', filterProfession);
    if (filterOpenFor) queryParams.append('openFor', filterOpenFor);
    if (filterCompany) queryParams.append('company', filterCompany);

    const cacheKey = queryParams.toString();

    // Check client-side cache to bypass loading state and api request
    if (directoryClientCache.has(cacheKey)) {
      const cachedResults = directoryClientCache.get(cacheKey);
      setAlumniList(cachedResults);
      return;
    }

    setLoading(true);
    try {
      const results = await apiFetch(`/directory?${cacheKey}`);
      directoryClientCache.set(cacheKey, results);
      setAlumniList(results);

      // Compute overall stats if no search query or filters are active
      if (!searchQuery.trim() && !filterBatch && !filterState.trim() && !filterDistrict.trim() && filterRole === 'all' && !filterProfession && !filterOpenFor && !filterCompany) {
        let alumni = 0;
        let students = 0;
        let faculty = 0;
        const years: number[] = [];

        const citiesSet = new Set<string>();
        const deptsSet = new Set<string>();

        results.forEach((u: User) => {
          if (u.role === 'alumni') alumni++;
          else if (u.role === 'student') students++;
          else if (u.role === 'faculty') faculty++;
          
          if (u.batch_year) {
            years.push(u.batch_year);
          }

          // Access profile or direct properties (supporting both models)
          const cityVal = u.profile?.city || u.city;
          if (cityVal && cityVal.trim()) {
            citiesSet.add(cityVal.trim());
          }

          const deptVal = u.profile?.department || u.department;
          if (deptVal && deptVal.trim()) {
            deptsSet.add(deptVal.trim());
          }


        });

        const minYear = years.length ? Math.min(...years) : 0;
        const maxYear = years.length ? Math.max(...years) : 0;
        
        setGlobalStats({
          alumni,
          students,
          faculty,
          range: minYear ? (minYear === maxYear ? `${minYear}` : `${minYear}-${maxYear}`) : 'N/A'
        });

        // Seed default locations if set size is zero, otherwise update
        if (citiesSet.size > 0) {
          setAvailableCities(Array.from(citiesSet).sort());
        }
        if (deptsSet.size > 0) {
          setAvailableDepartments(Array.from(deptsSet).sort());
        }

      }
    } catch (err: any) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      loadDirectory();
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, filterBatch, filterState, filterDistrict, filterRole, sortBy, filterProfession, filterOpenFor, filterCompany]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterBatch, filterState, filterDistrict, filterRole, filterProfession, filterOpenFor, filterCompany]);

  // Pagination helper calculations
  const totalItems = alumniList.length;
  const totalPages = Math.ceil(totalItems / postsPerPage) || 1;
  const startIndex = (currentPage - 1) * postsPerPage;
  const paginatedAlumni = alumniList.slice(startIndex, startIndex + postsPerPage);

  const batchYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 1960 + 1 }, (_, index) => currentYear - index);
  }, []);

  const handleConnectRequest = async (id: string, name: string) => {
    // Optimistic: show pending immediately
    setConnectionStatuses(prev => ({ ...prev, [id]: 'pending_sent' }));
    showToast(`Connection request sent to ${name}!`, 'success');

    try {
      const res = await apiFetch('/directory/connect', {
        method: 'POST',
        body: JSON.stringify({ targetId: id })
      });
      directoryClientCache.clear();
      if (res.status === 'accepted') {
        setConnectionStatuses(prev => ({ ...prev, [id]: 'accepted' }));
        showToast(`Connected with ${name}!`, 'success');
      }
    } catch (err: any) {
      // Revert on failure
      setConnectionStatuses(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      showToast(err.message, 'danger');
    }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from the site? This will delete their account and related site activity.`)) {
      return;
    }

    setRemovingMemberId(id);
    try {
      await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
      directoryClientCache.clear();
      setAlumniList(prev => prev.filter(user => user.id !== id));
      setPendingRequests(prev => prev.filter(request => request.id !== id));
      setConnectionStatuses(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      showToast(`${name} has been removed from the site.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove member.', 'danger');
    } finally {
      setRemovingMemberId(null);
    }
  };

  // Compute profession index counts dynamically from matching users
  const professionIndexCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    alumniList.forEach(u => {
      // Prefer profile-completed profession_category, fall back to profession field
      const rawProf = (u.profile?.profession_category || u.profession_category || u.profession || '').trim();

      let prof: string;
      if (rawProf) {
        // Normalize casing: capitalize each word
        prof = rawProf.split(/\s+/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      } else if (u.role === 'student') {
        // Students without a set profession go into the Student bucket
        prof = 'Student';
      } else {
        // Everyone else without a profession goes into Not Specified
        prof = 'Not Specified';
      }

      counts[prof] = (counts[prof] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [alumniList]);

  const handleQuickBatchFind = () => {
    if (currentUser?.batch_year) {
      setFilterBatch(String(currentUser.batch_year));
      showToast(`Filtered by Class of ${currentUser.batch_year}!`, 'info');
    }
  };

  // Compute state/city index counts dynamically from matching users
  const stateIndexCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    alumniList.forEach(u => {
      const state = (u.profile?.city || u.city || '').trim();
      const label = state || 'Not Specified';
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [alumniList]);

  // Compute batch year index counts dynamically from matching users
  const batchIndexCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    alumniList.forEach(u => {
      const label = u.batch_year ? `Batch of ${u.batch_year}` : 'Not Specified';
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count, year: label.startsWith('Batch of') ? parseInt(label.replace('Batch of ', '')) : 0 }))
      .sort((a, b) => b.year - a.year);
  }, [alumniList]);

  const getAvatarGradient = (dept?: string) => {
    const depts = dept || "";
    if (depts === "Engineering" || depts === "Physics") return "linear-gradient(135deg, #0E6B8A 0%, #064E65 100%)";
    if (depts === "Science" || depts === "Chemistry") return "linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)";
    if (depts === "Commerce") return "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
    if (depts === "Arts") return "linear-gradient(135deg, #F37021 0%, #B8272C 100%)";
    return "linear-gradient(135deg, #F37021 0%, #B8272C 100%)";
  };

  // Shared style objects for active filter chips
  const chipStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '0.76rem', fontWeight: 600, padding: '3px 10px',
    borderRadius: '9999px', background: '#f1f5f9',
    color: '#475569', border: '1px solid #e2e8f0'
  };
  const chipXStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '0 0 0 2px', fontSize: '0.9rem', lineHeight: 1, color: 'inherit'
  };

  return (
    <div className="heritage-page" style={{ padding: '24px 0' }}>
      
      {/* Redesigned Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(243, 112, 33, 0.2)'
          }}>
            <BookOpen size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Legacy Directory
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
              Connect with your Vidyapith family
            </p>
          </div>
        </div>
        

      </div>

      {/* Main Redesigned Layout */}
      <div className="directory-main-container">
        
        {/* Left Column: Search Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Search Bar Row */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0 16px',
              height: '48px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <Search size={18} style={{ color: '#64748b' }} />
              <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search alumni, students, faculty, admins..." 
                style={{ fontSize: '0.92rem', border: 'none', outline: 'none', flexGrow: 1, width: '100%' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                  <X size={16} />
                </button>
              )}
            </div>
            
            <button
              type="button"
              onClick={handleQuickBatchFind}
              className="btn-connect-gradient"
              style={{ minHeight: '48px', borderRadius: '12px', padding: '0 20px', fontSize: '0.9rem', flexShrink: 0 }}
            >
              <Users size={16} />
              Find Classmates
            </button>

            {/* Filters Toggle */}
            {(() => {
              const activeCount = [filterBatch, filterState, filterDistrict, filterProfession, filterOpenFor, filterCompany].filter(Boolean).length;
              return (
                <button
                  type="button"
                  onClick={() => setShowFilters(p => !p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    height: '48px', padding: '0 18px', flexShrink: 0,
                    borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
                    border: showFilters ? '1.5px solid var(--primary-color)' : '1.5px solid #e2e8f0',
                    background: showFilters ? 'rgba(243,112,33,0.06)' : '#fff',
                    color: showFilters ? 'var(--primary-color)' : '#475569',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <Filter size={15} />
                  Filters
                  {activeCount > 0 && (
                    <span style={{
                      background: 'var(--primary-gradient)', color: '#fff',
                      borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 800,
                      padding: '1px 7px', marginLeft: '2px'
                    }}>{activeCount}</span>
                  )}
                  <ChevronDown size={14} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
              );
            })()}
          </div>

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div style={{
              background: '#fff',
              border: '1.5px solid rgba(243,112,33,0.2)',
              borderRadius: '16px',
              padding: '20px 22px',
              boxShadow: '0 4px 20px rgba(243,112,33,0.06)',
              animation: 'fadeSlideDown 0.2s ease'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>

                {/* Batch Year */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Batch Year</label>
                  <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} className="directory-pill-select" style={{ borderRadius: '10px', width: '100%' }}>
                    <option value="">All Years</option>
                    {batchYears.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>

                {/* State */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📍 State</label>
                  <select
                    value={filterState}
                    onChange={(e) => { setFilterState(e.target.value); setFilterDistrict(''); }}
                    className="directory-pill-select"
                    style={{ borderRadius: '10px', width: '100%' }}
                  >
                    <option value="">All States</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Delhi">Delhi (NCT)</option>
                    <option value="Jammu">Jammu &amp; Kashmir</option>
                    <option value="Ladakh">Ladakh</option>
                  </select>
                </div>

                {/* District */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏘 District</label>
                  <select
                    value={filterDistrict}
                    onChange={(e) => setFilterDistrict(e.target.value)}
                    className="directory-pill-select"
                    style={{ borderRadius: '10px', width: '100%' }}
                  >
                    <option value="">All Districts</option>
                    {/* Jharkhand */}
                    {(!filterState || filterState === 'Jharkhand') && (<>
                      <option value="Deoghar">Deoghar</option>
                      <option value="Dhanbad">Dhanbad</option>
                      <option value="Bokaro">Bokaro</option>
                      <option value="Dumka">Dumka</option>
                      <option value="East Singhbhum">East Singhbhum (Jamshedpur)</option>
                      <option value="West Singhbhum">West Singhbhum (Chaibasa)</option>
                      <option value="Giridih">Giridih</option>
                      <option value="Godda">Godda</option>
                      <option value="Gumla">Gumla</option>
                      <option value="Hazaribagh">Hazaribagh</option>
                      <option value="Jamtara">Jamtara</option>
                      <option value="Khunti">Khunti</option>
                      <option value="Koderma">Koderma</option>
                      <option value="Latehar">Latehar</option>
                      <option value="Lohardaga">Lohardaga</option>
                      <option value="Pakur">Pakur</option>
                      <option value="Palamu">Palamu</option>
                      <option value="Ramgarh">Ramgarh</option>
                      <option value="Ranchi">Ranchi</option>
                      <option value="Sahebganj">Sahebganj</option>
                      <option value="Seraikela-Kharsawan">Seraikela-Kharsawan</option>
                      <option value="Simdega">Simdega</option>
                      <option value="Chatra">Chatra</option>
                      <option value="Garhwa">Garhwa</option>
                    </>)}
                    {/* Bihar */}
                    {filterState === 'Bihar' && (<>
                      <option value="Patna">Patna</option>
                      <option value="Gaya">Gaya</option>
                      <option value="Bhagalpur">Bhagalpur</option>
                      <option value="Muzaffarpur">Muzaffarpur</option>
                      <option value="Darbhanga">Darbhanga</option>
                      <option value="Purnia">Purnia</option>
                      <option value="Nalanda">Nalanda</option>
                      <option value="Munger">Munger</option>
                      <option value="Saharsa">Saharsa</option>
                      <option value="Madhubani">Madhubani</option>
                      <option value="Begusarai">Begusarai</option>
                      <option value="Ara (Bhojpur)">Ara (Bhojpur)</option>
                    </>)}
                    {/* West Bengal */}
                    {filterState === 'West Bengal' && (<>
                      <option value="Kolkata">Kolkata</option>
                      <option value="Howrah">Howrah</option>
                      <option value="Hooghly">Hooghly</option>
                      <option value="Darjeeling">Darjeeling</option>
                      <option value="Siliguri">Siliguri (Darjeeling)</option>
                      <option value="Asansol">Asansol (Paschim Bardhaman)</option>
                      <option value="Durgapur">Durgapur</option>
                      <option value="Malda">Malda</option>
                      <option value="Murshidabad">Murshidabad</option>
                      <option value="Nadia">Nadia</option>
                    </>)}
                    {/* All other states — show generic "Enter district" prompt */}
                    {filterState && filterState !== 'Jharkhand' && filterState !== 'Bihar' && filterState !== 'West Bengal' && (
                      <option value={filterState} disabled>— Select state first for districts —</option>
                    )}
                  </select>
                </div>



                {/* Profession */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💼 Profession</label>
                  <input
                    type="text"
                    value={filterProfession}
                    onChange={(e) => setFilterProfession(e.target.value)}
                    className="directory-pill-select"
                    placeholder="e.g. Doctor, Engineer..."
                    style={{ fontFamily: 'inherit', borderRadius: '10px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Open For */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🟢 Open For</label>
                  <select value={filterOpenFor} onChange={(e) => setFilterOpenFor(e.target.value)} className="directory-pill-select" style={{ borderRadius: '10px', width: '100%' }}>
                    <option value="">Anything</option>
                    <option value="Mentorship">Mentorship</option>
                    <option value="Networking">Networking</option>
                    <option value="Referrals">Referrals</option>
                    <option value="Hiring">Hiring</option>
                    <option value="Collaborations">Collaborations</option>
                    <option value="Career Guidance">Career Guidance</option>
                  </select>
                </div>

                {/* Company */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏢 Company / Organisation</label>
                  <input
                    type="text"
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="directory-pill-select"
                    placeholder="e.g. Google, AIIMS, Tata..."
                    style={{ fontFamily: 'inherit', borderRadius: '10px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

              </div>

              {/* Footer: active chips + clear all */}
              {[filterBatch, filterState, filterDistrict, filterProfession, filterOpenFor, filterCompany].some(Boolean) && (
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Active:</span>
                    {filterBatch && <span style={chipStyle}>{filterBatch} <button onClick={() => setFilterBatch('')} style={chipXStyle}>×</button></span>}
                    {filterState && <span style={chipStyle}>📍 {filterState} <button onClick={() => setFilterState('')} style={chipXStyle}>×</button></span>}
                    {filterDistrict && <span style={chipStyle}>🏘 {filterDistrict} <button onClick={() => setFilterDistrict('')} style={chipXStyle}>×</button></span>}
                    {filterProfession && <span style={{ ...chipStyle, background: 'rgba(243,112,33,0.1)', color: 'var(--primary-color)', borderColor: 'rgba(243,112,33,0.3)' }}>💼 {filterProfession} <button onClick={() => setFilterProfession('')} style={chipXStyle}>×</button></span>}
                    {filterOpenFor && <span style={{ ...chipStyle, background: 'rgba(16,185,129,0.1)', color: '#059669', borderColor: 'rgba(16,185,129,0.3)' }}>Open: {filterOpenFor} <button onClick={() => setFilterOpenFor('')} style={chipXStyle}>×</button></span>}
                    {filterCompany && <span style={{ ...chipStyle, background: 'rgba(59,130,246,0.1)', color: '#1d4ed8', borderColor: 'rgba(59,130,246,0.3)' }}>🏢 {filterCompany} <button onClick={() => setFilterCompany('')} style={chipXStyle}>×</button></span>}
                  </div>
                  <button
                    onClick={() => { setFilterBatch(''); setFilterState(''); setFilterDistrict(''); setFilterProfession(''); setFilterOpenFor(''); setFilterCompany(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                  >
                    <X size={13} /> Clear All
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pending Connection Requests Widget */}
          {pendingRequests.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🤝</span>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Pending Connection Requests ({pendingRequests.length})
                </h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingRequests.map((req) => (
                  <div key={req.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={req.profile_photo}
                        alt={req.full_name}
                        onClick={() => onViewProfile(req.id)}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '1px solid #e2e8f0' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span 
                          onClick={() => onViewProfile(req.id)}
                          style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}
                        >
                          {req.full_name}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Class of {req.batch_year}
                          {req.leaving_class && (
                            <span style={{ marginLeft: '5px', fontSize: '0.7rem', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '10px', padding: '0px 6px', fontWeight: 700 }}>
                              Cls {req.leaving_class}
                            </span>
                          )}
                          {' '}• {req.house}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleRespondConnection(req.id, 'accept')}
                        className="btn-connect-gradient"
                        style={{ padding: '6px 16px', fontSize: '0.8rem', minHeight: '32px', borderRadius: '8px', minWidth: '80px' }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespondConnection(req.id, 'decline')}
                        style={{
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          color: '#64748b',
                          padding: '6px 16px',
                          fontSize: '0.8rem',
                          minHeight: '32px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#64748b'; }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role Filters & Found Label */}
          <div className="directory-filters-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <div 
              className="directory-tabs-scroll-container" 
              style={{ 
                display: 'flex', 
                gap: '8px', 
                overflowX: 'auto', 
                flexWrap: 'nowrap',
                minWidth: 0,
                flexGrow: 1,
                flexShrink: 1,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: '4px'
              }}
            >
              {[
                { id: 'all', label: 'All Connections' },
                { id: 'admin', label: 'Admins' },
                { id: 'alumni', label: 'Alumni' },
                { id: 'student', label: 'Students' },
                { id: 'faculty', label: 'Faculty' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterRole(tab.id as any)}
                  className={`directory-tab-pill ${filterRole === tab.id ? 'active' : 'inactive'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="directory-filters-right" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                {totalItems} members found
              </span>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#1e293b' }}
                  title="Grid View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#cbd5e1' }}
                  title="List View"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Grid of Redesigned Cards */}
          <div className="directory-cards-grid">
            {loading && alumniList.length === 0 ? (
              <div className="glass-panel" style={{ gridColumn: '1 / -1', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                <RefreshCw size={36} style={{ animation: 'spin 1.2s linear infinite', color: '#8b5cf6' }} />
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Searching the Vidyapith archives...</p>
              </div>
            ) : paginatedAlumni.length === 0 ? (
              <div className="glass-panel" style={{ gridColumn: '1 / -1', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                <Users size={40} />
                <h3 style={{ margin: '8px 0 4px', color: '#1e293b' }}>No Connections Found</h3>
                <p style={{ fontSize: '0.85rem', textAlign: 'center', maxWidth: '300px', margin: 0 }}>Try adjusting your filter criteria or search keyword.</p>
              </div>
            ) : (
              paginatedAlumni.map((alumnus) => {
                const connStatus = connectionStatuses[alumnus.id];
                const isSelf = currentUser?.id === alumnus.id;
                const isRequestSent = connStatus === 'pending_sent' || connStatus === 'accepted';
                
                return (
                  <article 
                    key={alumnus.id} 
                    className="glass-panel directory-alumni-card" 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      textAlign: 'center',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                      height: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Circular Avatar with Gradient Ring */}
                    <div 
                      className="avatar-gradient-ring" 
                      style={{ 
                        background: isRequestSent ? '#e2e8f0' : 'var(--primary-gradient)',
                        padding: '3px',
                        borderRadius: '50%',
                        display: 'inline-block',
                        width: '94px',
                        height: '94px'
                      }}
                    >
                      <img 
                        src={alumnus.profile_photo} 
                        alt={alumnus.full_name} 
                        onClick={() => onViewProfile(alumnus.id)} 
                        style={{ 
                          cursor: 'pointer', 
                          width: '88px', 
                          height: '88px', 
                          borderRadius: '50%', 
                          border: '3px solid #fff', 
                          objectFit: 'cover' 
                        }}
                      />
                    </div>
                    
                    <div className="card-info-header" style={{ display: 'contents' }}>
                      <h2 
                        onClick={() => onViewProfile(alumnus.id)} 
                        style={{ 
                          cursor: 'pointer', 
                          fontSize: '1.1rem', 
                          marginTop: '16px', 
                          fontWeight: 800, 
                          color: '#1e293b',
                          marginBottom: '4px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-color)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#1e293b'}
                      >
                        {alumnus.full_name}
                      </h2>
                      
                      {/* Role/Batch & Department Subtitle */}
                      <div style={{ fontSize: '0.83rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                        {alumnus.role === 'faculty' ? (
                          <>Faculty <span className="card-sub-detail">· {alumnus.department || 'Physics'}</span></>
                        ) : alumnus.role === 'student' ? (
                          <>Student <span className="card-sub-detail">· {alumnus.department || 'Science'}</span></>
                        ) : (
                          <>
                            Class of {alumnus.batch_year}
                            {alumnus.leaving_class && (
                              <span className="card-sub-detail" style={{ marginLeft: '6px', fontSize: '0.7rem', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '10px', padding: '1px 7px', fontWeight: 700, verticalAlign: 'middle' }}>
                                Cls {alumnus.leaving_class}
                              </span>
                            )}
                            <span className="card-sub-detail">{' '}· {alumnus.department || 'Engineering'}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Designation / Profession / Company */}
                    {(alumnus.designation || alumnus.profession || alumnus.company) && (
                      <div className="card-detail-row" style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        <Briefcase size={12} style={{ flexShrink: 0, color: 'var(--primary-color)' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                          {alumnus.designation || alumnus.profession}{alumnus.company ? ` @ ${alumnus.company}` : ''}
                        </span>
                      </div>
                    )}

                    {/* Location */}
                    <div className="card-detail-row" style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', justifyContent: 'center' }}>
                      <span>📍 {alumnus.city || 'India'}</span>
                    </div>

                    {/* Skill Tags */}
                    {alumnus.skills && alumnus.skills.length > 0 && (
                      <div className="card-detail-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', marginBottom: '8px' }}>
                        {alumnus.skills.slice(0, 3).map(skill => (
                          <span key={skill} style={{
                            fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
                            borderRadius: '9999px', background: 'rgba(243,112,33,0.08)',
                            color: 'var(--primary-color)', border: '1px solid rgba(243,112,33,0.2)'
                          }}>{skill}</span>
                        ))}
                        {alumnus.skills.length > 3 && (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
                            borderRadius: '9999px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0'
                          }}>+{alumnus.skills.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Mentorship Badge */}
                    {alumnus.mentorship_status === 'Available' && (
                      <div className="card-detail-row" style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', marginBottom: '8px' }}>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px',
                          borderRadius: '9999px', background: 'rgba(16,185,129,0.1)',
                          color: '#059669', border: '1px solid rgba(16,185,129,0.25)',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                          <Star size={10} fill="#059669" /> Open to Mentor
                        </span>
                      </div>
                    )}
                    {alumnus.mentorship_status === 'Limited Availability' && (
                      <div className="card-detail-row" style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', marginBottom: '8px' }}>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px',
                          borderRadius: '9999px', background: 'rgba(245,158,11,0.1)',
                          color: '#d97706', border: '1px solid rgba(245,158,11,0.25)',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                          ⚡ Limited Slots
                        </span>
                      </div>
                    )}

                    {/* Open For Badges */}
                    {alumnus.open_for && alumnus.open_for.length > 0 && (
                      <div className="card-detail-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', marginBottom: '8px' }}>
                        {alumnus.open_for.slice(0, 2).map((badge: string) => (
                          <span key={badge} style={{
                            fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px',
                            borderRadius: '9999px', background: 'rgba(16,185,129,0.08)',
                            color: '#059669', border: '1px solid rgba(16,185,129,0.2)'
                          }}>🟢 {badge}</span>
                        ))}
                        {alumnus.open_for.length > 2 && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>+{alumnus.open_for.length - 2}</span>
                        )}
                      </div>
                    )}

                    {/* Spacer */}
                    <div className="card-spacer" style={{ flexGrow: 1 }} />
                    
                    {/* Connect Button */}
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 'auto' }}>
                      {isSelf ? (
                        <span className="badge-this-is-you">
                          ✨ This is You
                        </span>
                      ) : connStatus === 'accepted' ? (
                        <button
                          disabled
                          className="btn-following-gray btn-status-connected"
                          style={{ 
                            padding: '8px 32px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            width: 'auto',
                            minWidth: '130px'
                          }}
                        >
                          ✓ Connected
                        </button>
                      ) : connStatus === 'pending_sent' ? (
                        <button
                          disabled
                          className="btn-following-gray btn-status-pending"
                          style={{ 
                            padding: '8px 32px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            width: 'auto',
                            minWidth: '130px'
                          }}
                        >
                          Pending Approval
                        </button>
                      ) : connStatus === 'pending_received' ? (
                        <button
                          onClick={() => handleRespondConnection(alumnus.id, 'accept')}
                          className="btn-connect-gradient"
                          style={{ 
                            padding: '8px 32px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            width: 'auto',
                            minWidth: '130px',
                            boxShadow: '0 4px 14px rgba(243, 112, 33, 0.25)'
                          }}
                        >
                          Accept Request
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnectRequest(alumnus.id, alumnus.full_name)}
                          className="btn-connect-gradient"
                          style={{ 
                            padding: '8px 32px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            width: 'auto',
                            minWidth: '130px'
                          }}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </article>

                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <footer className="heritage-pagination" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', background: '#fff', border: '1px solid #e2e8f0', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronLeft size={16} />
                </button>
                
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  if (pageNum === 1 || pageNum === totalPages || Math.abs(currentPage - pageNum) <= 1) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          background: currentPage === pageNum ? '#1e293b' : '#fff',
                          color: currentPage === pageNum ? '#fff' : '#1e293b',
                          border: '1px solid #e2e8f0',
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 6px', color: '#64748b' }}>...</span>;
                  }
                  return null;
                })}

                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', background: '#fff', border: '1px solid #e2e8f0', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </footer>
          )}
        </div>

        {/* Right Column: Sidebar Widgets */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '24px' }}>


          
          {/* Widget 1: Directory Index */}
          <div className="sidebar-widget-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="sidebar-widget-title-row">
              <div className="widget-icon-box">
                <Briefcase size={18} />
              </div>
              <h3>Directory Index</h3>
            </div>
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                maxHeight: '260px', 
                overflowY: 'auto',
                paddingRight: '6px',
                scrollbarWidth: 'thin'
              }}
            >
              {professionIndexCounts.map(item => (
                <div 
                  key={item.label}
                  onClick={() => {
                    setFilterProfession(item.label);
                    setShowFilters(true);
                    showToast(`Filtered by profession: ${item.label}`, 'info');
                  }}
                  className="directory-index-item"
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#475569', transition: 'color 0.2s' }}>{item.label}</span>
                  <span style={{
                    background: 'var(--primary-gradient)',
                    color: 'white',
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    boxShadow: '0 2px 8px rgba(243, 112, 33, 0.15)'
                  }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 2: State Index */}
          <div className="sidebar-widget-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="sidebar-widget-title-row">
              <div className="widget-icon-box">
                <MapPin size={18} />
              </div>
              <h3>State Index</h3>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '260px',
                overflowY: 'auto',
                paddingRight: '6px',
                scrollbarWidth: 'thin'
              }}
            >
              {stateIndexCounts.map(item => (
                <div
                  key={item.label}
                  onClick={() => {
                    setFilterState(item.label === 'Not Specified' ? '' : item.label);
                    setShowFilters(true);
                    if (item.label !== 'Not Specified') showToast(`Filtered by state: ${item.label}`, 'info');
                  }}
                  className="directory-index-item"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#475569', transition: 'color 0.2s' }}>{item.label}</span>
                  <span style={{
                    background: 'var(--primary-gradient)',
                    color: 'white',
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    boxShadow: '0 2px 8px rgba(243, 112, 33, 0.15)'
                  }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 3: Batch Index */}
          <div className="sidebar-widget-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="sidebar-widget-title-row">
              <div className="widget-icon-box">
                <BookOpen size={18} />
              </div>
              <h3>Batch Index</h3>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '260px',
                overflowY: 'auto',
                paddingRight: '6px',
                scrollbarWidth: 'thin'
              }}
            >
              {batchIndexCounts.map(item => (
                <div
                  key={item.label}
                  onClick={() => {
                    if (item.year > 0) {
                      setFilterBatch(String(item.year));
                      showToast(`Filtered by ${item.label}`, 'info');
                    }
                  }}
                  className="directory-index-item"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.85rem',
                    cursor: item.year > 0 ? 'pointer' : 'default',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#475569', transition: 'color 0.2s' }}>{item.label}</span>
                  <span style={{
                    background: 'var(--primary-gradient)',
                    color: 'white',
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    boxShadow: '0 2px 8px rgba(243, 112, 33, 0.15)'
                  }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 4: Batch Stats */}
          <div className="sidebar-widget-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="sidebar-widget-title-row">
              <div className="widget-icon-box">
                <TrendingUp size={18} />
              </div>
              <h3>Batch Stats</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: "Total Alumni", val: globalStats.alumni.toLocaleString('en-IN') },
                { label: "Active Students", val: globalStats.students.toLocaleString('en-IN') },
                { label: "Faculty Members", val: globalStats.faculty.toLocaleString('en-IN') },
                { label: "Batch Years", val: globalStats.range }
              ].map(stat => (
                <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#475569', fontWeight: 500 }}>{stat.label}</span>
                  <span style={{ fontWeight: 800, color: '#ec4899' }}>{stat.val}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleQuickBatchFind}
              className="btn-connect-gradient"
              style={{ width: '100%', padding: '10px 0', fontSize: '0.9rem' }}
            >
              <Users size={16} />
              Find Classmates
            </button>
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
};
