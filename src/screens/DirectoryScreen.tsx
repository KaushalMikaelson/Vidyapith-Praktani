"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { User } from '../database/database';
import { 
  Briefcase, ChevronLeft, ChevronRight, MapPin, Search, 
  UserPlus, Users, RefreshCw, X, Bell, Home, TrendingUp, LayoutGrid, List, BookOpen
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
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'alumni' | 'student' | 'faculty'>('all');
  const [sortBy] = useState('seed_order');
  
  // List & Status State
  const [alumniList, setAlumniList] = useState<User[]>([]);
  const [connectionSentIds, setConnectionSentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
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
      if (filterRole && filterRole !== 'all') queryParams.append('role', filterRole);
      if (sortBy) queryParams.append('sortBy', sortBy);
      if (filterDepartment) queryParams.append('department', filterDepartment);
      if (filterIndustry) queryParams.append('industry', filterIndustry);

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
  }, [searchQuery, filterBatch, filterCity, filterRole, sortBy, filterDepartment, filterIndustry]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterBatch, filterCity, filterRole, filterDepartment, filterIndustry]);

  // Pagination helper calculations
  const totalItems = alumniList.length;
  const totalPages = Math.ceil(totalItems / postsPerPage) || 1;
  const startIndex = (currentPage - 1) * postsPerPage;
  const paginatedAlumni = alumniList.slice(startIndex, startIndex + postsPerPage);

  const batchYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 1984 }, (_, index) => currentYear - index);
  }, []);

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

  // Compute alphabet index counts dynamically from matching users
  const alphabetIndexCounts = useMemo(() => {
    const counts = { AD: 0, EH: 0, IL: 0, MP: 0, QT: 0, UZ: 0 };
    alumniList.forEach(u => {
      const char = (u.full_name || '').trim().charAt(0).toUpperCase();
      if (char >= 'A' && char <= 'D') counts.AD++;
      else if (char >= 'E' && char <= 'H') counts.EH++;
      else if (char >= 'I' && char <= 'L') counts.IL++;
      else if (char >= 'M' && char <= 'P') counts.MP++;
      else if (char >= 'Q' && char <= 'T') counts.QT++;
      else if (char >= 'U' && char <= 'Z') counts.UZ++;
    });
    return counts;
  }, [alumniList]);

  const handleQuickBatchFind = () => {
    if (currentUser?.batch_year) {
      setFilterBatch(String(currentUser.batch_year));
      showToast(`Filtered by Class of ${currentUser.batch_year}!`, 'info');
    }
  };

  const getAvatarGradient = (dept?: string) => {
    const depts = dept || "";
    if (depts === "Engineering" || depts === "Physics") return "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)";
    if (depts === "Science" || depts === "Chemistry") return "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)";
    if (depts === "Commerce") return "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)";
    if (depts === "Arts") return "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)";
    return "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)";
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
            background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(236, 72, 153, 0.2)'
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
        
        {/* Header Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#64748b' }}>
          <Search size={22} style={{ cursor: 'pointer' }} />
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <Bell size={22} />
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#ef4444'
            }}></span>
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
                placeholder="Search alumni, students, faculty..." 
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
              style={{ minHeight: '48px', borderRadius: '12px', padding: '0 20px', fontSize: '0.9rem' }}
            >
              <Users size={16} />
              Find Classmates
            </button>
          </div>

          {/* 4 Pill Selectors Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {/* Batch Year Select */}
            <select 
              value={filterBatch} 
              onChange={(e) => setFilterBatch(e.target.value)}
              className="directory-pill-select"
            >
              <option value="">Batch Year</option>
              {batchYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>

            {/* Department Select */}
            <select 
              value={filterDepartment} 
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="directory-pill-select"
            >
              <option value="">Department</option>
              <option value="Engineering">Engineering</option>
              <option value="Science">Science</option>
              <option value="Commerce">Commerce</option>
              <option value="Arts">Arts</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
            </select>

            {/* Location Select */}
            <select 
              value={filterCity} 
              onChange={(e) => setFilterCity(e.target.value)}
              className="directory-pill-select"
            >
              <option value="">Location</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi">Delhi</option>
              <option value="Pune">Pune</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Kolkata">Kolkata</option>
              <option value="Deoghar">Deoghar</option>
            </select>

            {/* Industry Select */}
            <select 
              value={filterIndustry} 
              onChange={(e) => setFilterIndustry(e.target.value)}
              className="directory-pill-select"
            >
              <option value="">Industry</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Government">Government</option>
              <option value="Education">Education</option>
              <option value="Research">Research</option>
              <option value="Art">Art</option>
            </select>
          </div>

          {/* Role Filters & Found Label */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'all', label: 'All Connections' },
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
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
                // Check if connection is requested (following state)
                const isRequestSent = connectionSentIds.includes(alumnus.id) || 
                                      ["Sophia Verma", "Priya Singh", "Nikhil Joshi"].includes(alumnus.full_name);
                
                return (
                  <article 
                    key={alumnus.id} 
                    className="glass-panel" 
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
                        background: getAvatarGradient(alumnus.department),
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
                      onMouseEnter={(e) => e.currentTarget.style.color = '#8b5cf6'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#1e293b'}
                    >
                      {alumnus.full_name}
                    </h2>
                    
                    {/* Role/Batch & Department Subtitle */}
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                      {alumnus.role === 'faculty' ? (
                        `Faculty - ${alumnus.department || 'Physics'}`
                      ) : alumnus.role === 'student' ? (
                        `Student - ${alumnus.department || 'Science'}`
                      ) : (
                        `Class of ${alumnus.batch_year} - ${alumnus.department || 'Engineering'}`
                      )}
                    </div>
                    
                    {/* Location */}
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px', flexGrow: 1 }}>
                      <span>{alumnus.city || 'Mumbai'}</span>
                    </div>
                    
                    {/* Connect Button */}
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 'auto' }}>
                      <button
                        disabled={isRequestSent}
                        onClick={() => handleConnectRequest(alumnus.id, alumnus.full_name)}
                        className={isRequestSent ? "btn-following-gray" : "btn-connect-gradient"}
                        style={{ 
                          padding: '8px 32px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          width: 'auto',
                          minWidth: '130px'
                        }}
                      >
                        {isRequestSent ? 'Following' : 'Connect'}
                      </button>
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
                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>#</span>
              </div>
              <h3>Directory Index</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: "A - D", count: alphabetIndexCounts.AD },
                { label: "E - H", count: alphabetIndexCounts.EH },
                { label: "I - L", count: alphabetIndexCounts.IL },
                { label: "M - P", count: alphabetIndexCounts.MP },
                { label: "Q - T", count: alphabetIndexCounts.QT },
                { label: "U - Z", count: alphabetIndexCounts.UZ }
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600, color: '#475569' }}>{item.label}</span>
                  <span style={{
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    color: 'white',
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem'
                  }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 2: House Representatives */}
          <div className="sidebar-widget-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="sidebar-widget-title-row">
              <div className="widget-icon-box">
                <Home size={18} />
              </div>
              <h3>House Representatives</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { name: "Arjun Nair", house: "Tagore House", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&q=80" },
                { name: "Meera Pillai", house: "Gandhi House", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80" },
                { name: "Vikram Bose", house: "Bose House", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80" },
                { name: "Kavya Iyer", house: "Nehru House", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80" }
              ].map(rep => (
                <div key={rep.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={rep.avatar} alt={rep.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{rep.name}</span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{rep.house.replace(' House', '')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widget 3: Batch Stats */}
          <div className="sidebar-widget-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="sidebar-widget-title-row">
              <div className="widget-icon-box">
                <TrendingUp size={18} />
              </div>
              <h3>Batch Stats</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: "Total Alumni", val: "1,248" },
                { label: "Active Students", val: "342" },
                { label: "Faculty Members", val: "87" },
                { label: "Batch Years", val: "1985-2024" }
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
