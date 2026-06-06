"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { User } from '../database/database';
import { Briefcase, ChevronLeft, ChevronRight, MapPin, Search, SlidersHorizontal, UserPlus, Users } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface DirectoryScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

export const DirectoryScreen: React.FC<DirectoryScreenProps> = ({ showToast, onViewProfile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterProfession, setFilterProfession] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [alumniList, setAlumniList] = useState<User[]>([]);
  const [connectionSentIds, setConnectionSentIds] = useState<string[]>([]);

  const loadDirectory = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('search', searchQuery);
      if (filterBatch) queryParams.append('batchYear', filterBatch);
      if (filterCity) queryParams.append('city', filterCity);

      const results = await apiFetch(`/directory?${queryParams.toString()}`);
      setAlumniList(results);
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  useEffect(() => {
    loadDirectory();
  }, [searchQuery, filterBatch, filterCity]);

  const visibleAlumni = useMemo(() => {
    return alumniList.filter((alumnus) => {
      if (!filterProfession) return true;
      const haystack = `${alumnus.profession} ${alumnus.company}`.toLowerCase();
      return haystack.includes(filterProfession.toLowerCase());
    });
  }, [alumniList, filterProfession]);

  const batchYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 1959 }, (_, index) => currentYear - index);
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

  return (
    <div className="heritage-page directory-redesign">
      <div className="heritage-title-row">
        <div>
          <h1><span><Users size={28} /></span> Alumni Directory - 100 Years of Legacy</h1>
          <p>Find and reconnect with your batchmates and schoolmates.</p>
        </div>
      </div>

      <section className="heritage-filter-card">
        <label>
          <span>Search by Name</span>
          <div className="heritage-input">
            <Users size={18} />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="e.g. Sar" />
          </div>
        </label>

        <label>
          <span>Batch Year</span>
          <select value={filterBatch} onChange={(event) => setFilterBatch(event.target.value)}>
            <option value="">All Years</option>
            {batchYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>

        <label>
          <span>Profession</span>
          <select value={filterProfession} onChange={(event) => setFilterProfession(event.target.value)}>
            <option value="">All Fields</option>
            <option value="engineer">Engineering</option>
            <option value="designer">Design</option>
            <option value="doctor">Medicine</option>
            <option value="product">Product</option>
            <option value="finance">Finance</option>
          </select>
        </label>

        <label>
          <span>Location</span>
          <select value={filterCity} onChange={(event) => setFilterCity(event.target.value)}>
            <option value="">Anywhere</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Delhi">Delhi</option>
            <option value="Deoghar">Deoghar</option>
            <option value="Kolkata">Kolkata</option>
          </select>
        </label>

        <button className="heritage-primary-btn" onClick={loadDirectory}>
          <Search size={20} />
          Search
        </button>
      </section>

      <div className="directory-meta-row">
        <p>Showing <strong>{visibleAlumni.length.toLocaleString()}</strong> alumni</p>
        <p><SlidersHorizontal size={18} /> Sorted by: <strong>Recently Joined</strong></p>
      </div>

      <section className="heritage-directory-grid">
        {visibleAlumni.length === 0 ? (
          <div className="heritage-empty">
            <Users size={42} />
            <p>No alumni found matching these filters.</p>
          </div>
        ) : (
          visibleAlumni.slice(0, 12).map((alumnus) => {
            const isRequestSent = connectionSentIds.includes(alumnus.id);
            return (
              <article key={alumnus.id} className="heritage-alumni-card">
                <img src={alumnus.profile_photo} alt={alumnus.full_name} onClick={() => onViewProfile(alumnus.id)} />
                <h2 onClick={() => onViewProfile(alumnus.id)}>{alumnus.full_name}</h2>
                <span className="heritage-batch-pill">{alumnus.role === 'student' ? 'Current Student' : `Batch of ${alumnus.batch_year}`}</span>
                <p><Briefcase size={18} /> {alumnus.profession || 'Alumnus'}</p>
                <p><MapPin size={18} /> {alumnus.city || 'Deoghar'}{alumnus.country ? `, ${alumnus.country}` : ''}</p>
                <button
                  className="heritage-connect-btn"
                  disabled={isRequestSent}
                  onClick={() => handleConnectRequest(alumnus.id, alumnus.full_name)}
                >
                  <UserPlus size={18} />
                  {isRequestSent ? 'Requested' : 'Connect'}
                </button>
              </article>
            );
          })
        )}
      </section>

      <footer className="heritage-pagination">
        <span>Page 1 of 156</span>
        <div>
          <button><ChevronLeft size={20} /></button>
          <button className="active">1</button>
          <button>2</button>
          <button>3</button>
          <span>...</span>
          <button>156</button>
          <button><ChevronRight size={20} /></button>
        </div>
      </footer>
    </div>
  );
};
