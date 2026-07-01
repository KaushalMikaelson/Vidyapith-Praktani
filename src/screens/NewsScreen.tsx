"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { QuoteWidget } from '../components/QuoteWidget';
import { BookOpen, PlusCircle, Calendar, Film, X } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface NewsScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
}

export const NewsScreen: React.FC<NewsScreenProps> = ({ showToast }) => {
  const { currentUser } = useAuth();
  
  const [news, setNews] = useState<any[]>([]);
  const [heritage, setHeritage] = useState<any[]>([]);
  const [activeDecade, setActiveDecade] = useState<string>('All');
  
  // Compose modal state
  const [composeModalVisible, setComposeModalVisible] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState<'Institutional News' | 'Alumni Spotlight' | 'Achievements' | 'Student Life'>('Institutional News');
  const [newsBody, setNewsBody] = useState('');
  const [newsPhotoUrl, setNewsPhotoUrl] = useState('');

  // Retro photo preview state
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

  const loadNewsData = async () => {
    try {
      const newsList = await apiFetch('/news');
      setNews(newsList);
      
      let herList = await apiFetch('/heritage');
      if (activeDecade !== 'All') {
        herList = herList.filter((item: any) => item.decade === activeDecade);
      }
      setHeritage(herList);
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  useEffect(() => {
    loadNewsData();
  }, [activeDecade]);

  if (!currentUser) return null;

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsBody.trim()) {
      showToast("Title and Body are required.", "danger");
      return;
    }

    try {
      await apiFetch('/news', {
        method: 'POST',
        body: JSON.stringify({
          title: newsTitle.trim(),
          body: newsBody.trim(),
          category: newsCategory,
          mediaUrl: newsPhotoUrl.trim() || undefined
        })
      });
      showToast("News article published successfully!", "success");

      setComposeModalVisible(false);
      setNewsTitle('');
      setNewsBody('');
      setNewsPhotoUrl('');
      loadNewsData();
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const decades = ['All', '1920s', '1940s', '1960s', '1980s', '2000s', '2020s'];

  return (
    <div className="news-layout" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '30px' }}>
      
      {/* Left Column: News Articles */}
      <div className="news-main-column">
        {/* Swami Vivekananda Quotes Widget */}
        <QuoteWidget />

        <div className="page-title-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="page-title-text">
            <h2>Campus News & Alumni Spotlights</h2>
            <p>Stay informed about the latest institutional reports, student feats, and prominent alumni cover stories.</p>
          </div>
          {currentUser.role === 'admin' && (
            <button className="btn btn-primary btn-sm" onClick={() => setComposeModalVisible(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={14} />
              <span>Write News</span>
            </button>
          )}
        </div>

        {/* Feature 8: Alumni Spotlight Hero Card */}
        {(() => {
          const spotlight = news.find(n => n.category === 'Alumni Spotlight');
          if (!spotlight) return null;
          return (
            <div
              className="glass-panel"
              style={{
                padding: '28px',
                marginBottom: '24px',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(18,33,56,0.98) 100%)',
                border: '2px solid rgba(212,175,55,0.4)',
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Background shimmer line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #d4af37, #f5d87a, #d4af37)', backgroundSize: '200% 100%' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '1.3rem' }}>⭐</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#d4af37' }}>Alumni Spotlight</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {new Date(spotlight.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              {spotlight.media_url && (
                <img
                  src={spotlight.media_url}
                  alt={spotlight.title}
                  style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', borderRadius: '10px', marginBottom: '16px', border: '1px solid rgba(212,175,55,0.2)' }}
                />
              )}

              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: '8px', lineHeight: 1.25 }}>{spotlight.title}</h3>
              <span style={{ fontSize: '0.75rem', color: '#d4af37', display: 'block', marginBottom: '12px', fontWeight: 600 }}>
                Featured: {spotlight.author_name}
              </span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {spotlight.body?.length > 300 ? spotlight.body.substring(0, 300) + '...' : spotlight.body}
              </p>
            </div>
          );
        })()}

        {/* Featured Card */}
        {news.length > 0 && (
          <div className="glass-panel featured-news-card" style={{ padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(12,30,54,0.7) 0%, rgba(18,33,56,0.95) 100%)', borderLeft: '4px solid var(--accent-gold)' }}>
            {news[0].media_url && (
              <img 
                src={news[0].media_url} 
                alt={news[0].title} 
                style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', borderRadius: 'var(--border-radius-sm)', marginBottom: '16px' }}
              />
            )}
            <span className="badge badge-admin" style={{ marginBottom: '10px' }}>{news[0].category}</span>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{news[0].title}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }}>
              Published by {news[0].author_name} • {new Date(news[0].published_at).toLocaleDateString('en-IN')}
            </span>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {news[0].body}
            </p>
          </div>
        )}

        {/* Chronological list of other news */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {news.slice(1).map(post => (
            <div key={post.id} className="glass-panel cause-card" style={{ display: 'flex', gap: '20px', padding: '20px', alignItems: 'flex-start' }}>
              {post.media_url && (
                <img 
                  src={post.media_url} 
                  alt={post.title} 
                  style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                />
              )}
              <div style={{ flexGrow: 1 }}>
                <span className="badge badge-role" style={{ fontSize: '0.65rem', padding: '2px 8px', marginBottom: '6px' }}>{post.category}</span>
                <h4 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '4px' }}>{post.title}</h4>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  By {post.author_name} • {new Date(post.published_at).toLocaleDateString('en-IN')}
                </span>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {post.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Centenary Heritage Hub */}
      <div className="news-sidebar">
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <Film size={20} style={{ color: 'var(--accent-gold)' }} />
            <span>Centenary Heritage Archive</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
            Explore 100 years of Ramakrishna Mission Vidyapith's history. Tagged archive scans of the prayer halls, hostel dormitories, and batch convocation memories.
          </p>

          {/* Decade Scroller */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
            {decades.map(dec => (
              <button
                key={dec}
                onClick={() => setActiveDecade(dec)}
                style={{
                  background: activeDecade === dec ? 'var(--primary-color)' : 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {dec}
              </button>
            ))}
          </div>

          {/* Heritage polaroids */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {heritage.map(item => (
              <div 
                key={item.id} 
                className="heritage-polaroid"
                onClick={() => setSelectedPhoto(item)}
                style={{
                  background: 'white',
                  padding: '8px 8px 14px',
                  borderRadius: '4px',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  transform: 'rotate(' + (Math.random() * 4 - 2) + 'deg)',
                  transition: 'transform 0.2s ease',
                  border: '1px solid #ddd'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05) rotate(0deg)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'rotate(' + (Math.random() * 4 - 2) + 'deg)'}
              >
                <img 
                  src={item.media_url} 
                  alt={item.title} 
                  style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '2px', border: '1px solid #eee' }}
                />
                <div style={{ marginTop: '8px', color: '#1a202c', textAlign: 'center', fontFamily: 'serif' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                  <span style={{ fontSize: '0.65rem', color: '#718096' }}>Circa {item.year}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Write News Modal */}
      {composeModalVisible && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-card" style={{ maxWidth: '500px', padding: '30px' }}>
            <div className="page-title-box" style={{ marginBottom: '20px' }}>
              <h3>Write News / Blog Article</h3>
              <button className="icon-btn" onClick={() => setComposeModalVisible(false)}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleComposeSubmit}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Article Title</label>
                <input 
                  type="text" 
                  placeholder="E.g., Centennial Celebrations Convocation details" 
                  required 
                  value={newsTitle}
                  onChange={(e) => setNewsTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                />
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Category</label>
                  <select 
                    value={newsCategory}
                    onChange={(e) => setNewsCategory(e.target.value as any)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  >
                    <option value="Institutional News">Institutional News</option>
                    <option value="Alumni Spotlight">Alumni Spotlight</option>
                    <option value="Achievements">Achievements</option>
                    <option value="Student Life">Student Life</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Attach Image URL</label>
                <input 
                  type="text" 
                  placeholder="Paste cover photo URL (Unsplash etc.)" 
                  value={newsPhotoUrl}
                  onChange={(e) => setNewsPhotoUrl(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Body Content</label>
                <textarea 
                  rows={6} 
                  placeholder="Type full article details here..." 
                  required 
                  value={newsBody}
                  onChange={(e) => setNewsBody(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontFamily: 'inherit' }}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                <span>Publish News Article</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Vintage Photo Zoom Modal */}
      {selectedPhoto && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setSelectedPhoto(null)}>
          <div 
            className="modal-card" 
            style={{ maxWidth: '440px', padding: '16px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={selectedPhoto.media_url} 
              alt={selectedPhoto.title} 
              style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '4px', border: '6px solid var(--border-color)' }}
            />
            <div style={{ marginTop: '16px', padding: '0 8px 10px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>{selectedPhoto.title}</h3>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--accent-gold)', border: '1px solid var(--border-color)', fontSize: '0.7rem', padding: '3px 10px', marginBottom: '10px' }}>
                Decade: {selectedPhoto.decade} (Year {selectedPhoto.year})
              </span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, textAlign: 'justify', marginTop: '10px' }}>
                {selectedPhoto.description}
              </p>
            </div>
            
            <button 
              className="btn btn-secondary btn-block btn-sm" 
              onClick={() => setSelectedPhoto(null)}
            >
              Close Archive
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

