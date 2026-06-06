"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { User } from '../database/database';
import { 
  Briefcase, ChevronLeft, ChevronRight, MapPin, Search, 
  SlidersHorizontal, UserPlus, Users, Sparkles, Filter, 
  Map, Globe, GraduationCap, Award, Compass, RefreshCw, X
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface DirectoryScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

export const DirectoryScreen: React.FC<DirectoryScreenProps> = ({ showToast, onViewProfile }) => {
  const { currentUser } = useAuth();
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterProfession, setFilterProfession] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterHouse, setFilterHouse] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'alumni' | 'student'>('all');
  const [sortBy, setSortBy] = useState('batch_desc');
  
  // List & Status State
  const [alumniList, setAlumniList] = useState<User[]>([]);
  const [connectionSentIds, setConnectionSentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 12;

  const loadDirectory = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());
      if (filterBatch) queryParams.append('batchYear', filterBatch);
      if (filterCity.trim()) queryParams.append('city', filterCity.trim());
      if (filterHouse) queryParams.append('house', filterHouse);
      if (filterRole && filterRole !== 'all') queryParams.append('role', filterRole);
      if (filterProfession) queryParams.append('profession', filterProfession);
      if (sortBy) queryParams.append('sortBy', sortBy);

      const results = await apiFetch(`/directory?${queryParams.toString()}`);
      setAlumniList(results);
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
  }, [searchQuery, filterBatch, filterCity, filterHouse, filterRole, filterProfession, sortBy]);

  // Pagination helper calculations
  const totalItems = alumniList.length;
  const totalPages = Math.ceil(totalItems / postsPerPage) || 1;
  const startIndex = (currentPage - 1) * postsPerPage;
  const paginatedAlumni = alumniList.slice(startIndex, startIndex + postsPerPage);

  const batchYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 1949 }, (_, index) => currentYear - index);
  }, []);

  const houses = [
    "Vivekananda House", "Brahmananda House", "Ramakrishnananda House", 
    "Shardananda House", "Premananda House", "Yogananda House", "Monastery"
  ];

  const professionsList = [
    { id: 'Engineering', label: 'Tech & Engineering' },
    { id: 'Medicine', label: 'Healthcare & Medicine' },
    { id: 'Civil Services', label: 'Civil Services / UPSC' },
    { id: 'Finance', label: 'Finance & Banking' },
    { id: 'Management', label: 'Product & Management' },
    { id: 'Research', label: 'Science & Academia' },
    { id: 'Art', label: 'Media, Arts & Writing' }
  ];

  const handleConnectRequest = async (id: string, name: string) => {
    try {
      await apiFetch('/directory/connect', {
        method: 'POST',
        body: JSON.stringify({ targetId: id })
      });
      setConnectionSentIds(prev => [...prev, id]);
      showToast(`Connection request sent to ${name}!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const getHouseStyle = (house: string) => {
    const themes: { [key: string]: { bg: string, color: string, border: string } } = {
      "Vivekananda House": { bg: "rgba(243, 112, 33, 0.1)", color: "#f37021", border: "1px solid rgba(243, 112, 33, 0.25)" },
      "Brahmananda House": { bg: "rgba(66, 153, 225, 0.1)", color: "#4299e1", border: "1px solid rgba(66, 153, 225, 0.25)" },
      "Ramakrishnananda House": { bg: "rgba(212, 175, 55, 0.1)", color: "#d4af37", border: "1px solid rgba(212, 175, 55, 0.25)" },
      "Premananda House": { bg: "rgba(159, 122, 236, 0.1)", color: "#9f7aec", border: "1px solid rgba(159, 122, 236, 0.25)" },
      "Shardananda House": { bg: "rgba(72, 187, 120, 0.1)", color: "#48bb78", border: "1px solid rgba(72, 187, 120, 0.25)" },
      "Yogananda House": { bg: "rgba(237, 100, 166, 0.1)", color: "#ed64a6", border: "1px solid rgba(237, 100, 166, 0.25)" },
      "Monastery": { bg: "rgba(255, 111, 0, 0.1)", color: "#ff6f00", border: "1px solid rgba(255, 111, 0, 0.25)" }
    };
    return themes[house] || { bg: "rgba(255, 255, 255, 0.05)", color: "#a0aec0", border: "1px solid rgba(255, 255, 255, 0.1)" };
  };

  // Compute live statistics dynamically from search matching results
  const stats = useMemo(() => {
    const total = alumniList.length;
    const alumniCount = alumniList.filter(u => u.role === 'alumni').length;
    const studentCount = alumniList.filter(u => u.role === 'student').length;

    const houseCounts: { [key: string]: number } = {};
    const cityCounts: { [key: string]: number } = {};
    const professionCounts: { [key: string]: number } = {};

    alumniList.forEach(u => {
      if (u.house) houseCounts[u.house] = (houseCounts[u.house] || 0) + 1;
      if (u.city) cityCounts[u.city] = (cityCounts[u.city] || 0) + 1;
      if (u.profession) professionCounts[u.profession] = (professionCounts[u.profession] || 0) + 1;
    });

    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(entry => ({ name: entry[0], count: entry[1] }));

    const topProfessions = Object.entries(professionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(entry => ({ name: entry[0], count: entry[1] }));

    return {
      total,
      alumniCount,
      studentCount,
      houseCounts,
      topCities,
      topProfessions
    };
  }, [alumniList]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterBatch('');
    setFilterProfession('');
    setFilterCity('');
    setFilterHouse('');
    setFilterRole('all');
    setSortBy('batch_desc');
  };

  const handleQuickBatchFind = () => {
    if (currentUser?.batch_year) {
      setFilterBatch(String(currentUser.batch_year));
      showToast(`Filtered by Class of ${currentUser.batch_year}!`, 'info');
    }
  };

  return (
    <div className="heritage-page">
      {/* Title Header */}
      <div className="heritage-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.8rem', fontWeight: 800 }}>
            <span>🏵️</span> Legacy Directory
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--heritage-muted)' }}>
            Search and connect across the Vidyapith family, spanning generations since 1922.
          </p>
        </div>
        {currentUser?.batch_year && (
          <button 
            type="button" 
            onClick={handleQuickBatchFind}
            className="heritage-primary-btn"
            style={{ minHeight: '40px', padding: '0 16px', borderRadius: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Sparkles size={14} />
            Find Classmates
          </button>
        )}
      </div>

      {/* Main Grid Wrapper */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '30px', alignItems: 'start' }}>
        
        {/* Left Column: Search Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main search and tab controls card */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <div className="heritage-input" style={{ flexGrow: 1, marginTop: 0, height: '46px' }}>
                <Search size={18} style={{ color: 'var(--heritage-muted)' }} />
                <input 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="Search by name, company, city, batch history or bio keywords..." 
                  style={{ fontSize: '0.92rem' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--heritage-muted)' }}>
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <button 
                type="button" 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="heritage-primary-btn" 
                style={{ 
                  minHeight: '46px', 
                  padding: '0 16px', 
                  borderRadius: '8px', 
                  background: showAdvancedFilters ? 'var(--heritage-navy)' : 'rgba(255,255,255,0.05)', 
                  color: showAdvancedFilters ? 'white' : 'var(--heritage-ink)',
                  border: showAdvancedFilters ? 'none' : '1px solid var(--heritage-line)'
                }}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>

            {/* Role filter tab pills */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--heritage-line)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['all', 'alumni', 'student'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setFilterRole(role)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: filterRole === role ? 'var(--heritage-navy)' : 'transparent',
                      color: filterRole === role ? 'white' : 'var(--heritage-muted)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {role === 'all' ? 'All Connections' : role === 'alumni' ? 'Alumni' : 'Students'}
                  </button>
                ))}
              </div>

              {(filterBatch || filterCity || filterHouse || filterProfession || searchQuery || filterRole !== 'all') && (
                <button 
                  onClick={clearAllFilters}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--heritage-line)', paddingTop: '16px' }}>
                {/* Batch Selection */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--heritage-muted)', display: 'block', marginBottom: '6px' }}>Batch Year</label>
                  <select 
                    value={filterBatch} 
                    onChange={(e) => setFilterBatch(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #dfdfdf', fontSize: '0.85rem', padding: '0 8px', background: 'white' }}
                  >
                    <option value="">All Batches</option>
                    {batchYears.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>

                {/* House Selection */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--heritage-muted)', display: 'block', marginBottom: '6px' }}>Hostel House</label>
                  <select 
                    value={filterHouse} 
                    onChange={(e) => setFilterHouse(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #dfdfdf', fontSize: '0.85rem', padding: '0 8px', background: 'white' }}
                  >
                    <option value="">All Houses</option>
                    {houses.map(h => <option key={h} value={h}>{h.replace(' House', '')}</option>)}
                  </select>
                </div>

                {/* Profession Selection */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--heritage-muted)', display: 'block', marginBottom: '6px' }}>Field / Sector</label>
                  <select 
                    value={filterProfession} 
                    onChange={(e) => setFilterProfession(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #dfdfdf', fontSize: '0.85rem', padding: '0 8px', background: 'white' }}
                  >
                    <option value="">All Fields</option>
                    {professionsList.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>

                {/* Location Input */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--heritage-muted)', display: 'block', marginBottom: '6px' }}>City Location</label>
                  <input 
                    value={filterCity} 
                    onChange={(e) => setFilterCity(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #dfdfdf', fontSize: '0.85rem', padding: '0 10px', boxSizing: 'border-box', background: 'white' }}
                  />
                </div>

                {/* Sort Order */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--heritage-muted)', display: 'block', marginBottom: '6px' }}>Sort By</label>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #dfdfdf', fontSize: '0.85rem', padding: '0 8px', background: 'white' }}
                  >
                    <option value="batch_desc">Batch: Newest First</option>
                    <option value="batch_asc">Batch: Oldest First</option>
                    <option value="name_asc">Name: A to Z</option>
                    <option value="name_desc">Name: Z to A</option>
                    <option value="recent">Recently Joined</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Results Summary Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 4px 0' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--heritage-muted)' }}>
              Showing matching profiles <strong>{startIndex + 1}-{Math.min(startIndex + postsPerPage, totalItems)}</strong> of <strong>{totalItems}</strong>
            </span>
            {loading && <RefreshCw size={14} style={{ animation: 'spin 1.2s linear infinite', color: 'var(--primary-color)' }} />}
          </div>

          {/* Grid of Alumni Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {loading && alumniList.length === 0 ? (
              <div className="glass-panel" style={{ gridColumn: '1 / -1', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <RefreshCw size={36} style={{ animation: 'spin 1.2s linear infinite', color: 'var(--primary-color)' }} />
                <p style={{ color: 'var(--heritage-muted)', fontSize: '0.9rem' }}>Searching the Vidyapith archives...</p>
              </div>
            ) : paginatedAlumni.length === 0 ? (
              <div className="glass-panel" style={{ gridColumn: '1 / -1', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--heritage-muted)' }}>
                <Users size={40} />
                <h3 style={{ margin: '8px 0 4px', color: 'white' }}>No Connections Found</h3>
                <p style={{ fontSize: '0.85rem', textAlign: 'center', maxWidth: '300px', margin: 0 }}>Try adjusting your advanced filter criteria or keyword parameters.</p>
              </div>
            ) : (
              paginatedAlumni.map((alumnus) => {
                const isRequestSent = connectionSentIds.includes(alumnus.id);
                const houseTheme = getHouseStyle(alumnus.house);
                
                return (
                  <article key={alumnus.id} className="heritage-alumni-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                    <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}>
                      <img 
                        src={alumnus.profile_photo} 
                        alt={alumnus.full_name} 
                        onClick={() => onViewProfile(alumnus.id)} 
                        style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    </div>
                    
                    <h2 
                      onClick={() => onViewProfile(alumnus.id)} 
                      style={{ cursor: 'pointer', fontSize: '1.15rem', marginTop: '12px', fontWeight: 800, marginBottom: '6px' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-color)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
                    >
                      {alumnus.full_name}
                    </h2>
                    
                    {/* Batch Year and House badges */}
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
                      <span className="heritage-batch-pill" style={{ margin: 0, padding: '3px 8px', fontSize: '0.72rem' }}>
                        {alumnus.role === 'student' ? 'Student' : `Class of ${alumnus.batch_year}`}
                      </span>
                      {alumnus.house && (
                        <span style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 700, 
                          padding: '3px 8px', 
                          borderRadius: '7px',
                          background: houseTheme.bg,
                          color: houseTheme.color,
                          border: houseTheme.border
                        }}>
                          {alumnus.house.replace(' House', '')}
                        </span>
                      )}
                    </div>
                    
                    {/* Profession & location details */}
                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--heritage-muted)', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Briefcase size={14} style={{ flexShrink: 0 }} />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                          {alumnus.profession || 'Alumnus'}{alumnus.company ? ` @ ${alumnus.company}` : ''}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <MapPin size={14} style={{ flexShrink: 0 }} />
                        <span>{alumnus.city || 'Deoghar'}{alumnus.country ? `, ${alumnus.country}` : ''}</span>
                      </div>
                    </div>
                    
                    <button
                      className="heritage-connect-btn"
                      disabled={isRequestSent}
                      onClick={() => handleConnectRequest(alumnus.id, alumnus.full_name)}
                      style={{ 
                        marginTop: '16px',
                        background: isRequestSent ? 'rgba(0,0,0,0.05)' : '#fff',
                        cursor: isRequestSent ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.85rem',
                        fontWeight: 700
                      }}
                    >
                      <UserPlus size={15} />
                      {isRequestSent ? 'Requested' : 'Connect'}
                    </button>
                  </article>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <footer className="heritage-pagination" style={{ borderTop: '1px solid var(--heritage-line)', paddingTop: '20px', marginTop: '10px' }}>
              <span style={{ fontSize: '0.85rem' }}>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeft size={16} />
                </button>
                
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  // Show current, previous, next, and outer boundaries
                  if (pageNum === 1 || pageNum === totalPages || Math.abs(currentPage - pageNum) <= 1) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={currentPage === pageNum ? 'active' : ''}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 6px', color: 'var(--heritage-muted)' }}>...</span>;
                  }
                  return null;
                })}

                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </footer>
          )}
        </div>

        {/* Right Column: Dynamic Statistics Widget Panel */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '24px' }}>
          
          {/* Total stats counter */}
          <div className="glass-panel" style={{ padding: '22px', borderRadius: '14px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--heritage-muted)', letterSpacing: '0.05em' }}>
              Directory Index
            </span>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', margin: '10px 0 4px' }}>
              {stats.total.toLocaleString()}
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--heritage-muted)' }}>
              Verified Alumni & Active Students matching current search filters.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px', borderTop: '1px solid var(--heritage-line)', paddingTop: '16px' }}>
              <div>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>{stats.alumniCount}</span>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--heritage-muted)', marginTop: '2px' }}>Alumni</span>
              </div>
              <div>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>{stats.studentCount}</span>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--heritage-muted)', marginTop: '2px' }}>Students</span>
              </div>
            </div>
          </div>

          {/* House Distribution Representation */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
              <GraduationCap size={16} style={{ color: 'var(--accent-gold)' }} />
              House Representatives
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {houses.map(house => {
                const count = stats.houseCounts[house] || 0;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                const theme = getHouseStyle(house);
                
                return (
                  <div key={house}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'white' }}>{house.replace(' House', '')}</span>
                      <span style={{ color: 'var(--heritage-muted)' }}>{count}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${pct}%`, 
                          height: '100%', 
                          background: theme.color, 
                          borderRadius: '3px',
                          transition: 'width 0.4s ease'
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Locations geographical hotspot widget */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
              <Globe size={16} style={{ color: '#48bb78' }} />
              Geographic Clusters
            </h3>
            
            {stats.topCities.length === 0 ? (
              <span style={{ fontSize: '0.78rem', color: 'var(--heritage-muted)' }}>No location data available.</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stats.topCities.map(city => (
                  <div key={city.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white' }}>
                      <MapPin size={12} style={{ color: 'var(--heritage-muted)' }} />
                      <span>{city.name}</span>
                    </div>
                    <span style={{ fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', fontSize: '0.72rem', color: 'var(--heritage-muted)' }}>
                      {city.count} {city.count === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Fields/Industries widget */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
              <Award size={16} style={{ color: 'var(--primary-color)' }} />
              Top Domains
            </h3>
            
            {stats.topProfessions.length === 0 ? (
              <span style={{ fontSize: '0.78rem', color: 'var(--heritage-muted)' }}>No professional data available.</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stats.topProfessions.map(prof => (
                  <div key={prof.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white' }}>
                      <Briefcase size={12} style={{ color: 'var(--heritage-muted)' }} />
                      <span style={{ maxWidth: '160px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{prof.name}</span>
                    </div>
                    <span style={{ fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', fontSize: '0.72rem', color: 'var(--heritage-muted)' }}>
                      {prof.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
      
      {/* Spinner keyframe styles */}
      <style>{`
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
};
