import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getUserProfile } from '../db';
import { Heart, MessageSquare, Camera, Send, Trash2, X } from 'lucide-react';
import Navbar from './Navbar';
import { useToast } from '../ToastContext';
import { createPost, getFeedPosts, likePost, addComment, getComments } from '../communityDb';

export default function Community() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [postComments, setPostComments] = useState({});
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { navigate('/'); return; }
      setUser(u);
      const pd = await getUserProfile(u.uid);
      setProfile(pd);
      try {
        const feedPosts = await getFeedPosts();
        setPosts(feedPosts);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, [navigate]);

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedPhotos.length > 5) {
      addToast('Maximum 5 photos per post', 'warning');
      return;
    }
    const newPhotos = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setSelectedPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (idx) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    if (!expandedComments) return;
    let cancelled = false;
    const load = async () => {
      setLoadingComments(true);
      try {
        const comments = await getComments(expandedComments);
        if (!cancelled) setPostComments(prev => ({ ...prev, [expandedComments]: comments }));
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoadingComments(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [expandedComments]);

  const handlePost = async () => {
    if (!newPostText.trim() && selectedPhotos.length === 0) return;
    setPosting(true);
    try {
      const photoUrls = [];
      if (selectedPhotos.length > 0) {
        const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
        const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
        for (const photo of selectedPhotos) {
          if (CLOUDINARY_CLOUD && CLOUDINARY_PRESET) {
            const fd = new FormData();
            fd.append('file', photo.file);
            fd.append('upload_preset', CLOUDINARY_PRESET);
            fd.append('folder', 'community_posts');
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: fd });
            if (res.ok) {
              const data = await res.json();
              photoUrls.push(data.secure_url);
            }
          }
        }
      }

      await createPost(user.uid, newPostText.trim(), photoUrls);
      setNewPostText('');
      setSelectedPhotos([]);
      addToast('Post shared!', 'success');
      const feedPosts = await getFeedPosts();
      setPosts(feedPosts);
    } catch (e) {
      addToast('Failed to post', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      await likePost(postId, user.uid);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const liked = p.likes.includes(user.uid);
          return { ...p, likes: liked ? p.likes.filter(id => id !== user.uid) : [...p.likes, user.uid] };
        }
        return p;
      }));
    } catch (e) { console.error(e); }
  };

  const handleComment = async (postId) => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await addComment(postId, user.uid, commentText.trim(), user.displayName || 'User');
      setCommentText('');
      setExpandedComments(null);
      addToast('Comment added!', 'success');
    } catch (e) {
      addToast('Failed to comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStreakBadges = (streak) => {
    const badges = [];
    if (streak >= 7) badges.push({ label: '🔥 7-Day Warrior', cls: 'badge-warrior' });
    if (streak >= 30) badges.push({ label: '⚡ 30-Day Legend', cls: 'badge-legend' });
    if (streak >= 50) badges.push({ label: '💎 50-Day Diamond', cls: 'badge-diamond' });
    if (streak >= 100) badges.push({ label: '👑 100-Day Crown', cls: 'badge-crown' });
    return badges;
  };

  if (loading) return (
    <div className="page-wrapper">
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div className="loading-spinner" />
      </div>
    </div>
  );

  return (
    <div className="page-wrapper mr-cine" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className="mr-grain" />
      <div className="bg-blob" style={{ top: '-60px', left: '25%', width: 380, height: 380, background: 'var(--volt)', opacity: 0.15, filter: 'blur(100px)' }} />

      <div className="main-content" style={{ maxWidth: 680, position: 'relative', zIndex: 2 }}>
        <div className="animate-slide-down" style={{ marginBottom: 36 }}>
          <div className="mr-eyebrow" style={{ marginBottom: 12 }}>COMMUNITY</div>
          <h1 style={{ fontSize: 44, fontWeight: 900, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 14, color: 'var(--ink)' }}>
            <MessageSquare color="var(--volt)" size={32} /> Community Feed
          </h1>
          <p style={{ color: 'var(--ink-dim)', fontSize: 16, marginTop: 8 }}>
            Share your workouts and connect with athletes
          </p>
        </div>

        {/* New Post Composer */}
        <div className="mr-card animate-slide-up" style={{ padding: 24, marginBottom: 32, background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--volt-dim)', border: '2px solid var(--line-strong)' }}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--volt)', fontWeight: 800, fontSize: 16 }}>
                  {user?.displayName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <textarea
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder="Share your workout, progress, or motivation..."
              className="input-glass"
              rows={3}
              style={{ resize: 'none' }}
            />
          </div>

          {selectedPhotos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {selectedPhotos.map((photo, i) => (
                <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden' }}>
                  <img src={photo.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => removePhoto(i)} style={{
                    position: 'absolute', top: 2, right: 2, width: 20, height: 20,
                    borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none',
                    color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--ink-dim)', fontSize: 14, fontWeight: 800 }}>
              <Camera size={18} /> Photos ({selectedPhotos.length}/5)
              <input type="file" accept="image/*" multiple onChange={handlePhotoSelect} style={{ display: 'none' }} />
            </label>
            <button onClick={handlePost} disabled={posting || (!newPostText.trim() && selectedPhotos.length === 0)}
              className="mr-btn mr-btn-primary" style={{ padding: '10px 24px', fontSize: 14 }}>
              {posting ? <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: '#0a0a0d', borderTopColor: 'transparent' }} /> : <><Send size={16} /> Post</>}
            </button>
          </div>
        </div>

        {/* Feed */}
        {posts.length > 0 ? (
          <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {posts.map((post) => (
              <div key={post.id} className="mr-card" style={{ padding: 20, background: 'var(--panel)', border: '1px solid var(--line)' }}>
                {/* Post Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--volt-dim)', border: '2px solid var(--line-strong)' }}>
                    {post.userPhoto ? (
                      <img src={post.userPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--volt)', fontWeight: 800, fontSize: 16 }}>
                        {post.userName?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>{post.userName}</span>
                      {getStreakBadges(post.userStreak || 0).map((badge, i) => (
                        <span key={i} className={`streak-badge ${badge.cls}`}>{badge.label}</span>
                      ))}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
                      {post.timestamp ? new Date(post.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                </div>

                {/* Post Content */}
                {post.text && (
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink)', marginBottom: 16 }}>{post.text}</p>
                )}

                {/* Post Photos */}
                {post.photoUrls && post.photoUrls.length > 0 && (
                  <div className={`post-photo-grid grid-${Math.min(post.photoUrls.length, 5)}`} style={{ marginBottom: 12 }}>
                    {post.photoUrls.slice(0, 5).map((url, i) => (
                      <img key={i} src={url} alt="" style={{ cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />
                    ))}
                  </div>
                )}

                {/* Post Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 12, borderTop: '1px solid var(--line-strong)' }}>
                  <button onClick={() => handleLike(post.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                    cursor: 'pointer', color: post.likes?.includes(user?.uid) ? '#FF6B6B' : 'var(--ink-dim)',
                    fontWeight: 800, fontSize: 14, padding: '6px 0',
                    transition: 'color 0.2s'
                  }}>
                    <Heart size={18} fill={post.likes?.includes(user?.uid) ? '#FF6B6B' : 'none'} />
                    {post.likes?.length || 0}
                  </button>
                  <button onClick={() => setExpandedComments(expandedComments === post.id ? null : post.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--ink-dim)', fontWeight: 800, fontSize: 14, padding: '6px 0'
                  }}>
                    <MessageSquare size={18} />
                    {post.commentsCount || 0}
                  </button>
                </div>

                {/* Comment Input */}
                {expandedComments === post.id && (
                  <div className="animate-slide-down" style={{ marginTop: 12 }}>
                    {loadingComments ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                        <div className="loading-spinner" style={{ width: 18, height: 18 }} />
                      </div>
                    ) : (postComments[post.id] || []).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                        {(postComments[post.id] || []).map((c) => (
                          <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--volt-dim)', border: '1px solid var(--line-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ color: 'var(--volt)', fontSize: 11, fontWeight: 900 }}>{c.userName?.[0]?.toUpperCase() || '?'}</span>
                            </div>
                            <div>
                              <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--ink)' }}>{c.userName}</span>
                              <p style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 2 }}>{c.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="input-glass"
                        style={{ flex: 1, padding: '10px 14px', fontSize: 14 }}
                        onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                      />
                      <button onClick={() => handleComment(post.id)} disabled={submittingComment}
                        className="mr-btn mr-btn-primary" style={{ padding: '10px 16px', minWidth: 'unset' }}>
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mr-card" style={{ padding: '60px 40px', textAlign: 'center', background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <MessageSquare size={48} color="var(--ink-dim)" style={{ margin: '0 auto' }} />
            <h3 style={{ fontWeight: 800, fontSize: 22, marginTop: 16, color: 'var(--ink)' }}>No Posts Yet</h3>
            <p style={{ color: 'var(--ink-dim)', fontSize: 15, marginTop: 8 }}>Be the first to share your workout!</p>
          </div>
        )}
      </div>
    </div>
  );
}
