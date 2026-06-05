"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RKMV_DB, User } from '../database/database';
import { Search, Calendar, Home, MapPin, UserPlus, Check, Users } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface DirectoryScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

export const DirectoryScreen: React.FC<DirectoryScreenProps> = ({ showToast, onViewProfile }) => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterHouse, setFilterHouse] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [alumniList, setAlumniList] = useState<User[]>([]);
  const [connectionSentIds, setConnectionSentIds] = useState<string[]>([]);

  const loadDirectory = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('search', searchQuery);
      if (filterBatch) queryParams.append('batchYear', filterBatch);
      if (filterHouse) queryParams.append('house', filterHouse);
      if (filterCity) queryParams.append('city', filterCity);

      const results = await apiFetch(`/directory?${queryParams.toString()}`);
      setAlumniList(results);
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  useEffect(() => {
    loadDirectory();
  }, [searchQuery, filterBatch, filterHouse, filterCity]);

  const generateBatchOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 1960; year--) {
      years.push(year);
    }
    return years;
  };

  const getHouseColor = (house: string) => {
    const colors: { [key: string]: string } = {
      "Vivekananda House": "#f37021",       // Saffron
      "Brahmananda House": "#4299e1",       // Light Blue
      "Ramakrishnananda House": "#d4af37",  // Gold
      "Shardananda House": "#48bb78",       // Green
      "Premananda House": "#9f7aec",       // Purple
      "Yogananda House": "#ed64a6",        // Pink
      "Monastery": "#ff6f00"
    };
    return colors[house] || "rgba(255,255,255,0.15)";
  };

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

  return (
    <div className="directory-layout">
      {/* Page Title */}
      <div className="page-title-box">
        <div className="page-title-text">
          <h2>Alumni Directory</h2>
          <p>Locate, filter, and connect with verified ex-students of RKMV Deoghar across generations.</p>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="glass-panel directory-filters-panel" style={{ padding: '20px', marginBottom: '28px' }}>
        <div className="filters-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Search Name or Profession</label>
            <div className="input-with-icon">
              <Search size={16} className="search-icon" style={{ top: '50%', transform: 'translateY(-50%)', left: '12px' }} />
              <input 
                type="text" 
                placeholder="Search by name, company, job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Batch Year</label>
            <div className="input-with-icon">
              <Calendar size={16} className="search-icon" style={{ top: '50%', transform: 'translateY(-50%)', left: '12px' }} />
              <select 
                value={filterBatch} 
                onChange={(e) => setFilterBatch(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 38px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
              >
                <option value="">All Batches</option>
                {generateBatchOptions().map(year => (
                  <option key={year} value={year}>Class of {year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>House / Hostel</label>
            <div className="input-with-icon">
              <Home size={16} className="search-icon" style={{ top: '50%', transform: 'translateY(-50%)', left: '12px' }} />
              <select 
                value={filterHouse}
                onChange={(e) => setFilterHouse(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 38px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
              >
                <option value="">All Houses</option>
                <option value="Vivekananda House">Vivekananda House</option>
                <option value="Brahmananda House">Brahmananda House</option>
                <option value="Ramakrishnananda House">Ramakrishnananda House</option>
                <option value="Shardananda House">Shardananda House</option>
                <option value="Premananda House">Premananda House</option>
                <option value="Yogananda House">Yogananda House</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Location / City</label>
            <div className="input-with-icon">
              <MapPin size={16} className="search-icon" style={{ top: '50%', transform: 'translateY(-50%)', left: '12px' }} />
              <input 
                type="text" 
                placeholder="E.g., Bengaluru"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      <div className="directory-grid">
        {alumniList.length === 0 ? (
          <div className="loading-state" style={{ gridColumn: '1 / -1', minHeight: '250px' }}>
            <Users size={48} style={{ color: 'var(--text-muted)' }} />
            <p>No alumni found matching these filters. Try broadening your query.</p>
          </div>
        ) : (
          alumniList.map(alumnus => {
            const houseColor = getHouseColor(alumnus.house);
            const isStudent = alumnus.role === 'student';
            const isRequestSent = connectionSentIds.includes(alumnus.id);
            
            return (
              <div key={alumnus.id} className="glass-panel alumni-card" id={`alumni-card-${alumnus.id}`}>
                <div className="alumni-card-house-stripe" style={{ background: houseColor, boxShadow: `0 2px 10px ${houseColor}50` }}></div>
                
                <img 
                  src={alumnus.profile_photo} 
                  alt={alumnus.full_name} 
                  className="alumni-card-photo" 
                  style={{ borderColor: `${houseColor}50`, cursor: 'pointer' }}
                  onClick={() => onViewProfile(alumnus.id)}
                />
                
                <h3 className="alumni-card-name" style={{ cursor: 'pointer' }} onClick={() => onViewProfile(alumnus.id)}>{alumnus.full_name}</h3>
                <span className="alumni-card-batch">{isStudent ? 'Current Student' : 'Batch of ' + alumnus.batch_year}</span>
                
                <div className="badge badge-role" style={{ marginBottom: '12px', background: `${houseColor}18`, borderColor: `${houseColor}40`, color: houseColor }}>
                  {alumnus.house}
                </div>
                
                <p className="alumni-card-job" style={{ minHeight: '1.2em' }}>{alumnus.profession}</p>
                <p className="alumni-card-company" style={{ minHeight: '1.2em' }}>{alumnus.company}</p>
                
                <div className="alumni-card-city">
                  <MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} />
                  <span>{alumnus.city || 'India'}</span>
                </div>
                
                <div className="alumni-card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => onViewProfile(alumnus.id)}>
                    <span>View Profile</span>
                  </button>
                  {isRequestSent ? (
                    <button className="btn btn-secondary btn-sm" disabled style={{ color: 'var(--text-success)', borderColor: 'var(--text-success)' }}>
                      <Check size={14} />
                      <span>Requested</span>
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => handleConnectRequest(alumnus.id, alumnus.full_name)}>
                      <UserPlus size={14} />
                      <span>Connect</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

