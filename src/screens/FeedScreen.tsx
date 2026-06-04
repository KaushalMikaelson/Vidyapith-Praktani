"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { RKMV_DB, Post, Comment } from '../database/database';
import { Send, Image, MessageSquare, ThumbsUp, Pin } from 'lucide-react';

interface FeedScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({ showToast, onViewProfile }) => {
  const { currentUser } = useAuth();
  const [activeGroupId, setActiveGroupId] = useState('grp-all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostPhotoUrl, setNewPostPhotoUrl] = useState('');
  const [showPhotoField, setShowPhotoField] = useState(false);
  const [postToGroup, setPostToGroup] = useState('grp-all');
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

  const loadFeed = () => {
    const feedPosts = RKMV_DB.getPosts(activeGroupId);
    setPosts(feedPosts);
  };

  useEffect(() => {
    loadFeed();
  }, [activeGroupId]);

  if (!currentUser) return null;

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) {
      showToast("Post content cannot be empty!", "danger");
      return;
    }

    const newPost: Post = {
      id: 'post-' + Math.random().toString(36).substr(2, 9),
      author_id: currentUser.id,
      group_id: postToGroup,
      content: newPostText.trim(),
      media_urls: newPostPhotoUrl.trim() ? [newPostPhotoUrl.trim()] : [],
      post_type: newPostPhotoUrl.trim() ? 'photo' : 'text',
      is_pinned: false,
      likes: [],
      created_at: new Date().toISOString()
    };

    RKMV_DB.addPost(newPost);
    showToast("Post published successfully!", "success");

