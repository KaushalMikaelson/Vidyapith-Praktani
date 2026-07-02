"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { QuoteWidget } from '../components/QuoteWidget';
import { BookOpen, PlusCircle, Calendar, Film, X, Star, ChevronRight, Newspaper } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface NewsScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
}

const categoryColors: Record<string, { color: string; bg: string }> = {
  'Alumni Spotlight':     { color: '#d4af37', bg: 'rgba(212,175,55,0.1)' },
  'Institutional News':   { color: 'var(--primary-color)', bg: 'rgba(243,112,33,0.1)' },
  'Achievements':         { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  'Student Life':         { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
};

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

  useEffect(() => { loadNewsData(); }, [activeDecade]);

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
      setNewsTitle(''); setNewsBody(''); setNewsPhotoUrl('');
      loadNewsData();
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const decades = ['All', '1920s', '1940s', '1960s', '1980s', '2000s', '2020s'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '32px', animation: 'fadeIn 0.4s ease-out' }}>

      {/* ── Left Column: News Articles ─────────────────────── */}
      <div>
        {/* Swami Vivekananda Quotes Widget */}
        <QuoteWidget />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'var(--primary-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                boxShadow: '0 6px 16px rgba(243,112,33,0.22)'
              }}>
                <Newspaper size={20} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--heritage-ink)', margin: 0, fontFamily: 'var(--font-title)' }}>
                Campus News & Alumni Spotlights
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--heritage-muted)', paddingLeft: '52px' }}>
              Institutional reports, student feats, and prominent alumni cover stories.
            </p>
          </div>
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setComposeModalVisible(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 18px', background: 'var(--primary-gradient)',
                border: 'none', borderRadius: '10px', color: 'white',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(243,112,33,0.25)', transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(243,112,33,0.35)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(243,112,33,0.25)'; }}
            >
              <PlusCircle size={16} />
              Write News
            </button>
          )}
        </div>

        {/* Alumni Spotlight Hero Card */}
        {(() => {
          const spotlight = news.find(n => n.category === 'Alumni Spotlight');
          if (!spotlight) return null;
          return (
            <div style={{
              padding: '28px', marginBottom: '24px',
              background: 'linear-gradient(135deg, #0c1e36 0%, #1a2f50 100%)',
              border: '1px solid rgba(212,175,55,0.3)',
              borderTop: '4px solid #d4af37',
              borderRadius: '18px', position: 'relative', overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
            }}>
              {/* Gold shimmer top bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #d4af37, #f5d87a, #d4af37)', backgroundSize: '200% 100%' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Star size={16} style={{ color: '#d4af37' }} fill="#d4af37" />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#d4af37' }}>Alumni Spotlight</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                  {new Date(spotlight.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              {spotlight.media_url && (
                <img src={spotlight.media_url} alt={spotlight.title}
                  style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', borderRadius: '12px', marginBottom: '18px', border: '1px solid rgba(212,175,55,0.2)' }}
                />
              )}
              <h3 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'white', marginBottom: '8px', lineHeight: 1.25, fontFamily: 'var(--font-title)' }}>
                {spotlight.title}
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#d4af37', display: 'block', marginBottom: '12px', fontWeight: 700 }}>
                Featured: {spotlight.author_name}
              </span>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
                {spotlight.body?.length > 300 ? spotlight.body.substring(0, 300) + '...' : spotlight.body}
              </p>
            </div>
          );
        })()}

        {/* Featured Card */}
        {news.length > 0 && (() => {
          const article = news[0];
          const cat = categoryColors[article.category] || categoryColors['Institutional News'];
          return (
            <div style={{
              background: 'var(--heritage-card)', border: '1px solid var(--heritage-line)',
              borderLeft: `5px solid ${cat.color}`,
              borderRadius: '18px', padding: '24px', marginBottom: '24px',
              boxShadow: 'var(--heritage-shadow)'
            }}>
              {article.media_url && (
                <img src={article.media_url} alt={article.title}
                  style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', borderRadius: '12px', marginBottom: '18px' }}
                />
              )}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: cat.bg, color: cat.color,
                border: `1px solid ${cat.color}30`,
                borderRadius: '9999px', padding: '3px 12px',
                fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.04em', marginBottom: '12px'
              }}>
                {article.category}
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--heritage-ink)', marginBottom: '8px', fontFamily: 'var(--font-title)', lineHeight: 1.3 }}>
                {article.title}
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--heritage-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                <Calendar size={12} />
                Published by {article.author_name} · {new Date(article.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <p style={{ fontSize: '0.92rem', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
                {article.body}
              </p>
            </div>
          );
        })()}

        {/* Chronological list of other news */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {news.slice(1).map(post => {
            const cat = categoryColors[post.category] || categoryColors['Institutional News'];
            return (
              <div key={post.id} style={{
                display: 'flex', gap: '18px', padding: '20px',
                background: 'var(--heritage-card)', border: '1px solid var(--heritage-line)',
                borderRadius: '16px', alignItems: 'flex-start',
                boxShadow: 'var(--heritage-shadow)', transition: 'all 0.22s ease',
                cursor: 'default'
              }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.07)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--heritage-shadow)'; }}
              >
                {post.media_url && (
                  <img src={post.media_url} alt={post.title}
                    style={{ width: '110px', height: '80px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }}
                  />
                )}
                <div style={{ flexGrow: 1 }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: cat.bg, color: cat.color,
                    border: `1px solid ${cat.color}25`,
                    borderRadius: '9999px', padding: '2px 10px',
                    fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '0.04em', marginBottom: '8px'
                  }}>
                    {post.category}
                  </div>
                  <h4 style={{ fontSize: '1.05rem', color: 'var(--heritage-ink)', fontWeight: 800, marginBottom: '5px', fontFamily: 'var(--font-title)', lineHeight: 1.3 }}>
                    {post.title}
                  </h4>
                  <span style={{ fontSize: '0.76rem', color: 'var(--heritage-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '9px' }}>
                    <Calendar size={11} /> By {post.author_name} · {new Date(post.published_at).toLocaleDateString('en-IN')}
                  </span>
                  <p style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {post.body?.length > 180 ? post.body.substring(0, 180) + '...' : post.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Column: Centenary Heritage Hub ─────────── */}
      <div>
        <div style={{
          background: 'var(--heritage-card)', border: '1px solid var(--heritage-line)',
          borderRadius: '18px', padding: '24px', boxShadow: 'var(--heritage-shadow)',
          position: 'sticky', top: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', paddingBottom: '16px', borderBottom: '1px solid var(--heritage-line)' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'rgba(212,175,55,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Film size={18} style={{ color: '#d4af37' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--heritage-ink)', margin: 0, fontFamily: 'var(--font-title)' }}>
                Centenary Heritage Archive
              </h3>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--heritage-muted)', marginBottom: '18px', lineHeight: 1.55 }}>
            Explore 100 years of Ramakrishna Mission Vidyapith history — prayer halls, hostel dormitories, and batch convocation memories.
          </p>

          {/* Decade Scroller */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
            {decades.map(dec => (
              <button
                key={dec}
                onClick={() => setActiveDecade(dec)}
                style={{
                  background: activeDecade === dec ? 'var(--primary-gradient)' : 'transparent',
                  border: `1.5px solid ${activeDecade === dec ? 'transparent' : 'var(--heritage-line)'}`,
                  color: activeDecade === dec ? 'white' : 'var(--heritage-ink)',
                  fontSize: '0.78rem', fontWeight: 700,
                  padding: '5px 12px', borderRadius: '9999px',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: activeDecade === dec ? '0 3px 8px rgba(243,112,33,0.2)' : 'none'
                }}
                onMouseOver={(e) => { if (activeDecade !== dec) { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.color = 'var(--primary-color)'; } }}
                onMouseOut={(e) => { if (activeDecade !== dec) { e.currentTarget.style.borderColor = 'var(--heritage-line)'; e.currentTarget.style.color = 'var(--heritage-ink)'; } }}
              >
                {dec}
              </button>
            ))}
          </div>

          {/* Heritage polaroids */}
          {heritage.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--heritage-muted)' }}>
              <BookOpen size={32} style={{ marginBottom: '10px', opacity: 0.4 }} />
              <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>No archive items for this decade yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {heritage.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedPhoto(item)}
                  style={{
                    background: 'white', padding: '8px 8px 14px',
                    borderRadius: '6px', border: '1px solid #ddd',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.07)',
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    transform: `rotate(${(Math.random() * 3 - 1.5).toFixed(1)}deg)`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06) rotate(0deg)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = `rotate(${(Math.random() * 3 - 1.5).toFixed(1)}deg)`; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.07)'; }}
                >
                  <img src={item.media_url} alt={item.title}
                    style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '2px', border: '1px solid #eee' }}
                  />
                  <div style={{ marginTop: '10px', textAlign: 'center', fontFamily: 'Georgia, serif' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a202c' }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#718096', fontStyle: 'italic' }}>Circa {item.year}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Write News Modal ──────────────────────────────── */}
      {composeModalVisible && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-card" style={{
            maxWidth: '520px', padding: '32px',
            background: 'var(--heritage-card)',
            border: '1px solid var(--heritage-line)',
            borderRadius: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--heritage-ink)', margin: 0, fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Newspaper size={20} style={{ color: 'var(--primary-color)' }} />
                Write News Article
              </h3>
              <button
                onClick={() => setComposeModalVisible(false)}
                style={{ background: 'rgba(0,0,0,0.04)', border: 'none', cursor: 'pointer', color: 'var(--heritage-muted)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = 'var(--heritage-muted)'; }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleComposeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--heritage-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Article Title
                </label>
                <input type="text" placeholder="E.g., Centennial Celebrations Convocation details" required value={newsTitle} onChange={(e) => setNewsTitle(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', background: '#fff', border: '1.5px solid var(--heritage-line)', color: 'var(--heritage-ink)', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(243,112,33,0.12)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--heritage-line)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--heritage-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category</label>
                <select value={newsCategory} onChange={(e) => setNewsCategory(e.target.value as any)}
                  style={{ width: '100%', padding: '11px 14px', background: '#fff', border: '1.5px solid var(--heritage-line)', color: 'var(--heritage-ink)', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }}
                >
                  <option value="Institutional News">Institutional News</option>
                  <option value="Alumni Spotlight">Alumni Spotlight</option>
                  <option value="Achievements">Achievements</option>
                  <option value="Student Life">Student Life</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--heritage-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attach Image URL (optional)</label>
                <input type="text" placeholder="Paste cover photo URL (Unsplash, Cloudinary, etc.)" value={newsPhotoUrl} onChange={(e) => setNewsPhotoUrl(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', background: '#fff', border: '1.5px solid var(--heritage-line)', color: 'var(--heritage-ink)', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(243,112,33,0.12)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--heritage-line)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--heritage-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Body Content</label>
                <textarea rows={6} placeholder="Type full article details here..." required value={newsBody} onChange={(e) => setNewsBody(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', background: '#fff', border: '1.5px solid var(--heritage-line)', color: 'var(--heritage-ink)', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', transition: 'all 0.2s', boxSizing: 'border-box' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(243,112,33,0.12)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--heritage-line)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <button type="submit" style={{
                padding: '13px', background: 'var(--primary-gradient)', border: 'none',
                borderRadius: '12px', color: 'white', fontWeight: 800, fontSize: '0.95rem',
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(243,112,33,0.25)', transition: 'all 0.2s'
              }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(243,112,33,0.35)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(243,112,33,0.25)'; }}
              >
                Publish News Article
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Vintage Photo Zoom Modal ──────────────────────── */}
      {selectedPhoto && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setSelectedPhoto(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '460px', padding: '20px', background: 'var(--heritage-card)', border: '1px solid var(--heritage-line)', borderRadius: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <img src={selectedPhoto.media_url} alt={selectedPhoto.title}
              style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '12px', border: '8px solid #f5f0e8', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}
            />
            <div style={{ marginTop: '18px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--heritage-ink)', marginBottom: '8px', fontFamily: 'Georgia, serif' }}>
                {selectedPhoto.title}
              </h3>
              <span style={{
                display: 'inline-block',
                background: 'rgba(212,175,55,0.1)', color: '#a17a02',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: '9999px', padding: '4px 14px',
                fontSize: '0.78rem', fontWeight: 700, marginBottom: '14px'
              }}>
                {selectedPhoto.decade} · Year {selectedPhoto.year}
              </span>
              <p style={{ fontSize: '0.88rem', color: '#4b5563', lineHeight: 1.65, textAlign: 'justify', margin: '0 0 20px' }}>
                {selectedPhoto.description}
              </p>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{ width: '100%', padding: '11px', background: 'transparent', border: '1.5px solid var(--heritage-line)', borderRadius: '10px', color: 'var(--heritage-ink)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Close Archive
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
