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

const ExerciseIcon = ({ type, size = 22 }) => {
  if (type === 'squat') return <Activity size={size} color="var(--volt)" />;
  if (type === 'crunch') return <Flame size={size} color="#FD79A8" />;
  if (type === 'plank') return <Target size={size} color="#FF9F43" />;
  return <Dumbbell size={size} color="#6C5CE7" />;
};

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

        {/* ── Main Dashboard Layout ─────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
          
          {/* Heatmap Section (Full Width Leetcode Style) */}
          <div className="mr-card animate-slide-up" style={{ padding: '28px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Flame size={20} color="var(--volt)" />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Contribution Activity</h3>
              </div>
              <span style={{ fontSize: 12, background: 'var(--volt-dim)', color: 'var(--volt)', padding: '6px 14px', borderRadius: 999, fontWeight: 700 }}>12 Weeks</span>
            </div>
            <div style={{ margin: '0 -10px' }}>
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
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 16, fontSize: 12, color: 'var(--ink-dim)', fontWeight: 500 }}>
              <span>Less</span>
              {['color-empty','color-scale-1','color-scale-2','color-scale-3','color-scale-4'].map((c, i) => (
                <div key={i} className="react-calendar-heatmap" style={{ display: 'inline-block' }}>
                  <svg width="14" height="14"><rect width="14" height="14" rx="3" className={c} /></svg>
                </div>
              ))}
              <span>More</span>
            </div>
          </div>

          {/* Middle Row (Charts & Radar) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
            {/* Bar chart */}
            <div className="mr-card animate-slide-up" style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Activity size={20} color="var(--volt)" />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Weekly Volume</h3>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} barCategoryGap="25%" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="day" stroke="var(--ink-faint)" fontSize={13} tickLine={false} axisLine={false} dy={10} />
                    <Tooltip
                      cursor={{ fill: 'var(--line-strong)', radius: 8 }}
                      contentStyle={{
                        backgroundColor: 'var(--panel)', border: '1px solid var(--line-strong)',
                        borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.15)', padding: '12px 16px'
                      }}
                      labelStyle={{ color: 'var(--ink)', fontWeight: 700, marginBottom: 4 }}
                    />
                    <Bar dataKey="reps" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="var(--primary-light)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--primary-dark)" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar */}
            <div className="mr-card animate-slide-up" style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Target size={20} color="var(--volt)" />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Performance Radar</h3>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="var(--line-strong)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--ink-dim)', fontSize: 13, fontWeight: 600 }} />
                    <Radar name="Reps" dataKey="A" stroke="var(--volt)" fill="var(--volt)" fillOpacity={0.3} strokeWidth={2} />
                    <Tooltip contentStyle={{
                      backgroundColor: 'var(--panel)', border: '1px solid var(--line-strong)',
                      borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                    }} itemStyle={{ color: 'var(--ink)', fontWeight: 700 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom Row (Recent Workouts & Actions) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
            {/* Recent sessions */}
            <div className="mr-card animate-slide-up" style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Clock size={20} color="var(--volt)" />
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Recent Activity</h3>
                </div>
                <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                  View all <ChevronRight size={16} />
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentSessions.length > 0 ? recentSessions.map((s, i) => (
                  <div key={s.id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px', borderRadius: 16,
                    background: 'var(--bg-secondary)', border: '1px solid var(--line-light)', transition: 'transform 0.2s'
                  }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <ExerciseIcon type={s.exerciseType} size={24} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{s.exerciseType || 'Workout'}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {s.correctReps} reps • {s.timestamp ? new Date(s.timestamp).toLocaleDateString() : ''}
                      </p>
                    </div>
                    {s.formScore > 0 && (
                      <span className={`chip ${s.formScore >= 80 ? 'chip-green' : 'chip-orange'}`} style={{ fontSize: 12, padding: '6px 12px' }}>
                        {s.formScore}% Form
                      </span>
                    )}
                  </div>
                )) : (
                  <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <Dumbbell size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>No workouts recorded yet.</p>
                    <Link to="/workout" className="mr-btn mr-btn-primary">
                      Start First Workout
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions / Suggested */}
            <div className="mr-card animate-slide-up" style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Zap size={20} color="var(--volt)" />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Suggested Plans</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { icon: Dumbbell, label: 'Push-ups',  desc: 'Upper body', color: '#6C5CE7' },
                  { icon: Activity, label: 'Squats',    desc: 'Lower body', color: '#00B894' },
                  { icon: Flame,    label: 'Crunches',  desc: 'Core strength', color: '#FD79A8' },
                  { icon: Target,   label: 'Plank',     desc: 'Endurance',  color: '#FF9F43' },
                ].map((item) => (
                  <Link key={item.label} to="/workout" style={{
                    padding: '20px 16px', textDecoration: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    borderRadius: 16, cursor: 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--line-light)',
                    transition: 'all 0.2s',
                  }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
                     onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <item.icon size={32} color={item.color} style={{ marginBottom: 12 }} />
                    <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--text-primary)' }}>{item.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
