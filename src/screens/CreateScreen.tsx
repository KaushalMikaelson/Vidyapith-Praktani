"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Image, Video, FileText, Send, ArrowLeft, Globe, Users, X, Upload, Link, Play, Eye } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface CreateScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  setActiveScreen: (screen: string) => void;
  onPublished?: () => void;
}

type PostType = 'image' | 'video' | 'article' | null;
type UploadMethod = 'device' | 'url';

// Convert a File to a base64 data URL
const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const CreateScreen: React.FC<CreateScreenProps> = ({ showToast, setActiveScreen, onPublished }) => {
  const { currentUser } = useAuth();
  const [selectedType, setSelectedType] = useState<PostType>(null);

  // Shared States
  const [content, setContent] = useState('');
  const [group, setGroup] = useState('grp-all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image States
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [imageUploadMethod, setImageUploadMethod] = useState<UploadMethod>('device');
  const [tagClassmates, setTagClassmates] = useState('');
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Video States
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDataUrl, setVideoDataUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [videoUploadMethod, setVideoUploadMethod] = useState<UploadMethod>('device');
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Article States
  const [articleTitle, setArticleTitle] = useState('');
  const [articleCategory, setArticleCategory] = useState('Nostalgia & School Stories');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  // ──────────────────────────── Image Handlers ────────────────────────────

  const handleAddImageUrl = () => {
    if (tempImageUrl.trim()) {
      setImageUrls(prev => [...prev, tempImageUrl.trim()]);
      setTempImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const processImageFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const validFiles = fileArr.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      showToast('Please select valid image files (JPG, PNG, GIF, WebP).', 'danger');
      return;
    }
    if (imageUrls.length + validFiles.length > 10) {
      showToast('You can add at most 10 images per post.', 'danger');
      return;
    }
    try {
      const dataUrls = await Promise.all(validFiles.map(fileToDataUrl));
      setImageUrls(prev => [...prev, ...dataUrls]);
      showToast(`${validFiles.length} image(s) added!`, 'success');
    } catch {
      showToast('Failed to read image file(s).', 'danger');
    }
  }, [imageUrls.length, showToast]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) await processImageFiles(e.target.files);
    e.target.value = '';
  };

  const handleImageDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
    if (e.dataTransfer.files) await processImageFiles(e.dataTransfer.files);
  };

  // ──────────────────────────── Video Handlers ────────────────────────────

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      showToast('Please select a valid video file (MP4, MOV, WebM, etc.).', 'danger');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast('Video file must be under 100 MB.', 'danger');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setVideoDataUrl(dataUrl);
      setVideoFileName(file.name);
      setVideoUrl('');
    } catch {
      showToast('Failed to read video file.', 'danger');
    }
    e.target.value = '';
  };

  const handleVideoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingVideo(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      showToast('Please drop a valid video file.', 'danger');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast('Video file must be under 100 MB.', 'danger');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setVideoDataUrl(dataUrl);
      setVideoFileName(file.name);
      setVideoUrl('');
    } catch {
      showToast('Failed to read video file.', 'danger');
    }
  };

  // ──────────────────────────── Publish ────────────────────────────

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    let finalPostType = 'text';
    let mediaUrls: string[] = [];
    const finalContent = content.trim();

    if (selectedType === 'image') {
      if (imageUrls.length === 0) {
        showToast('Please add at least one image.', 'danger');
        return;
      }
      if (!finalContent) {
        showToast('Please add a caption for your photo post.', 'danger');
        return;
      }
      finalPostType = 'photo';
      const nostalgicObj = {
        tagClassmates: tagClassmates.trim(),
        targetBatchYear: group === 'grp-all' ? '' : String(currentUser?.batch_year || ''),
        isReunionPost: false,
        nostalgicPhotoUrl: imageUrls[0],
        memoryLocation: ''
      };
      mediaUrls = [...imageUrls, 'Memory Photo', '', JSON.stringify(nostalgicObj)];
    } else if (selectedType === 'video') {
      const finalVideoSrc = videoUploadMethod === 'device' ? videoDataUrl : videoUrl.trim();
      if (!finalVideoSrc) {
        showToast('Please provide or upload a video.', 'danger');
        return;
      }
      if (!finalContent) {
        showToast('Please add a description for your video post.', 'danger');
        return;
      }
      finalPostType = 'video';
      const nostalgicObj = { tagClassmates: '', targetBatchYear: '', isReunionPost: false, nostalgicPhotoUrl: '', memoryLocation: '' };
      mediaUrls = [finalVideoSrc, JSON.stringify(nostalgicObj)];
    } else if (selectedType === 'article') {
      if (!articleTitle.trim()) {
        showToast('Please provide an article title.', 'danger');
        return;
      }
      if (!finalContent) {
        showToast('Article body content cannot be empty.', 'danger');
        return;
      }
      finalPostType = 'article';
      mediaUrls = [
        coverImageUrl.trim(),
        articleTitle.trim(),
        articleCategory,
        JSON.stringify({ tagClassmates: '', targetBatchYear: '', isReunionPost: false, nostalgicPhotoUrl: coverImageUrl.trim(), memoryLocation: '' })
      ];
    }

    setIsSubmitting(true);
    try {
      await apiFetch('/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: finalContent, mediaUrls, postType: finalPostType, groupId: group })
      });
      showToast('Post shared successfully with the alumni community!', 'success');
      onPublished?.();   // bump the feed refresh key BEFORE navigating
      setActiveScreen('feed');
    } catch (err: any) {
      showToast(err.message || 'Failed to create post.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    'Nostalgia & School Stories', 'Tech & Innovation', 'Monastery & Spirituality',
    'Career & Jobs Advice', 'Centenary Celebrations', 'General Reflections', 'Achievements'
  ];

  // ──────────────────────────── Reusable Upload Method Tabs ────────────────────────────

  const UploadMethodToggle = ({ method, setMethod }: { method: UploadMethod; setMethod: (m: UploadMethod) => void }) => (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      <button
        type="button"
        onClick={() => setMethod('device')}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
          background: method === 'device' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
          color: 'white', border: method === 'device' ? 'none' : '1px solid var(--border-color)',
          transition: 'all 0.2s'
        }}
      >
        <Upload size={14} /> From Device
      </button>
      <button
        type="button"
        onClick={() => setMethod('url')}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
          background: method === 'url' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
          color: 'white', border: method === 'url' ? 'none' : '1px solid var(--border-color)',
          transition: 'all 0.2s'
        }}
      >
        <Link size={14} /> Paste URL
      </button>
    </div>
  );

  // ──────────────────────────── Render ────────────────────────────

  return (
    <div className="heritage-page">
      <div className="heritage-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          {selectedType ? (
            <button type="button" onClick={() => setSelectedType(null)}
              className="text-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ArrowLeft size={16} /> Back to options
            </button>
          ) : (
            <button type="button" onClick={() => setActiveScreen('feed')}
              className="text-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ArrowLeft size={16} /> Back to feed
            </button>
          )}
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>🏵️</span> Create a Publication
          </h1>
          <p>Share updates, visual memories, videos or long-form insights with the Vidyapith family.</p>
        </div>
      </div>

      {/* ─── Type Selection Cards ─── */}
      {!selectedType && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginTop: '32px' }}>
          {[
            {
              type: 'image' as PostType,
              icon: <Image size={30} />,
              color: 'var(--primary-color)',
              bg: 'rgba(255, 122, 26, 0.1)',
              title: 'Share Images',
              desc: 'Upload photos from your device or paste image URLs — campus snapshots, batch photos, archives.'
            },
            {
              type: 'video' as PostType,
              icon: <Video size={30} />,
              color: 'var(--accent-gold)',
              bg: 'rgba(212, 175, 55, 0.1)',
              title: 'Share Video',
              desc: 'Upload a video from your device or embed YouTube/MP4 links of events, lectures, or reunions.'
            },
            {
              type: 'article' as PostType,
              icon: <FileText size={30} />,
              color: '#48bb78',
              bg: 'rgba(72, 187, 120, 0.1)',
              title: 'Write Article',
              desc: 'Compose long-form thought-pieces, technical guides, career advice, or memoirs.'
            }
          ].map(({ type, icon, color, bg, title, desc }) => (
            <div
              key={type}
              className="glass-panel create-type-card"
              onClick={() => setSelectedType(type)}
              style={{
                padding: '40px 30px', textAlign: 'center', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                borderRadius: '16px', transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                {icon}
              </div>
              <h3 style={{ color: 'white', fontSize: '1.2rem', margin: 0 }}>{title}</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Create Form ─── */}
      {selectedType && (
        <form onSubmit={handlePublish} className="glass-panel" style={{ padding: '32px', marginTop: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-gold)', fontWeight: 700 }}>
              Creating {selectedType === 'image' ? 'Image Post' : selectedType === 'video' ? 'Video Post' : 'Article'}
            </span>
          </div>

          {/* ─── Article Title & Category ─── */}
          {selectedType === 'article' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Article Title</label>
                <input type="text" value={articleTitle} onChange={e => setArticleTitle(e.target.value)}
                  placeholder="Enter a compelling title for your article..."
                  required
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Category</label>
                  <select value={articleCategory} onChange={e => setArticleCategory(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.95rem', cursor: 'pointer', boxSizing: 'border-box' }}
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Cover Image URL (Optional)</label>
                  <input type="text" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* ─── Image Upload Section ─── */}
          {selectedType === 'image' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Add Images</label>

              <UploadMethodToggle method={imageUploadMethod} setMethod={setImageUploadMethod} />

              {imageUploadMethod === 'device' ? (
                <>
                  {/* Drop Zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDraggingImage(true); }}
                    onDragLeave={() => setIsDraggingImage(false)}
                    onDrop={handleImageDrop}
                    onClick={() => imageInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDraggingImage ? 'var(--primary-color)' : 'var(--border-color)'}`,
                      borderRadius: '12px',
                      padding: '36px 24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: isDraggingImage ? 'rgba(255, 122, 26, 0.05)' : 'rgba(0,0,0,0.15)',
                      transition: 'all 0.2s',
                      marginBottom: '16px'
                    }}
                  >
                    <Upload size={32} style={{ color: 'var(--primary-color)', marginBottom: '10px' }} />
                    <p style={{ color: 'white', fontWeight: 600, margin: '0 0 4px' }}>Click to browse or drag & drop images</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>JPG, PNG, GIF, WebP · Up to 10 images</p>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageFileChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    value={tempImageUrl}
                    onChange={e => setTempImageUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddImageUrl(); } }}
                    placeholder="Paste image URL (e.g. https://images.unsplash.com/...)"
                    style={{ flexGrow: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.95rem' }}
                  />
                  <button type="button" onClick={handleAddImageUrl}
                    className="heritage-primary-btn"
                    style={{ padding: '0 20px', borderRadius: '8px', flexShrink: 0, cursor: 'pointer' }}
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Preview Grid */}
              {imageUrls.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px', marginTop: '12px' }}>
                  {imageUrls.map((url, index) => (
                    <div key={index} style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <img src={url} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => handleRemoveImage(index)}
                        style={{
                          position: 'absolute', top: '4px', right: '4px',
                          background: 'rgba(0,0,0,0.75)', border: 'none', borderRadius: '50%',
                          width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', cursor: 'pointer'
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Tag Classmates */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Tag Classmates (Optional)</label>
                <input type="text" value={tagClassmates} onChange={e => setTagClassmates(e.target.value)}
                  placeholder="e.g. Aurobindo, Shubhendu"
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* ─── Video Upload Section ─── */}
          {selectedType === 'video' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Video</label>

              <UploadMethodToggle method={videoUploadMethod} setMethod={m => { setVideoUploadMethod(m); setVideoDataUrl(null); setVideoUrl(''); setVideoFileName(''); }} />

              {videoUploadMethod === 'device' ? (
                <>
                  {!videoDataUrl ? (
                    <div
                      onDragOver={e => { e.preventDefault(); setIsDraggingVideo(true); }}
                      onDragLeave={() => setIsDraggingVideo(false)}
                      onDrop={handleVideoDrop}
                      onClick={() => videoInputRef.current?.click()}
                      style={{
                        border: `2px dashed ${isDraggingVideo ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                        borderRadius: '12px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                        background: isDraggingVideo ? 'rgba(212, 175, 55, 0.05)' : 'rgba(0,0,0,0.15)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Play size={32} style={{ color: 'var(--accent-gold)', marginBottom: '10px' }} />
                      <p style={{ color: 'white', fontWeight: 600, margin: '0 0 4px' }}>Click to browse or drag & drop a video</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>MP4, MOV, WebM · Max 100 MB</p>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileChange}
                        style={{ display: 'none' }}
                      />
                    </div>
                  ) : (
                    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)' }}>
                      <video
                        src={videoDataUrl}
                        controls
                        style={{ width: '100%', maxHeight: '280px', display: 'block', objectFit: 'contain' }}
                      />
                      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📹 {videoFileName}</span>
                        <button type="button" onClick={() => { setVideoDataUrl(null); setVideoFileName(''); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem' }}
                        >
                          <X size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                    placeholder="YouTube URL or direct MP4 URL..."
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />
                  {videoUrl.trim() && getYouTubeId(videoUrl) && (
                    <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${getYouTubeId(videoUrl)}`}
                        style={{ width: '100%', height: '220px', border: 'none' }}
                        title="YouTube Video Preview"
                        allowFullScreen
                      />
                    </div>
                  )}
                  {videoUrl.trim() && !getYouTubeId(videoUrl) && videoUrl.endsWith('.mp4') && (
                    <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <video src={videoUrl} controls style={{ width: '100%', maxHeight: '220px' }} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── Caption / Body ─── */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
              {selectedType === 'article' ? 'Article Body' : 'Caption / Description'}
            </label>
            <textarea
              rows={selectedType === 'article' ? 12 : 5}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={selectedType === 'article' ? 'Write your article body content here...' : "What's on your mind?..."}
              required
              style={{
                width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white',
                fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', lineHeight: '1.6', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* ─── Footer: Audience + Publish ─── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Publish to</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setGroup('grp-all')}
                  style={{
                    padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px',
                    background: group === 'grp-all' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                    color: 'white', border: group === 'grp-all' ? 'none' : '1px solid var(--border-color)',
                    borderRadius: '6px', cursor: 'pointer'
                  }}
                >
                  <Globe size={14} /> All Alumni
                </button>
                {currentUser?.batch_year && (
                  <button type="button" onClick={() => setGroup(`grp-${currentUser.batch_year}`)}
                    style={{
                      padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px',
                      background: group !== 'grp-all' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: 'white', border: group !== 'grp-all' ? 'none' : '1px solid var(--border-color)',
                      borderRadius: '6px', cursor: 'pointer'
                    }}
                  >
                    <Users size={14} /> Class of {currentUser.batch_year}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setSelectedType(null)}
                style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'white', background: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
              >
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="heritage-primary-btn"
                style={{ padding: '12px 28px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: isSubmitting ? 'wait' : 'pointer' }}
              >
                <Send size={16} />
                {isSubmitting ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
