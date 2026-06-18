import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { getUserProfile, saveUserProfile, getUserSessions } from '../db';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Camera, Save, Trophy, Flame, Calendar, Dumbbell, Key, Eye, EyeOff, Check, ChevronRight } from 'lucide-react';
import Navbar from './Navbar';
import { useToast } from '../ToastContext';
import AnimatedCounter from './AnimatedCounter';

const CLOUDINARY_CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME  || '';
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

const exerciseEmoji = (t) => ({ squat: '🦵', crunch: '🔥', plank: '🧘' }[t] || '💪');

export default function Profile() {
  const navigate    = useNavigate();
  const fileRef     = useRef(null);
  const { addToast } = useToast();
  const [user,        setUser]        = useState(null);
  const [profile,     setProfile]     = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [photoURL,    setPhotoURL]    = useState('');
  const [sessions,    setSessions]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [formTrend,   setFormTrend]   = useState([]);

  const [apiKey,       setApiKey]      = useState(() => localStorage.getItem('mr_llm_key') || '');
  const [showApiKey,   setShowApiKey]  = useState(false);
  const [apiKeySaved,  setApiKeySaved] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { navigate('/'); return; }
      setUser(u);
      try {
        const pd = await getUserProfile(u.uid);
        setProfile(pd);
        setDisplayName(u.displayName || pd?.displayName || '');
        setPhotoURL(pd?.photoURL || u.photoURL || '');
        const s = await getUserSessions(u.uid);
        setSessions(s);
        const trendData = s
          .filter(sess => sess.formScore > 0)
          .slice(0, 20)
          .reverse()
          .map((sess, i) => ({
            session: `#${i + 1}`,
            score: sess.formScore,
            date: sess.timestamp ? new Date(sess.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
          }));
        setFormTrend(trendData);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, [navigate]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (CLOUDINARY_CLOUD && CLOUDINARY_PRESET) {
        const fd = new FormData();
        fd.append('file', file); fd.append('upload_preset', CLOUDINARY_PRESET);
        fd.append('folder', 'fitness_profiles');
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        setPhotoURL(data.secure_url);
        addToast('Photo uploaded! Click Save to apply.', 'success');
      } else {
        addToast('Configure Cloudinary env vars to enable photo upload.', 'warning');
      }
    } catch { addToast('Upload failed. Please try again.', 'error'); }
    finally   { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName, photoURL: photoURL || undefined });
      await saveUserProfile(user.uid, { displayName, email: user.email, photoURL: photoURL || null });
      addToast('Profile saved!', 'success');
    } catch { addToast('Failed to save. Please try again.', 'error'); }
    finally   { setSaving(false); }
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('mr_llm_key', apiKey);
    setApiKeySaved(true);
    addToast('API key saved locally!', 'success');
    setTimeout(() => setApiKeySaved(false), 2500);
  };

  const totalReps    = profile?.totalReps    || 0;
  const totalMinutes = profile?.totalMinutes || 0;
  const streak       = profile?.streak       || 0;

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
      <div className="bg-blob" style={{ top: '-50px', left: '20%', width: 400, height: 400, background: 'var(--volt)', opacity: 0.15, filter: 'blur(100px)' }} />
      <div className="bg-blob" style={{ bottom: '5%', right: '10%', width: 300, height: 300, background: 'rgba(108, 92, 231, 0.25)', opacity: 0.15, animationDelay: '-10s', filter: 'blur(120px)' }} />

      <div className="main-content" style={{ maxWidth: 1000, position: 'relative', zIndex: 2 }}>
        <div className="animate-slide-down" style={{ marginBottom: 40 }}>
          <div className="mr-eyebrow" style={{ marginBottom: 12 }}>YOUR PROFILE</div>
          <h1 className="section-title" style={{ fontSize: 44, marginBottom: 8, color: 'var(--ink)' }}>Profile</h1>
          <p style={{ color: 'var(--ink-dim)', fontSize: 15 }}>Manage your account, settings, and view history</p>
        </div>

        <div className="profile-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Avatar + name card */}
            <div className="mr-card animate-slide-up" style={{ padding: 36, textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 116, height: 116, margin: '0 auto 24px' }}>
                <div style={{
                  width: 116, height: 116, borderRadius: '50%', overflow: 'hidden',
                  border: '3px solid var(--volt)',
                  boxShadow: '0 0 36px rgba(198,241,53,0.3)'
                }}>
                  {photoURL ? (
                    <img src={photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--grad-volt)',
                      fontSize: 40, fontWeight: 900, color: '#0a0a0d', fontFamily: "'Outfit', sans-serif"
                    }}>
                      {displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="mr-btn mr-btn-primary"
                  style={{ position: 'absolute', bottom: -4, right: -4, width: 36, height: 36, borderRadius: '50%', padding: 0, minWidth: 'unset', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                  id="upload-photo-btn">
                  {uploading
                    ? <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: '#0a0a0d', borderTopColor: 'transparent' }} />
                    : <Camera size={15} />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload}
                  style={{ display: 'none' }} id="photo-file-input" />
              </div>

              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="input-glass" placeholder="Your Name" id="profile-name-input"
                style={{ textAlign: 'center', fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--ink)' }} />
              <p style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 24 }}>{user?.email}</p>

              <button onClick={handleSave} disabled={saving} className="mr-btn mr-btn-primary"
                style={{ width: '100%', padding: '14px' }} id="save-profile-btn">
                <Save size={16} /> {saving ? 'Saving…' : 'Save Profile'}
              </button>

              {streak > 0 && (
                <div style={{
                  marginTop: 18, padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(198,241,53,0.08)', border: '1px solid rgba(198,241,53,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}>
                  <Flame size={17} color="var(--volt)" />
                  <span style={{ fontWeight: 700, color: 'var(--volt)', fontSize: 14 }}>{streak} Day Streak</span>
                </div>
              )}
            </div>

            {/* LLM API Key Card */}
            <div className="mr-card animate-slide-up" style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ padding: 10, borderRadius: 12, background: 'var(--volt-dim)', display: 'flex' }}>
                  <Key size={18} color="var(--volt)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>LLM API Key</h3>
                  <p style={{ fontSize: 12, color: 'var(--ink-dim)' }}>For AI insights & feedback</p>
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.6, marginBottom: 16 }}>
                Paste your Gemini key below. It's stored only in your browser — never sent to any server.
              </p>

              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="input-glass"
                  placeholder="AIzaSy..."
                  style={{ paddingRight: 48, fontSize: 14 }}
                  id="api-key-input"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 4
                  }}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button
                onClick={handleSaveApiKey}
                className={`mr-btn ${apiKeySaved ? 'mr-btn-ghost' : 'mr-btn-ghost'}`}
                style={{
                  width: '100%', padding: '12px',
                  border: apiKeySaved ? '1px solid var(--volt)' : '1px solid var(--line-strong)',
                  color: apiKeySaved ? 'var(--volt)' : 'var(--ink)'
                }}
                id="save-api-key-btn"
              >
                {apiKeySaved ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save Key</>}
              </button>
              
              {apiKey && (
                <div className="chip chip-volt" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>
                  <Check size={12} /> Key configured
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Stats */}
            <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { icon: Activity, label: 'Total Reps',    value: totalReps, color: 'var(--volt)' },
                { icon: Flame,    label: 'Active Min',    value: totalMinutes || 0,         color: '#FD79A8' },
                { icon: Trophy,   label: 'Sessions',      value: sessions.length,             color: '#FDCB6E' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="mr-card" style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: `1px solid ${color}20` }}>
                    <Icon size={20} color={color} />
                  </div>
                  <p style={{ fontSize: 26, fontWeight: 900, fontFamily: "'Outfit', sans-serif", marginBottom: 4, color: 'var(--ink)' }}>
                    <AnimatedCounter value={value} />
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--ink-dim)', fontWeight: 600, letterSpacing: 0.5 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Form Score Trend */}
            {formTrend.length > 1 && (
              <div className="mr-card animate-slide-up" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--ink)' }}>Form Trend</h3>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer>
                    <LineChart data={formTrend} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <XAxis dataKey="date" stroke="var(--ink-faint)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line-strong)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} itemStyle={{ color: 'var(--ink)', fontWeight: 700 }} />
                      <Line type="monotone" dataKey="score" stroke="var(--volt)" strokeWidth={3} dot={{ fill: 'var(--volt)', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Workout History */}
            <div className="mr-card animate-slide-up" style={{ padding: 24, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Calendar size={18} color="var(--volt)" />
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Workout History</h3>
                </div>
                <span style={{ fontSize: 11, background: 'var(--volt-dim)', color: 'var(--volt)', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>{sessions.length} total</span>
              </div>

              {sessions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto', paddingRight: 6 }}>
                  {sessions.map((s, i) => (
                    <div key={s.id || i} className="mr-card" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 24 }}>{exerciseEmoji(s.exerciseType)}</span>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize', color: 'var(--ink)' }}>
                            {s.exerciseType || 'Workout'}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
                            {s.timestamp ? new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 800, color: 'var(--volt)', fontSize: 15 }}>{s.correctReps} reps</p>
                        {s.formScore > 0 && (
                          <span style={{ fontSize: 11, color: s.formScore >= 80 ? '#00B894' : '#FDCB6E', fontWeight: 600 }}>
                            {s.formScore}% form
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Dumbbell size={42} color="var(--ink-faint)" />
                  <p style={{ color: 'var(--ink-dim)', fontSize: 14, marginBottom: 18 }}>No workouts yet. Start your first one!</p>
                  <Link to="/workout" className="btn-skeu btn-skeu-primary" style={{ padding: '10px 24px', fontSize: 13 }}>
                    <Dumbbell size={15} /> Start Workout
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
