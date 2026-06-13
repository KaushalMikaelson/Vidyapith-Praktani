"use client";

import React, { useState, useRef, useCallback } from 'react';
import {
  Image, Video, FileText, Send, ArrowLeft, Globe, Users,
  X, Upload, Link, Play, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { uploadMedia, uploadImages } from '../utils/upload';
import { useAuth } from '../context/AuthContext';

interface CreateScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  setActiveScreen: (screen: string) => void;
  onPublished?: () => void;
}

type PostType = 'image' | 'video' | 'article' | null;
type UploadMethod = 'device' | 'url';

// Per-image upload state
interface ImageItem {
  preview:   string;  // object URL or Cloudinary URL
  url:       string;  // final Cloudinary URL (empty while uploading)
  uploading: boolean;
  error:     string | null;
  file?:     File;    // cleared after upload
}

export const CreateScreen: React.FC<CreateScreenProps> = ({ showToast, setActiveScreen, onPublished }) => {
  const { currentUser } = useAuth();
  const [selectedType, setSelectedType] = useState<PostType>(null);

  // Shared
  const [content, setContent] = useState('');
  const [group, setGroup] = useState('grp-all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Image state ────────────────────────────────────────────────────────────
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [imageUploadMethod, setImageUploadMethod] = useState<UploadMethod>('device');
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [tagClassmates, setTagClassmates] = useState('');
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [aspectRatio, setAspectRatio] = useState<'original' | '1:1' | '4:5' | '4:3' | '16:9'>('original');
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');

  // ── Video state ────────────────────────────────────────────────────────────
  const [videoUrl, setVideoUrl] = useState('');             // URL-mode
  const [videoCloudUrl, setVideoCloudUrl] = useState('');   // Cloudinary URL after upload
  const [videoPreviewSrc, setVideoPreviewSrc] = useState(''); // local object URL for preview
  const [videoFileName, setVideoFileName] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [videoUploadMethod, setVideoUploadMethod] = useState<UploadMethod>('device');
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── Article state ──────────────────────────────────────────────────────────
  const [articleTitle, setArticleTitle] = useState('');
  const [articleCategory, setArticleCategory] = useState('Nostalgia & School Stories');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  const categories = [
    'Nostalgia & School Stories', 'Tech & Innovation', 'Monastery & Spirituality',
    'Career & Jobs Advice', 'Centenary Celebrations', 'General Reflections', 'Achievements'
  ];

  // ── Image handlers ─────────────────────────────────────────────────────────

  const processImageFiles = useCallback(async (files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      showToast('Please select valid image files (JPG, PNG, GIF, WebP).', 'danger');
      return;
    }
    if (imageItems.length + validFiles.length > 10) {
      showToast('You can add at most 10 images per post.', 'danger');
      return;
    }

    // Add placeholders immediately (with local preview)
    const placeholders: ImageItem[] = validFiles.map(file => ({
      preview:   URL.createObjectURL(file),
      url:       '',
      uploading: true,
      error:     null,
      file,
    }));
    setImageItems(prev => [...prev, ...placeholders]);

    // Upload each file and update its slot
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const slotIndex = imageItems.length + i;

      try {
        const result = await uploadMedia(file, 'posts/images');
        setImageItems(prev => {
          const updated = [...prev];
          updated[slotIndex] = {
            ...updated[slotIndex],
            url:       result.url,
            uploading: false,
            error:     null,
            file:      undefined,
          };
          return updated;
        });
      } catch (err: any) {
        setImageItems(prev => {
          const updated = [...prev];
          updated[slotIndex] = {
            ...updated[slotIndex],
            uploading: false,
            error:     err.message || 'Upload failed',
          };
          return updated;
        });
      }
    }
  }, [imageItems.length, showToast]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) await processImageFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleImageDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
    if (e.dataTransfer.files) await processImageFiles(Array.from(e.dataTransfer.files));
  };

  const handleAddImageUrl = () => {
    if (!tempImageUrl.trim()) return;
    setImageItems(prev => [...prev, {
      preview:   tempImageUrl.trim(),
      url:       tempImageUrl.trim(),
      uploading: false,
      error:     null,
    }]);
    setTempImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setImageItems(prev => {
      const item = prev[index];
      if (item.preview.startsWith('blob:')) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const retryImageUpload = async (index: number) => {
    const item = imageItems[index];
    if (!item.file) return;
    setImageItems(prev => {
      const u = [...prev];
      u[index] = { ...u[index], uploading: true, error: null };
      return u;
    });
    try {
      const result = await uploadMedia(item.file, 'posts/images');
      setImageItems(prev => {
        const u = [...prev];
        u[index] = { ...u[index], url: result.url, uploading: false, error: null, file: undefined };
        return u;
      });
    } catch (err: any) {
      setImageItems(prev => {
        const u = [...prev];
        u[index] = { ...u[index], uploading: false, error: err.message || 'Retry failed' };
        return u;
      });
    }
  };

  // ── Video handlers ─────────────────────────────────────────────────────────

  const processVideoFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      showToast('Please select a valid video file (MP4, MOV, WebM, etc.).', 'danger');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast('Video file must be under 100 MB.', 'danger');
      return;
    }
    // Show local preview immediately
    const localSrc = URL.createObjectURL(file);
    setVideoPreviewSrc(localSrc);
    setVideoFileName(file.name);
    setVideoCloudUrl('');
    setVideoUploadError(null);
    setVideoUploading(true);

    try {
      const result = await uploadMedia(file, 'posts/videos');
      setVideoCloudUrl(result.url);
      setVideoUploading(false);
      showToast('Video uploaded successfully!', 'success');
    } catch (err: any) {
      setVideoUploadError(err.message || 'Upload failed');
      setVideoUploading(false);
    }
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processVideoFile(file);
    e.target.value = '';
  };

  const handleVideoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingVideo(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processVideoFile(file);
  };

  const clearVideo = () => {
    if (videoPreviewSrc.startsWith('blob:')) URL.revokeObjectURL(videoPreviewSrc);
    setVideoPreviewSrc('');
    setVideoCloudUrl('');
    setVideoFileName('');
    setVideoUploadError(null);
    setVideoUploading(false);
  };

  // ── YouTube helper ─────────────────────────────────────────────────────────

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // ── Publish ────────────────────────────────────────────────────────────────

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    let finalPostType = 'text';
    let mediaUrls: string[] = [];
    const finalContent = content.trim();

    if (selectedType === 'image') {
      const readyUrls = imageItems.filter(i => i.url && !i.uploading && !i.error).map(i => i.url);
      if (readyUrls.length === 0) {
        showToast('Please wait for images to finish uploading, or fix any errors.', 'danger');
        return;
      }
      if (!finalContent) {
        showToast('Please add a caption for your photo post.', 'danger');
        return;
      }
      const stillUploading = imageItems.some(i => i.uploading);
      if (stillUploading) {
        showToast('Some images are still uploading — please wait.', 'info');
        return;
      }
      finalPostType = 'photo';
      const meta = {
        tagClassmates:    tagClassmates.trim(),
        targetBatchYear:  group === 'grp-all' ? '' : String(currentUser?.batch_year || ''),
        isReunionPost:    false,
        nostalgicPhotoUrl: readyUrls[0],
        memoryLocation:   '',
        imageLayout: {
          aspectRatio,
          objectFit: fitMode
        }
      };
      mediaUrls = [...readyUrls, 'Memory Photo', '', JSON.stringify(meta)];
    } else if (selectedType === 'video') {
      const finalVideoSrc = videoUploadMethod === 'device' ? videoCloudUrl : videoUrl.trim();
      if (!finalVideoSrc) {
        showToast(videoUploading ? 'Video is still uploading — please wait.' : 'Please provide or upload a video.', 'danger');
        return;
      }
      if (videoUploading) {
        showToast('Video is still uploading — please wait.', 'info');
        return;
      }
      if (!finalContent) {
        showToast('Please add a description for your video post.', 'danger');
        return;
      }
      finalPostType = 'video';
      const meta = { tagClassmates: '', targetBatchYear: '', isReunionPost: false, nostalgicPhotoUrl: '', memoryLocation: '' };
      mediaUrls = [finalVideoSrc, JSON.stringify(meta)];
    } else if (selectedType === 'article') {
      if (!articleTitle.trim()) { showToast('Please provide an article title.', 'danger'); return; }
      if (!finalContent) { showToast('Article body cannot be empty.', 'danger'); return; }
      finalPostType = 'article';
      mediaUrls = [
        coverImageUrl.trim(), articleTitle.trim(), articleCategory,
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
      showToast('Post shared successfully with the alumni community! 🎉', 'success');
      onPublished?.();
      setActiveScreen('feed');
    } catch (err: any) {
      showToast(err.message || 'Failed to create post.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Reusable UI ────────────────────────────────────────────────────────────

  const UploadMethodToggle = ({
    method, setMethod, onDeviceClick
  }: { method: UploadMethod; setMethod: (m: UploadMethod) => void; onDeviceClick?: () => void }) => (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      {(['device', 'url'] as UploadMethod[]).map(m => (
        <button key={m} type="button" onClick={() => {
          setMethod(m);
          if (m === 'device' && onDeviceClick) {
            onDeviceClick();
          }
        }} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem',
          fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          background: method === m ? 'var(--primary-color)' : '#f0f0f0',
          color: method === m ? '#fff' : 'var(--heritage-ink, #161719)',
          border: method === m ? 'none' : '1px solid var(--heritage-line, #e7e7e7)',
        }}>
          {m === 'device' ? <Upload size={14} /> : <Link size={14} />}
          {m === 'device' ? 'From Device' : 'Paste URL'}
        </button>
      ))}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="heritage-page">
      {/* Header */}
      <div className="heritage-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <button type="button"
            onClick={() => selectedType ? setSelectedType(null) : setActiveScreen('feed')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: selectedType ? 'var(--primary-color)' : 'var(--text-muted)', marginBottom: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} /> {selectedType ? 'Back to options' : 'Back to feed'}
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>🏵️</span> Create a Publication
          </h1>
          <p>Share your story with the Vidyapith family</p>
        </div>
      </div>

      {/* ── Type Selection ── */}
      {!selectedType && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginTop: '32px' }}>
            {[
              { type: 'image' as PostType, icon: <Image size={28} />, gradient: 'linear-gradient(135deg, #f857a6, #ff5858)', title: 'Share Images', desc: 'Upload photos from your device or paste URLs — campus snapshots, batch photos, archives.', btnLabel: 'Add Images', btnIcon: <Upload size={14} /> },
              { type: 'video' as PostType, icon: <Video size={28} />, gradient: 'linear-gradient(135deg, #a855f7, #6366f1)', title: 'Share Video', desc: 'Upload an MP4 from your device or embed a YouTube / direct MP4 link.', btnLabel: 'Add Video', btnIcon: <Play size={14} /> },
              { type: 'article' as PostType, icon: <FileText size={28} />, gradient: 'linear-gradient(135deg, #f857a6, #c026d3)', title: 'Write Article', desc: 'Compose long-form thought-pieces, guides, career advice, or memoirs.', btnLabel: 'Start Writing', btnIcon: <FileText size={14} /> },
            ].map(({ type, icon, gradient, title, desc, btnLabel, btnIcon }) => (
              <div key={type} className="create-type-card" onClick={() => setSelectedType(type)}
                style={{
                  background: 'var(--heritage-card, #ffffff)',
                  borderRadius: '16px',
                  padding: '36px 28px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '14px',
                  border: '1px solid var(--heritage-line, #e7e7e7)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  background: gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                }}>{icon}</div>
                <h3 style={{ color: 'var(--heritage-ink, #161719)', fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>{title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--heritage-muted, #77797d)', lineHeight: '1.6', margin: 0 }}>{desc}</p>
                <button type="button" style={{
                  background: gradient,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 24px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '4px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                  transition: 'transform 0.15s',
                }}>{btnIcon} {btnLabel}</button>
              </div>
            ))}
          </div>

          {/* Recent Drafts Section */}
          <div style={{
            marginTop: '40px',
            background: 'var(--heritage-card, #ffffff)',
            borderRadius: '16px',
            padding: '24px 28px',
            border: '1px solid var(--heritage-line, #e7e7e7)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '1rem'
                }}>📂</span>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--heritage-ink, #161719)', display: 'block' }}>Recent Drafts</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--heritage-muted, #77797d)' }}>Pick up where you left off</span>
                </div>
              </div>
              <button type="button" onClick={() => showToast('Drafts feature coming soon!', 'info')} style={{
                background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
              }}>View all ›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {[
                { title: 'Batch of 2015 Reunion Photos', meta: 'Edited 2 hours ago · 24 images', gradient: 'linear-gradient(135deg, #f857a6, #ff5858)', emoji: '📸' },
                { title: 'My Journey After Graduation', meta: 'Edited yesterday · Draft', gradient: 'linear-gradient(135deg, #a855f7, #c026d3)', emoji: '📝' },
              ].map(draft => (
                <div key={draft.title} onClick={() => showToast('Opening draft...', 'info')} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  borderRadius: '12px', border: '1px solid var(--heritage-line, #e7e7e7)',
                  cursor: 'pointer', transition: 'background 0.15s',
                  background: 'rgba(0,0,0,0.01)'
                }}>
                  <span style={{
                    width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                    background: draft.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '1.1rem'
                  }}>{draft.emoji}</span>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--heritage-ink, #161719)', display: 'block' }}>{draft.title}</strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--heritage-muted, #77797d)' }}>{draft.meta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Create Form ── */}
      {selectedType && (
        <form onSubmit={handlePublish} style={{ padding: '32px', marginTop: '24px', borderRadius: '16px', background: 'var(--heritage-card, #ffffff)', border: '1px solid var(--heritage-line, #e7e7e7)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary-color)', fontWeight: 700, marginBottom: '24px' }}>
            Creating {selectedType === 'image' ? 'Image Post' : selectedType === 'video' ? 'Video Post' : 'Article'}
          </div>

          {/* Article: title + category */}
          {selectedType === 'article' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--heritage-ink, #161719)', marginBottom: '8px' }}>Article Title</label>
                <input type="text" value={articleTitle} onChange={e => setArticleTitle(e.target.value)} required
                  placeholder="Enter a compelling title..."
                  style={{ width: '100%', padding: '12px 16px', background: '#f8f8f8', border: '1px solid var(--heritage-line, #e7e7e7)', borderRadius: '8px', color: 'var(--heritage-ink, #161719)', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--heritage-ink, #161719)', marginBottom: '8px' }}>Category</label>
                  <select value={articleCategory} onChange={e => setArticleCategory(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', background: '#f8f8f8', border: '1px solid var(--heritage-line, #e7e7e7)', borderRadius: '8px', color: 'var(--heritage-ink, #161719)', fontSize: '0.95rem', cursor: 'pointer', boxSizing: 'border-box' }}
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--heritage-ink, #161719)', marginBottom: '8px' }}>Cover Image URL (Optional)</label>
                  <input type="text" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '12px 16px', background: '#f8f8f8', border: '1px solid var(--heritage-line, #e7e7e7)', borderRadius: '8px', color: 'var(--heritage-ink, #161719)', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Images ── */}
          {selectedType === 'image' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--heritage-ink, #161719)', marginBottom: '12px' }}>Add Images</label>
              <UploadMethodToggle
                method={imageUploadMethod}
                setMethod={setImageUploadMethod}
                onDeviceClick={() => imageInputRef.current?.click()}
              />
              <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageFileChange} style={{ display: 'none' }} />

              {imageUploadMethod === 'device' ? (
                <div
                  onDragOver={e => { e.preventDefault(); setIsDraggingImage(true); }}
                  onDragLeave={() => setIsDraggingImage(false)}
                  onDrop={handleImageDrop}
                  onClick={() => imageInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDraggingImage ? 'var(--primary-color)' : 'var(--heritage-line, #e7e7e7)'}`,
                    borderRadius: '12px', padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
                    background: isDraggingImage ? 'rgba(255,122,26,0.05)' : '#f8f8f8', transition: 'all 0.2s', marginBottom: '16px'
                  }}
                >
                  <Upload size={28} style={{ color: 'var(--primary-color)', marginBottom: '8px' }} />
                  <p style={{ color: 'var(--heritage-ink, #161719)', fontWeight: 600, margin: '0 0 4px' }}>Click to browse or drag & drop</p>
                  <p style={{ color: 'var(--heritage-muted, #77797d)', fontSize: '0.82rem', margin: 0 }}>JPG, PNG, GIF, WebP · Max 10 images · Each uploaded to Cloudinary CDN</p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <input type="text" value={tempImageUrl} onChange={e => setTempImageUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddImageUrl(); } }}
                    placeholder="Paste image URL..."
                    style={{ flexGrow: 1, padding: '12px 16px', background: '#f8f8f8', border: '1px solid var(--heritage-line, #e7e7e7)', borderRadius: '8px', color: 'var(--heritage-ink, #161719)', fontSize: '0.95rem' }}
                  />
                  <button type="button" onClick={handleAddImageUrl} className="heritage-primary-btn"
                    style={{ padding: '0 20px', borderRadius: '8px', flexShrink: 0, cursor: 'pointer' }}
                  >Add</button>
                </div>
              )}

              {/* Image Preview Grid */}
              {imageItems.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                  {imageItems.map((item, idx) => (
                    <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${item.error ? '#fc8181' : 'var(--heritage-line, #e7e7e7)'}`, background: '#f0f0f0' }}>
                      <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: item.uploading ? 0.4 : 1, transition: 'opacity 0.3s' }} />

                      {/* Uploading spinner */}
                      {item.uploading && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                          <Loader2 size={20} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                          <span style={{ fontSize: '0.7rem', color: 'white', marginTop: '4px' }}>Uploading…</span>
                        </div>
                      )}

                      {/* Upload success */}
                      {!item.uploading && !item.error && item.url && (
                        <div style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(72,187,120,0.85)', borderRadius: '50%', padding: '2px' }}>
                          <CheckCircle2 size={12} style={{ color: 'white' }} />
                        </div>
                      )}

                      {/* Upload error */}
                      {item.error && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: '4px' }}>
                          <AlertCircle size={16} style={{ color: '#fc8181' }} />
                          <button type="button" onClick={() => retryImageUpload(idx)}
                            style={{ fontSize: '0.65rem', color: 'white', background: 'var(--primary-color)', border: 'none', borderRadius: '4px', padding: '2px 6px', marginTop: '4px', cursor: 'pointer' }}
                          >Retry</button>
                        </div>
                      )}

                      {/* Remove button */}
                      {!item.uploading && (
                        <button type="button" onClick={() => handleRemoveImage(idx)}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.75)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
                        ><X size={12} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Image Layout Settings */}
              {imageItems.length > 0 && (
                <div style={{
                  background: '#fafafa',
                  border: '1px solid var(--heritage-line, #e7e7e7)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-color)', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.05em' }}>
                    🏵️ Image Layout & Fit Settings
                  </div>
                  
                  {/* Aspect Ratio */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--heritage-muted, #77797d)', marginBottom: '8px', fontWeight: 600 }}>Aspect Ratio</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'original', label: 'Original / Auto' },
                        { id: '1:1', label: 'Square (1:1)' },
                        { id: '4:5', label: 'Portrait (4:5)' },
                        { id: '4:3', label: 'Landscape (4:3)' },
                        { id: '16:9', label: 'Cinema (16:9)' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setAspectRatio(opt.id as any)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: aspectRatio === opt.id ? 'var(--primary-color)' : '#f0f0f0',
                            color: aspectRatio === opt.id ? '#fff' : 'var(--heritage-ink, #161719)',
                            border: aspectRatio === opt.id ? 'none' : '1px solid var(--heritage-line, #e7e7e7)',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fit Mode */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--heritage-muted, #77797d)', marginBottom: '8px', fontWeight: 600 }}>Fit Mode</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { id: 'contain', label: 'Fit (Show Whole Image)' },
                        { id: 'cover', label: 'Crop (Fill Area)' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFitMode(opt.id as any)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: fitMode === opt.id ? 'var(--primary-color)' : '#f0f0f0',
                            color: fitMode === opt.id ? '#fff' : 'var(--heritage-ink, #161719)',
                            border: fitMode === opt.id ? 'none' : '1px solid var(--heritage-line, #e7e7e7)',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Preview of first image */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--heritage-muted, #77797d)', marginBottom: '8px', fontWeight: 600 }}>Live Feed Preview</label>
                    <div style={{
                      width: '100%',
                      maxWidth: '400px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid var(--heritage-line, #e7e7e7)',
                      background: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img
                        src={imageItems[0]?.preview}
                        alt="Preview"
                        style={{
                          width: '100%',
                          aspectRatio: aspectRatio === 'original' ? 'auto' : (aspectRatio === '1:1' ? '1' : aspectRatio === '4:3' ? '4/3' : aspectRatio === '16:9' ? '16/9' : '4/5'),
                          objectFit: fitMode,
                          maxHeight: '300px',
                          display: 'block'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--heritage-muted, #77797d)', display: 'block', marginTop: '6px' }}>
                      {fitMode === 'contain' ? '💡 Full image will be displayed with letterbox bars.' : '⚠️ Portions of your image may be cropped to fit the aspect ratio.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Tag classmates */}
              <div style={{ marginTop: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--heritage-ink, #161719)', marginBottom: '8px' }}>Tag Classmates (Optional)</label>
                <input type="text" value={tagClassmates} onChange={e => setTagClassmates(e.target.value)} placeholder="e.g. Aurobindo, Shubhendu"
                  style={{ width: '100%', padding: '12px 16px', background: '#f8f8f8', border: '1px solid var(--heritage-line, #e7e7e7)', borderRadius: '8px', color: 'var(--heritage-ink, #161719)', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* ── Video ── */}
          {selectedType === 'video' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--heritage-ink, #161719)', marginBottom: '12px' }}>Video</label>
              <UploadMethodToggle
                method={videoUploadMethod}
                setMethod={m => { setVideoUploadMethod(m); clearVideo(); setVideoUrl(''); }}
                onDeviceClick={() => videoInputRef.current?.click()}
              />
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoFileChange} style={{ display: 'none' }} />

              {videoUploadMethod === 'device' ? (
                !videoPreviewSrc ? (
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDraggingVideo(true); }}
                    onDragLeave={() => setIsDraggingVideo(false)}
                    onDrop={handleVideoDrop}
                    onClick={() => videoInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDraggingVideo ? 'var(--primary-color)' : 'var(--heritage-line, #e7e7e7)'}`,
                      borderRadius: '12px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                      background: isDraggingVideo ? 'rgba(255,122,26,0.05)' : '#f8f8f8', transition: 'all 0.2s'
                    }}
                  >
                    <Play size={32} style={{ color: 'var(--primary-color)', marginBottom: '10px' }} />
                    <p style={{ color: 'var(--heritage-ink, #161719)', fontWeight: 600, margin: '0 0 4px' }}>Click to browse or drag & drop a video</p>
                    <p style={{ color: 'var(--heritage-muted, #77797d)', fontSize: '0.82rem', margin: 0 }}>MP4, MOV, WebM · Max 100 MB · Uploaded to Cloudinary CDN</p>
                  </div>
                ) : (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--heritage-line, #e7e7e7)', background: '#f8f8f8' }}>
                    <video src={videoPreviewSrc} controls style={{ width: '100%', maxHeight: '280px', display: 'block', objectFit: 'contain' }} />
                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {videoUploading && <Loader2 size={16} style={{ color: 'var(--primary-color)', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                        {!videoUploading && videoCloudUrl && <CheckCircle2 size={16} style={{ color: '#48bb78', flexShrink: 0 }} />}
                        {!videoUploading && videoUploadError && <AlertCircle size={16} style={{ color: '#fc8181', flexShrink: 0 }} />}
                        <span style={{ fontSize: '0.82rem', color: 'var(--heritage-muted, #77797d)' }}>
                          {videoUploading ? 'Uploading to Cloudinary…' : videoUploadError ? `Error: ${videoUploadError}` : `✅ Ready · ${videoFileName}`}
                        </span>
                      </div>
                      <button type="button" onClick={clearVideo}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--heritage-muted, #77797d)', cursor: 'pointer', fontSize: '0.82rem' }}
                      ><X size={14} /> Remove</button>
                    </div>
                  </div>
                )
              ) : (
                <>
                  <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                    placeholder="YouTube URL or direct MP4 URL..."
                    style={{ width: '100%', padding: '12px 16px', background: '#f8f8f8', border: '1px solid var(--heritage-line, #e7e7e7)', borderRadius: '8px', color: 'var(--heritage-ink, #161719)', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />
                  {videoUrl.trim() && getYouTubeId(videoUrl) && (
                    <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--heritage-line, #e7e7e7)' }}>
                      <iframe src={`https://www.youtube.com/embed/${getYouTubeId(videoUrl)}`} style={{ width: '100%', height: '220px', border: 'none' }} title="YouTube Preview" allowFullScreen />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Caption / Body */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--heritage-ink, #161719)', marginBottom: '8px' }}>
              {selectedType === 'article' ? 'Article Body' : 'Caption / Description'}
            </label>
            <textarea rows={selectedType === 'article' ? 12 : 5} value={content} onChange={e => setContent(e.target.value)}
              placeholder={selectedType === 'article' ? 'Write your article body here...' : "What's on your mind?..."}
              required
              style={{ width: '100%', padding: '14px 16px', background: '#f8f8f8', border: '1px solid var(--heritage-line, #e7e7e7)', borderRadius: '8px', color: 'var(--heritage-ink, #161719)', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', lineHeight: '1.6', boxSizing: 'border-box' }}
            />
          </div>

          {/* Footer: Audience + Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--heritage-line, #e7e7e7)', paddingTop: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--heritage-muted, #77797d)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Publish to</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setGroup('grp-all')}
                  style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', background: group === 'grp-all' ? 'var(--primary-color)' : '#f0f0f0', color: group === 'grp-all' ? '#fff' : 'var(--heritage-ink, #161719)', border: group === 'grp-all' ? 'none' : '1px solid var(--heritage-line, #e7e7e7)', borderRadius: '6px', cursor: 'pointer' }}
                ><Globe size={14} /> All Alumni</button>
                {currentUser?.batch_year && (
                  <button type="button" onClick={() => setGroup(`grp-${currentUser.batch_year}`)}
                    style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', background: group !== 'grp-all' ? 'var(--primary-color)' : '#f0f0f0', color: group !== 'grp-all' ? '#fff' : 'var(--heritage-ink, #161719)', border: group !== 'grp-all' ? 'none' : '1px solid var(--heritage-line, #e7e7e7)', borderRadius: '6px', cursor: 'pointer' }}
                  ><Users size={14} /> Class of {currentUser.batch_year}</button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setSelectedType(null)}
                style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--heritage-line, #e7e7e7)', color: 'var(--heritage-ink, #161719)', background: '#fff', cursor: 'pointer', fontSize: '0.95rem' }}
              >Cancel</button>
              <button type="submit" disabled={isSubmitting} className="heritage-primary-btn"
                style={{ padding: '12px 28px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: isSubmitting ? 'wait' : 'pointer', opacity: isSubmitting ? 0.8 : 1 }}
              >
                {isSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                {isSubmitting ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
