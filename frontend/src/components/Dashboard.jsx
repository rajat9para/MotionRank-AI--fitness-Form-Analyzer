import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import {
  Flame, Trophy, Activity, Play, TrendingUp,
  Clock, Dumbbell, Target, ChevronRight, Zap
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import {
  getUserProfile, getWeeklyActivity, getUserSessions,
  getExerciseDistribution, getHeatmapData
} from '../db';
import Navbar from './Navbar';
import AnimatedCounter from './AnimatedCounter';

const FALLBACK = [
  { day: 'Mon', reps: 0 }, { day: 'Tue', reps: 0 }, { day: 'Wed', reps: 0 },
  { day: 'Thu', reps: 0 }, { day: 'Fri', reps: 0 }, { day: 'Sat', reps: 0 },
  { day: 'Sun', reps: 0 },
];

const exerciseEmoji = (type) => ({ squat: '🦵', crunch: '🔥', plank: '🧘' }[type] || '💪');

function StatCard({ icon: Icon, label, value, color, subValue, className = '' }) {
  return (
    <div className={`glass-card ${className}`} style={{ padding: '22px 24px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${color}25`
      }}>
        <Icon size={22} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          {label}
        </p>
        <p style={{ fontSize: 30, fontWeight: 900, fontFamily: "'Outfit', sans-serif", lineHeight: 1, color: 'var(--text-primary)' }}>
          <AnimatedCounter value={value} />
        </p>
        {subValue && (
          <p style={{ fontSize: 12, color, fontWeight: 600, marginTop: 4 }}>{subValue}</p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [weeklyData, setWeeklyData] = useState(FALLBACK);
  const [radarData, setRadarData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { navigate('/'); return; }
      setUser(u);
      setLoading(false); // Show skeleton immediately
      try {
        const results = await Promise.allSettled([
          getUserProfile(u.uid),
          getWeeklyActivity(u.uid),
          getExerciseDistribution(u.uid),
          getHeatmapData(u.uid),
          getUserSessions(u.uid),
        ]);
        const [profileRes, weeklyRes, radarRes, heatmapRes, sessionsRes] = results;
        if (profileRes.status === 'fulfilled' && profileRes.value) setProfile(profileRes.value);
        if (weeklyRes.status === 'fulfilled' && weeklyRes.value?.length > 0) setWeeklyData(weeklyRes.value);
        if (radarRes.status === 'fulfilled') setRadarData(radarRes.value || []);
        if (heatmapRes.status === 'fulfilled') setHeatmapData(heatmapRes.value || []);
        if (sessionsRes.status === 'fulfilled') setRecentSessions((sessionsRes.value || []).slice(0, 5));
      } catch (e) { console.error(e); }
    });
    return () => unsub();
  }, [navigate]);

  const displayName = user?.displayName || profile?.displayName || 'Athlete';
  const totalReps    = profile?.totalReps    || 0;
  const totalMinutes = profile?.totalMinutes || 0;
  const streak       = profile?.streak       || 0;
  const avgForm = recentSessions.length > 0
    ? Math.round(recentSessions.reduce((s, r) => s + (r.formScore || 0), 0) / recentSessions.length)
    : 0;

  const endDate   = new Date();
  const startDate = new Date(); startDate.setDate(startDate.getDate() - 84);

  if (loading) return (
    <div className="page-wrapper">
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', flexDirection: 'column', gap: 16 }}>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading your dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper mr-cine" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="mr-grain" />
      <Navbar />
      
      {/* Cinematic animated blobs */}
      <div className="bg-blob" style={{ top: '-10%', right: '0%', width: '60vw', height: '60vw', background: 'var(--volt-dim)', filter: 'blur(100px)', animationDuration: '20s' }} />
      <div className="bg-blob" style={{ bottom: '-20%', left: '-10%', width: '50vw', height: '50vw', background: 'rgba(108, 92, 231, 0.15)', filter: 'blur(120px)', animationDelay: '-5s' }} />

      <div className="main-content" style={{ maxWidth: 1200, position: 'relative', zIndex: 2 }}>

        {/* ── Hero greeting ─────────────────────────────── */}
        <div className="animate-slide-down" style={{ marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="mr-eyebrow" style={{ marginBottom: 12 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <h1 style={{ fontSize: 44, fontWeight: 900, fontFamily: "'Outfit', sans-serif", lineHeight: 1.1, color: 'var(--ink)' }}>
              Hey, {displayName.split(' ')[0]} 👋
            </h1>
            {streak > 0 && (
              <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(198, 241, 53, 0.15)', color: 'var(--volt)', padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 700, border: '1px solid rgba(198, 241, 53, 0.3)' }}>
                <Flame size={14} /> {streak} Day Streak!
              </div>
            )}
          </div>
          <Link to="/workout" className="mr-btn mr-btn-primary" style={{ padding: '16px 32px', fontSize: 16 }}>
            <Play size={18} /> Start Workout
          </Link>
        </div>

        {/* ── Stat Cards ────────────────────────────────── */}
        <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard icon={Zap}       label="Total Reps"    value={totalReps} color="var(--volt)" className="mr-card" />
          <StatCard icon={Clock}     label="Active Min"    value={totalMinutes || 0}         color="#FD79A8" className="mr-card" />
          <StatCard icon={Trophy}    label="Workouts"      value={recentSessions.length}       color="#FDCB6E" className="mr-card" />
          <StatCard icon={TrendingUp} label="Avg Form"    value={avgForm > 0 ? avgForm : 0} color="#00B894" className="mr-card" />
        </div>

        {/* ── Main Grid ─────────────────────────────────── */}
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 24, marginBottom: 24 }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Radar */}
            <div className="mr-card animate-slide-up" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Target size={18} color="var(--volt)" />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Performance Radar</h3>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                    <PolarGrid stroke="var(--line-strong)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--ink-dim)', fontSize: 12, fontWeight: 600 }} />
                    <Radar name="Reps" dataKey="A" stroke="var(--volt)" fill="var(--volt)" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip contentStyle={{
                      backgroundColor: 'var(--panel)', border: '1px solid var(--line-strong)',
                      borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                    }} itemStyle={{ color: 'var(--ink)', fontWeight: 700 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar chart */}
            <div className="mr-card animate-slide-up" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Activity size={18} color="var(--volt)" />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Weekly Activity</h3>
              </div>
              <div style={{ height: 190 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} barCategoryGap="35%">
                    <XAxis dataKey="day" stroke="var(--ink-faint)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'var(--line-strong)', radius: 6 }}
                      contentStyle={{
                        backgroundColor: 'var(--panel)', border: '1px solid var(--line-strong)',
                        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                      }}
                      labelStyle={{ color: 'var(--ink)', fontWeight: 700 }}
                    />
                    <Bar dataKey="reps" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#c6f135" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#8fd400" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Heatmap */}
            <div className="mr-card animate-slide-up" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Flame size={18} color="var(--volt)" />
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Activity Heatmap</h3>
                </div>
                <span style={{ fontSize: 11, background: 'var(--volt-dim)', color: 'var(--volt)', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>12 Weeks</span>
              </div>
              <CalendarHeatmap
                startDate={startDate} endDate={endDate} values={heatmapData}
                classForValue={(v) => {
                  if (!v || v.count === 0) return 'color-empty';
                  if (v.count < 10) return 'color-scale-1';
                  if (v.count < 30) return 'color-scale-2';
                  if (v.count < 60) return 'color-scale-3';
                  return 'color-scale-4';
                }}
                showWeekdayLabels={true}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 10, fontSize: 11, color: 'var(--ink-dim)' }}>
                <span>Less</span>
                {['color-empty','color-scale-1','color-scale-2','color-scale-3','color-scale-4'].map((c, i) => (
                  <div key={i} className="react-calendar-heatmap" style={{ display: 'inline-block' }}>
                    <svg width="12" height="12"><rect width="12" height="12" rx="3" className={c} /></svg>
                  </div>
                ))}
                <span>More</span>
              </div>
            </div>

            {/* Recent sessions */}
            <div className="mr-card animate-slide-up" style={{ padding: 24, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Dumbbell size={18} color="var(--volt)" />
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Recent Workouts</h3>
                </div>
                <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--volt)', fontWeight: 600 }}>
                  View all <ChevronRight size={14} />
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentSessions.length > 0 ? recentSessions.map((s, i) => (
                  <div key={s.id || i} className="mr-card" style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)'
                  }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{exerciseEmoji(s.exerciseType)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize' }}>{s.exerciseType || 'Workout'}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {s.correctReps} reps • {s.timestamp ? new Date(s.timestamp).toLocaleDateString() : ''}
                      </p>
                    </div>
                    {s.formScore > 0 && (
                      <span className={`chip ${s.formScore >= 80 ? 'chip-green' : 'chip-orange'}`} style={{ fontSize: 11 }}>
                        {s.formScore}%
                      </span>
                    )}
                  </div>
                )) : (
                  <div className="empty-state" style={{ padding: '32px 20px' }}>
                    <Dumbbell size={40} color="var(--text-muted)" />
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>No workouts yet</p>
                    <Link to="/workout" className="btn-skeu btn-skeu-primary" style={{ padding: '10px 22px', fontSize: 13 }}>
                      Start First Workout
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ──────────────────────────────── */}
        <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {[
            { emoji: '💪', label: 'Push-ups',  desc: 'Upper body strength', color: '#6C5CE7' },
            { emoji: '🦵', label: 'Squats',    desc: 'Lower body power',    color: '#00B894' },
            { emoji: '🔥', label: 'Crunches',  desc: 'Core activation',     color: '#FD79A8' },
            { emoji: '🧘', label: 'Plank',     desc: 'Core endurance',      color: '#FF9F43' },
          ].map((item) => (
            <Link key={item.label} to="/workout" className="glass-card" style={{
              padding: '24px 20px', textDecoration: 'none', textAlign: 'center', display: 'block',
              borderRadius: 20, cursor: 'pointer',
              borderTop: `3px solid ${item.color}50`
            }}>
              <span style={{ fontSize: 40, display: 'block', marginBottom: 10 }}>{item.emoji}</span>
              <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, color: 'var(--text-primary)' }}>{item.label}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
