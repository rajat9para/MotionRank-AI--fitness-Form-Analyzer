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
import EmptyState, { EmptyWorkouts } from './EmptyState';

const FALLBACK = [
  { day: 'Mon', reps: 0 }, { day: 'Tue', reps: 0 }, { day: 'Wed', reps: 0 },
  { day: 'Thu', reps: 0 }, { day: 'Fri', reps: 0 }, { day: 'Sat', reps: 0 },
  { day: 'Sun', reps: 0 },
];

const exerciseEmoji = (type) => ({ squat: '🦵', crunch: '🔥' }[type] || '💪');

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
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
          {label}
        </p>
        <p style={{ fontSize: 30, fontWeight: 900, fontFamily: "'Outfit', sans-serif", lineHeight: 1, color: 'var(--text-primary)' }}>
          {value}
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
      try {
        const profileData = await getUserProfile(u.uid);
        setProfile(profileData);
        const [weekly, radar, heatmap, sessions] = await Promise.all([
          getWeeklyActivity(u.uid),
          getExerciseDistribution(u.uid),
          getHeatmapData(u.uid),
          getUserSessions(u.uid),
        ]);
        if (weekly.length > 0) setWeeklyData(weekly);
        setRadarData(radar);
        setHeatmapData(heatmap);
        setRecentSessions(sessions.slice(0, 5));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
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
    <div className="page-wrapper">
      <Navbar />
      <div className="bg-blob" style={{ top: '-60px', right: '8%',  width: 500, height: 500, background: '#6C5CE7' }} />
      <div className="bg-blob" style={{ bottom: '-40px', left: '5%', width: 400, height: 400, background: '#FD79A8', animationDelay: '-5s' }} />

      <div className="main-content" style={{ maxWidth: 1200 }}>

        {/* ── Hero greeting ─────────────────────────────── */}
        <div className="animate-slide-down" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ fontSize: 34, fontWeight: 900, fontFamily: "'Outfit', sans-serif", lineHeight: 1.15 }}>
              Hey, {displayName.split(' ')[0]} 👋
            </h1>
            {streak > 0 && (
              <div className="chip chip-pink" style={{ marginTop: 10, display: 'inline-flex' }}>
                <Flame size={13} color="#FD79A8" /> {streak} Day Streak!
              </div>
            )}
          </div>
          <Link to="/workout" className="btn-skeu btn-skeu-primary" style={{ fontSize: 15, padding: '14px 28px' }}>
            <Play size={18} /> Start Workout
          </Link>
        </div>

        {/* ── Stat Cards ────────────────────────────────── */}
        <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
          <StatCard icon={Zap}       label="Total Reps"    value={<AnimatedCounter value={totalReps} />} color="#6C5CE7" className="stat-card-purple" />
          <StatCard icon={Clock}     label="Active Min"    value={totalMinutes ? <AnimatedCounter value={totalMinutes} /> : '—'} color="#FD79A8" className="stat-card-pink"   />
          <StatCard icon={Trophy}    label="Workouts"      value={<AnimatedCounter value={recentSessions.length} />} color="#FDCB6E" className="stat-card-orange" />
          <StatCard icon={TrendingUp} label="Avg Form"    value={avgForm > 0 ? <AnimatedCounter value={avgForm} suffix="%" /> : '—'} color="#00B894" className="stat-card-green" />
        </div>

        {/* ── Main Grid ─────────────────────────────────── */}
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 22, marginBottom: 24 }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Radar */}
            <div className="glass-card animate-slide-up" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Target size={18} color="var(--primary)" />
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>Performance Radar</h3>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                    <PolarGrid stroke="var(--border-color)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif" }} />
                    <Radar name="Reps" dataKey="A" stroke="#6C5CE7" fill="#6C5CE7" fillOpacity={0.35} strokeWidth={2} />
                    <Tooltip contentStyle={{
                      backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)',
                      borderRadius: 12, backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-md)'
                    }} itemStyle={{ color: 'var(--text-primary)', fontWeight: 700 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar chart */}
            <div className="glass-card animate-slide-up" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Activity size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>Weekly Activity</h3>
              </div>
              <div style={{ height: 190 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} barCategoryGap="35%">
                    <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'var(--border-light)', radius: 6 }}
                      contentStyle={{
                        backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        borderRadius: 12, backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-md)'
                      }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
                    />
                    <Bar dataKey="reps" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#6C5CE7" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#A29BFE" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Heatmap */}
            <div className="glass-card animate-slide-up" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Flame size={18} color="var(--accent-pink)" />
                  <h3 style={{ fontSize: 17, fontWeight: 700 }}>Activity Heatmap</h3>
                </div>
                <span className="chip chip-pink" style={{ fontSize: 11 }}>12 Weeks</span>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>Less</span>
                {['color-empty','color-scale-1','color-scale-2','color-scale-3','color-scale-4'].map((c, i) => (
                  <div key={i} className={`react-calendar-heatmap`} style={{ display: 'inline-block' }}>
                    <svg width="12" height="12"><rect width="12" height="12" rx="3" className={c} /></svg>
                  </div>
                ))}
                <span>More</span>
              </div>
            </div>

            {/* Recent sessions */}
            <div className="glass-card animate-slide-up" style={{ padding: 24, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Dumbbell size={18} color="var(--accent-green)" />
                  <h3 style={{ fontSize: 17, fontWeight: 700 }}>Recent Workouts</h3>
                </div>
                <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                  View all <ChevronRight size={14} />
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentSessions.length > 0 ? recentSessions.map((s, i) => (
                  <div key={s.id || i} className="glass-card" style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12
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
                  <EmptyState
                    illustration={<EmptyWorkouts />}
                    title="No workouts yet"
                    subtitle="Start your first session and your activity will show up here."
                    action={
                      <Link to="/workout" className="btn-skeu btn-skeu-primary" style={{ padding: '10px 22px', fontSize: 13 }}>
                        Start First Workout
                      </Link>
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ──────────────────────────────── */}
        <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { emoji: '💪', label: 'Push-ups',  desc: 'Upper body strength', color: '#6C5CE7' },
            { emoji: '🦵', label: 'Squats',    desc: 'Lower body power',    color: '#00B894' },
            { emoji: '🔥', label: 'Crunches',  desc: 'Core activation',     color: '#FD79A8' },
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
