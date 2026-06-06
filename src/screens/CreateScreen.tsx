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
        memoryLocation:   ''
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
    method, setMethod
  }: { method: UploadMethod; setMethod: (m: UploadMethod) => void }) => (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      {(['device', 'url'] as UploadMethod[]).map(m => (
        <button key={m} type="button" onClick={() => setMethod(m)} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem',
          fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          background: method === m ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
          color: 'white', border: method === m ? 'none' : '1px solid var(--border-color)',
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
          <p>Share updates, visual memories, videos or long-form insights with the Vidyapith family.</p>
        </div>
      </div>

      {/* ── Type Selection ── */}
      {!selectedType && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginTop: '32px' }}>
          {[
            { type: 'image' as PostType, icon: <Image size={30} />, color: 'var(--primary-color)', bg: 'rgba(255,122,26,0.1)', title: 'Share Images', desc: 'Upload photos from your device or paste URLs — campus snapshots, batch photos, archives.' },
            { type: 'video' as PostType, icon: <Video size={30} />, color: 'var(--accent-gold)',    bg: 'rgba(212,175,55,0.1)', title: 'Share Video',  desc: 'Upload an MP4 from your device or embed a YouTube / direct MP4 link.' },
            { type: 'article' as PostType, icon: <FileText size={30} />, color: '#48bb78',          bg: 'rgba(72,187,120,0.1)', title: 'Write Article', desc: 'Compose long-form thought-pieces, guides, career advice, or memoirs.' },
          ].map(({ type, icon, color, bg, title, desc }) => (
            <div key={type} className="glass-panel create-type-card" onClick={() => setSelectedType(type)}
              style={{ padding: '40px 30px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', borderRadius: '16px', transition: 'transform 0.2s, box-shadow 0.2s' }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
              <h3 style={{ color: 'white', fontSize: '1.2rem', margin: 0 }}>{title}</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Form ── */}
      {selectedType && (
        <form onSubmit={handlePublish} className="glass-panel" style={{ padding: '32px', marginTop: '24px', borderRadius: '16px' }}>

          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-gold)', fontWeight: 700, marginBottom: '24px' }}>
            Creating {selectedType === 'image' ? 'Image Post' : selectedType === 'video' ? 'Video Post' : 'Article'}
          </div>

          {/* Article: title + category */}
          {selectedType === 'article' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Article Title</label>
                <input type="text" value={articleTitle} onChange={e => setArticleTitle(e.target.value)} required
                  placeholder="Enter a compelling title..."
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
                    placeholder="https://..."
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Images ── */}
          {selectedType === 'image' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Add Images</label>
              <UploadMethodToggle method={imageUploadMethod} setMethod={setImageUploadMethod} />

              {imageUploadMethod === 'device' ? (
                <div
                  onDragOver={e => { e.preventDefault(); setIsDraggingImage(true); }}
                  onDragLeave={() => setIsDraggingImage(false)}
                  onDrop={handleImageDrop}
                  onClick={() => imageInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDraggingImage ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    borderRadius: '12px', padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
                    background: isDraggingImage ? 'rgba(255,122,26,0.05)' : 'rgba(0,0,0,0.15)', transition: 'all 0.2s', marginBottom: '16px'
                  }}
                >
                  <Upload size={28} style={{ color: 'var(--primary-color)', marginBottom: '8px' }} />
                  <p style={{ color: 'white', fontWeight: 600, margin: '0 0 4px' }}>Click to browse or drag & drop</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>JPG, PNG, GIF, WebP · Max 10 images · Each uploaded to Cloudinary CDN</p>
                  <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageFileChange} style={{ display: 'none' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <input type="text" value={tempImageUrl} onChange={e => setTempImageUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddImageUrl(); } }}
                    placeholder="Paste image URL..."
                    style={{ flexGrow: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.95rem' }}
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
                    <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${item.error ? '#fc8181' : 'var(--border-color)'}`, background: 'rgba(0,0,0,0.3)' }}>
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

              {/* Tag classmates */}
              <div style={{ marginTop: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Tag Classmates (Optional)</label>
                <input type="text" value={tagClassmates} onChange={e => setTagClassmates(e.target.value)} placeholder="e.g. Aurobindo, Shubhendu"
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* ── Video ── */}
          {selectedType === 'video' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Video</label>
              <UploadMethodToggle method={videoUploadMethod} setMethod={m => { setVideoUploadMethod(m); clearVideo(); setVideoUrl(''); }} />

              {videoUploadMethod === 'device' ? (
                !videoPreviewSrc ? (
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDraggingVideo(true); }}
                    onDragLeave={() => setIsDraggingVideo(false)}
                    onDrop={handleVideoDrop}
                    onClick={() => videoInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDraggingVideo ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                      borderRadius: '12px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                      background: isDraggingVideo ? 'rgba(212,175,55,0.05)' : 'rgba(0,0,0,0.15)', transition: 'all 0.2s'
                    }}
                  >
                    <Play size={32} style={{ color: 'var(--accent-gold)', marginBottom: '10px' }} />
                    <p style={{ color: 'white', fontWeight: 600, margin: '0 0 4px' }}>Click to browse or drag & drop a video</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>MP4, MOV, WebM · Max 100 MB · Uploaded to Cloudinary CDN</p>
                    <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoFileChange} style={{ display: 'none' }} />
                  </div>
                ) : (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)' }}>
                    <video src={videoPreviewSrc} controls style={{ width: '100%', maxHeight: '280px', display: 'block', objectFit: 'contain' }} />
                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {videoUploading && <Loader2 size={16} style={{ color: 'var(--accent-gold)', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                        {!videoUploading && videoCloudUrl && <CheckCircle2 size={16} style={{ color: '#48bb78', flexShrink: 0 }} />}
                        {!videoUploading && videoUploadError && <AlertCircle size={16} style={{ color: '#fc8181', flexShrink: 0 }} />}
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {videoUploading ? 'Uploading to Cloudinary…' : videoUploadError ? `Error: ${videoUploadError}` : `✅ Ready · ${videoFileName}`}
                        </span>
                      </div>
                      <button type="button" onClick={clearVideo}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem' }}
                      ><X size={14} /> Remove</button>
                    </div>
                  </div>
                )
              ) : (
                <>
                  <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                    placeholder="YouTube URL or direct MP4 URL..."
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />
                  {videoUrl.trim() && getYouTubeId(videoUrl) && (
                    <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <iframe src={`https://www.youtube.com/embed/${getYouTubeId(videoUrl)}`} style={{ width: '100%', height: '220px', border: 'none' }} title="YouTube Preview" allowFullScreen />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Caption / Body */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
              {selectedType === 'article' ? 'Article Body' : 'Caption / Description'}
            </label>
            <textarea rows={selectedType === 'article' ? 12 : 5} value={content} onChange={e => setContent(e.target.value)}
              placeholder={selectedType === 'article' ? 'Write your article body here...' : "What's on your mind?..."}
              required
              style={{ width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', lineHeight: '1.6', boxSizing: 'border-box' }}
            />
          </div>

          {/* Footer: Audience + Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Publish to</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setGroup('grp-all')}
                  style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', background: group === 'grp-all' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)', color: 'white', border: group === 'grp-all' ? 'none' : '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                ><Globe size={14} /> All Alumni</button>
                {currentUser?.batch_year && (
                  <button type="button" onClick={() => setGroup(`grp-${currentUser.batch_year}`)}
                    style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', background: group !== 'grp-all' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)', color: 'white', border: group !== 'grp-all' ? 'none' : '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                  ><Users size={14} /> Class of {currentUser.batch_year}</button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setSelectedType(null)}
                style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'white', background: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
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
