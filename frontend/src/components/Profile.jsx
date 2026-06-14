import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { getUserProfile, saveUserProfile, getUserSessions } from '../db';
import { Activity, Camera, Save, Trophy, Flame, Calendar, Dumbbell, Key, Eye, EyeOff, Check, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Navbar from './Navbar';
import AnimatedCounter from './AnimatedCounter';
import EmptyState, { EmptyWorkouts } from './EmptyState';
import { useToast } from '../ToastContext';

const CLOUDINARY_CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME  || '';
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

const exerciseEmoji = (t) => ({ squat: '🦵', crunch: '🔥' }[t] || '💪');

export default function Profile() {
  const navigate    = useNavigate();
  const fileRef     = useRef(null);
  const { addToast } = useToast();
  const [user,        setUser]        = useState(null);
  const [profile,     setProfile]     = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [photoURL,    setPhotoURL]    = useState('');
  const [sessions,    setSessions]    = useState([]);
  const [formTrend,   setFormTrend]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);

  // LLM API key state (stored locally only — never sent to backend)
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
        const trend = s
          .filter((sess) => sess.formScore > 0)
          .slice(0, 20)
          .reverse()
          .map((sess) => ({
            score: sess.formScore,
            date: sess.timestamp
              ? new Date(sess.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '',
          }));
        setFormTrend(trend);
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
    <div className="page-wrapper">
      <Navbar />
      <div className="bg-blob" style={{ top: '-50px', left: '20%', width: 400, height: 400, background: '#6C5CE7', opacity: 0.1 }} />
      <div className="bg-blob" style={{ bottom: '5%', right: '10%', width: 300, height: 300, background: '#FD79A8', opacity: 0.08, animationDelay: '-10s' }} />

      <div className="main-content" style={{ maxWidth: 1000 }}>
        {/* Header */}
        <div className="animate-slide-down" style={{ marginBottom: 32 }}>
          <h1 className="section-title" style={{ fontSize: 34, marginBottom: 4 }}>Your Profile</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage your account, settings, and view history</p>
        </div>

        <div className="profile-grid">
          {/* ── Left: profile card ─────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Avatar + name card */}
            <div className="glass-card-strong animate-slide-up" style={{ padding: 32, textAlign: 'center' }}>
              {/* Avatar */}
              <div style={{ position: 'relative', width: 116, height: 116, margin: '0 auto 20px' }}>
                <div style={{
                  width: 116, height: 116, borderRadius: '50%', overflow: 'hidden',
                  border: '3px solid var(--primary-light)',
                  boxShadow: '0 0 36px rgba(108,92,231,0.22)'
                }}>
                  {photoURL ? (
                    <img src={photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, var(--primary), var(--accent-pink))',
                      fontSize: 40, fontWeight: 900, color: 'white', fontFamily: "'Outfit', sans-serif"
                    }}>
                      {displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="btn-skeu btn-skeu-primary"
                  style={{ position: 'absolute', bottom: -4, right: -4, width: 36, height: 36, borderRadius: '50%', padding: 0, minWidth: 'unset' }}
                  id="upload-photo-btn">
                  {uploading
                    ? <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    : <Camera size={15} />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload}
                  style={{ display: 'none' }} id="photo-file-input" />
              </div>

              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="input-glass" placeholder="Your Name" id="profile-name-input"
                style={{ textAlign: 'center', fontSize: 17, fontWeight: 800, marginBottom: 6 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>{user?.email}</p>

              <button onClick={handleSave} disabled={saving} className="btn-skeu btn-skeu-primary"
                style={{ width: '100%', padding: '12px' }} id="save-profile-btn">
                <Save size={15} /> {saving ? 'Saving…' : 'Save Profile'}
              </button>

              {streak > 0 && (
                <div style={{
                  marginTop: 18, padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(253,121,168,0.08)', border: '1px solid rgba(253,121,168,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}>
                  <Flame size={17} color="#FD79A8" />
                  <span style={{ fontWeight: 700, color: '#FD79A8', fontSize: 14 }}>{streak} Day Streak 🔥</span>
                </div>
              )}
            </div>

            {/* ── LLM API Key Card ─────────────────── */}
            <div className="glass-card-strong animate-slide-up" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ padding: 8, borderRadius: 10, background: 'rgba(108,92,231,0.1)', display: 'flex' }}>
                  <Key size={16} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800 }}>LLM API Key</h3>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>For AI insights & feedback</p>
                </div>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
                Paste your Gemini or OpenAI key below. It's stored only in your browser — never sent to any server.
              </p>

              <div style={{ position: 'relative', marginBottom: 10 }}>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-... or AIza..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="input-glass"
                  style={{ paddingRight: 44, fontSize: 13 }}
                  id="llm-api-key-input"
                />
                <button onClick={() => setShowApiKey(!showApiKey)} type="button"
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button onClick={handleSaveApiKey} className="btn-skeu btn-skeu-secondary"
                style={{ width: '100%', padding: '10px', fontSize: 13 }} id="save-api-key-btn">
                {apiKeySaved ? <><Check size={14} color="var(--accent-green)" /> Saved!</> : <><Key size={14} /> Save Key Locally</>}
              </button>

              {apiKey && (
                <div className="chip chip-green" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>
                  <Check size={12} /> Key configured
                </div>
              )}
            </div>
          </div>

          {/* ── Right: stats + history ──────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Stats */}
            <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { icon: Activity, label: 'Total Reps',    value: <AnimatedCounter value={totalReps} />, color: '#6C5CE7' },
                { icon: Flame,    label: 'Active Min',    value: totalMinutes ? <AnimatedCounter value={totalMinutes} /> : '—', color: '#FD79A8' },
                { icon: Trophy,   label: 'Sessions',      value: <AnimatedCounter value={sessions.length} />, color: '#FDCB6E' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="glass-card" style={{ padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', border: `1px solid ${color}20` }}>
                    <Icon size={20} color={color} />
                  </div>
                  <p style={{ fontSize: 26, fontWeight: 900, fontFamily: "'Outfit', sans-serif", marginBottom: 2 }}>{value}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Form Trend */}
            {formTrend.length > 1 && (
              <div className="glass-card animate-slide-up" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <TrendingUp size={17} color="var(--accent-green)" />
                  <h3 style={{ fontSize: 17, fontWeight: 700 }}>Form Trend</h3>
                </div>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formTrend} margin={{ top: 5, right: 8, bottom: 5, left: -16 }}>
                      <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)',
                          borderRadius: 12, backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-md)'
                        }}
                        labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
                        formatter={(v) => [`${v}%`, 'Form']}
                      />
                      <Line type="monotone" dataKey="score" stroke="#6C5CE7" strokeWidth={3}
                        dot={{ fill: '#6C5CE7', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Workout History */}
            <div className="glass-card animate-slide-up" style={{ padding: 24, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Calendar size={17} color="var(--primary)" />
                  <h3 style={{ fontSize: 17, fontWeight: 700 }}>Workout History</h3>
                </div>
                <span className="chip chip-primary" style={{ fontSize: 11 }}>{sessions.length} total</span>
              </div>

              {sessions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto', paddingRight: 6 }}>
                  {sessions.map((s, i) => (
                    <div key={s.id || i} className="glass-card" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 22 }}>{exerciseEmoji(s.exerciseType)}</span>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize' }}>
                            {s.exerciseType || 'Workout'}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {s.timestamp ? new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 14 }}>{s.correctReps} reps</p>
                        {s.formScore > 0 && (
                          <span className={`chip ${s.formScore >= 80 ? 'chip-green' : 'chip-orange'}`} style={{ fontSize: 10 }}>
                            {s.formScore}% form
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  illustration={<EmptyWorkouts />}
                  title="No workouts yet"
                  subtitle="Complete your first session to build your history and form trend."
                  action={
                    <Link to="/workout" className="btn-skeu btn-skeu-primary" style={{ padding: '10px 24px', fontSize: 13 }}>
                      <Dumbbell size={15} /> Start Workout
                    </Link>
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