    setNewPostText('');
    setNewPostPhotoUrl('');
    setShowPhotoField(false);
    loadFeed();
  };

  const handleLike = (postId: string) => {
    RKMV_DB.toggleLikePost(postId, currentUser.id);
    loadFeed();
  };

  const handleCommentChange = (postId: string, val: string) => {
    setCommentInputs(prev => ({ ...prev, [postId]: val }));
  };

  const handleCreateComment = (postId: string, e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const commentText = commentInputs[postId];
    if (!commentText || !commentText.trim()) return;

    const newComment: Comment = {
      id: 'comm-' + Math.random().toString(36).substr(2, 9),
      post_id: postId,
      author_id: currentUser.id,
      content: commentText.trim(),
      created_at: new Date().toISOString()
    };

    RKMV_DB.addComment(newComment);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    loadFeed();
  };

  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="forums-layout">
      {/* Main Forums Feed */}
      <div className="forums-feed-column">
        {/* Post Composer */}
        <div className="glass-panel post-composer" style={{ padding: '24px' }}>
          <div className="composer-avatar-box">
            <img src={currentUser.profile_photo} alt="Avatar" className="composer-avatar" />
            <textarea 
              className="composer-text" 
              placeholder="Share a Vidyapith memory, batch update, or spiritual reflection..."
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
            />
          </div>
          
          {showPhotoField && (
            <div className="form-group" style={{ padding: '0 16px 14px 58px', marginTop: '10px' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Attach Image URL</label>
              <input 
                type="text" 
                placeholder="Paste an image URL (Unsplash, Imgur, etc.)" 
                value={newPostPhotoUrl}
                onChange={(e) => setNewPostPhotoUrl(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', 
                  border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', color: 'white'
                }}
              />
            </div>
          )}

          <div className="composer-actions">
            <button className="composer-media-btn" onClick={() => setShowPhotoField(!showPhotoField)}>
              <Image size={18} />
              <span>Add Photo</span>
            </button>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select 
                value={postToGroup}
                onChange={(e) => setPostToGroup(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--border-radius-sm)', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '0.8rem'
                }}
              >
                <option value="grp-all">General Forums</option>
                <option value={`grp-${currentUser.batch_year}`}>Class of {currentUser.batch_year} Group</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={handleCreatePost}>
                <Send size={14} />
                <span>Post</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feed Posts */}
        <div className="posts-feed">
          {posts.length === 0 ? (
            <div className="glass-panel loading-state" style={{ minHeight: '200px' }}>
              <MessageSquare size={44} style={{ color: 'var(--text-muted)' }} />
              <p>No conversations started in this group yet. Be the first to share something!</p>
            </div>
          ) : (
            posts.map(post => {
              const author = RKMV_DB.getUserById(post.author_id);
              if (!author) return null;
              
              const likesCount = (post.likes || []).length;
              const isLiked = (post.likes || []).includes(currentUser.id);
              const comments = RKMV_DB.getComments(post.id);

              return (
                <div key={post.id} className="glass-panel post-card">
                  <div className="post-header">
                    <div className="post-author-info">
                      <img 
                        src={author.profile_photo} 
                        alt={author.full_name} 
                        className="post-author-avatar" 
                        onClick={() => onViewProfile(author.id)}
                      />
                      <div className="author-meta">
                        <span className="author-name" onClick={() => onViewProfile(author.id)}>{author.full_name}</span>
                        <span className="author-subline">
                          {author.role === 'admin' ? 'Administrative Committee' : `Batch of ${author.batch_year}`} • {formatTimeAgo(post.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    {post.is_pinned && (
                      <div className="post-pin-btn" title="Pinned by Admin">
                        <Pin size={16} />
                      </div>
                    )}
                  </div>

                  <div className="post-content" style={{ fontSize: '0.95rem', margin: '14px 0', whiteSpace: 'pre-wrap' }}>
                    {post.content}
                  </div>

                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className="post-media-box" style={{ borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', marginBottom: '14px' }}>
                      <img src={post.media_urls[0]} className="post-media-img" alt="Post attachment" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} />
                    </div>
                  )}

                  <div className="post-footer-actions" style={{ display: 'flex', gap: '20px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '10px 0' }}>
                    <button 
                      className={`post-action-btn ${isLiked ? 'liked' : ''}`} 
                      onClick={() => handleLike(post.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: isLiked ? 'var(--primary-color)' : 'var(--text-secondary)' }}
                    >
                      <ThumbsUp size={16} />
                      <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>
                    </button>
                    <button 
                      className="post-action-btn"
                      onClick={() => {
                        const input = document.getElementById(`commentInput-${post.id}`);
                        if (input) input.focus();
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}
                    >
                      <MessageSquare size={16} />
                      <span>Comments ({comments.length})</span>
                    </button>
                  </div>

                  {/* Comments Subsection */}
                  <div className="comments-section" style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {comments.map(comment => {
                        const commAuthor = RKMV_DB.getUserById(comment.author_id);
                        if (!commAuthor) return null;
                        return (
                          <div key={comment.id} className="comment-item" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <img 
                              src={commAuthor.profile_photo} 
                              alt={commAuthor.full_name} 
                              className="comment-avatar" 
                              onClick={() => onViewProfile(commAuthor.id)}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div className="comment-box" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--border-radius-sm)', padding: '8px 12px', flexGrow: 1 }}>
                              <div className="comment-author-meta" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span className="comment-author-name" onClick={() => onViewProfile(commAuthor.id)} style={{ fontWeight: 600, fontSize: '0.85rem' }}>{commAuthor.full_name}</span>
                                <span className="comment-time" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTimeAgo(comment.created_at)}</span>
                              </div>
                              <p className="comment-text" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{comment.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Comment */}
                    <div className="comment-composer" style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <input 
                        type="text" 
                        id={`commentInput-${post.id}`}
                        className="comment-input-box" 
                        placeholder="Write a comment..." 
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => handleCommentChange(post.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateComment(post.id, e);
                        }}
                        style={{
                          flexGrow: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', 
                          border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', color: 'white', fontSize: '0.85rem'
                        }}
                      />
                      <button 
                        className="btn btn-primary btn-sm" 
                        style={{ padding: '6px 12px' }}
                        onClick={(e) => handleCreateComment(post.id, e)}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sidebar Groups List */}
      <div className="forums-sidebar">
        <div className="glass-panel sidebar-widget">
          <h3 className="widget-title">My Groups</h3>
          <div className="groups-list">
            <button 
              className={`group-item-btn ${activeGroupId === 'grp-all' ? 'active' : ''}`} 
              onClick={() => setActiveGroupId('grp-all')}
            >
              <span className="group-icon">🌍</span>
              <span>General Forums</span>
            </button>
            <button 
              className={`group-item-btn ${activeGroupId === `grp-${currentUser.batch_year}` ? 'active' : ''}`} 
              onClick={() => setActiveGroupId(`grp-${currentUser.batch_year}`)}
            >
              <span className="group-icon">🎓</span>
              <span>Class of {currentUser.batch_year} Group</span>
            </button>
            <button className="group-item-btn" onClick={() => showToast('More special interest groups coming in Phase 2!', 'info')}>
              <span className="group-icon">🤝</span>
              <span>Entrepreneurship Hub</span>
            </button>
            <button className="group-item-btn" onClick={() => showToast('Health camp coordinating forum opens in Phase 2!', 'info')}>
              <span className="group-icon">🏥</span>
              <span>Medical Volunteers Group</span>
            </button>
          </div>
        </div>

        {/* Quick Guidelines Widget */}
        <div className="glass-panel sidebar-widget">
          <h3 className="widget-title">Forum Guidelines</h3>
          <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Uphold the core ideals of Swami Vivekananda: Truth, purity, and selfless service.</li>
            <li>Keep batch talk friendly, and maintain healthy, batch-level connections.</li>
            <li>No political promotions, hate speech, or commercial solicitations.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

