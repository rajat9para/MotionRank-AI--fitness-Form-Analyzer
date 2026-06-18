import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getLeaderboard } from '../db';
import { Trophy, Flame, Crown, Activity, Medal, Star } from 'lucide-react';
import Navbar from './Navbar';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { navigate('/'); return; }
      setCurrentUserId(u.uid);
      try { setLeaders(await getLeaderboard()); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, [navigate]);

  const podiumColors = { 1: '#c6f135', 2: '#A29BFE', 3: '#FF9F43' };
  const podiumHeights = { 1: 150, 2: 115, 3: 90 };

  const getRankBadge = (rank) => {
    if (rank === 1) return <Crown size={20} color="#c6f135" />;
    if (rank === 2) return <Medal size={18} color="#A29BFE" />;
    if (rank === 3) return <Medal size={18} color="#FF9F43" />;
    return <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-muted)', minWidth: 20, textAlign: 'center', display: 'inline-block' }}>{rank}</span>;
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
      <div className="bg-blob" style={{ top: '-50px', right: '20%', width: 450, height: 450, background: 'var(--volt)', opacity: 0.15, filter: 'blur(100px)' }} />
      <div className="bg-blob" style={{ bottom: '10%', left: '5%', width: 350, height: 350, background: 'rgba(108, 92, 231, 0.25)', opacity: 0.15, animationDelay: '-8s', filter: 'blur(120px)' }} />

      <div className="main-content" style={{ maxWidth: 760, position: 'relative', zIndex: 2 }}>
        <div className="animate-slide-down" style={{ marginBottom: 36, textAlign: 'center' }}>
          <div className="mr-eyebrow" style={{ justifyContent: 'center', marginBottom: 16 }}>
            GLOBAL RANKINGS
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 900, fontFamily: "'Outfit', sans-serif", marginBottom: 8, color: 'var(--ink)' }}>Leaderboard</h1>
          <p style={{ color: 'var(--ink-dim)', fontSize: 16 }}>Top athletes ranked by total correct reps</p>
        </div>

        {leaders.length === 0 ? (
          <div className="mr-card animate-scale-in" style={{ textAlign: 'center', padding: '70px 40px' }}>
            <Trophy size={56} color="var(--ink-faint)" style={{ marginBottom: 16, opacity: 0.5 }} />
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>No Rankings Yet</h3>
            <p style={{ color: 'var(--ink-dim)', marginBottom: 24 }}>Complete workouts to appear here!</p>
            <Link to="/workout" className="mr-btn mr-btn-primary" style={{ padding: '14px 32px' }}>
              <Activity size={18} /> Start Working Out
            </Link>
          </div>
        ) : (
          <>
            {/* Podium */}
            {leaders.length >= 3 && (
              <div className="animate-slide-up" style={{
                display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
                gap: 10, marginBottom: 36, padding: '0 12px'
              }}>
                {[leaders[1], leaders[0], leaders[2]].map((leader, idx) => {
                  const rank = [2, 1, 3][idx];
                  const color = podiumColors[rank];
                  const h = podiumHeights[rank];
                  const size = rank === 1 ? 68 : 52;
                  return (
                    <div key={leader.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 180 }}>
                      {rank === 1 && <Star size={20} color="#c6f135" style={{ marginBottom: 6 }} />}
                      <div style={{
                        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
                        border: `3px solid ${color}`, marginBottom: 8,
                        boxShadow: `0 0 30px ${color}40`,
                        background: 'var(--panel)'
                      }}>
                        {leader.photoURL
                          ? <img src={leader.photoURL} alt={leader.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${color}30, transparent)`, fontWeight: 800, fontSize: size * 0.38, color }}>
                              {leader.displayName?.[0]?.toUpperCase() || '?'}
                            </div>
                        }
                      </div>
                      <p style={{ fontWeight: 800, fontSize: 13, textAlign: 'center', marginBottom: 3, color: 'var(--ink)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                        {leader.displayName}
                      </p>
                      <p style={{ fontWeight: 900, fontSize: 15, color, fontFamily: "'Outfit', sans-serif" }}>
                        {leader.totalReps.toLocaleString()}
                      </p>
                      <div style={{
                        width: '100%', height: h, marginTop: 8,
                        borderRadius: '14px 14px 0 0',
                        background: `linear-gradient(180deg, ${color}28, ${color}10)`,
                        border: `1px solid ${color}30`, borderBottom: 'none',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 14
                      }}>
                        {getRankBadge(rank)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full Rankings */}
            <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {leaders.map((leader, idx) => {
                const rank = idx + 1;
                const isMe = leader.id === currentUserId;
                const color = podiumColors[rank];
                return (
                  <div key={leader.id} className="mr-card" style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderRadius: 16,
                    background: rank <= 3 ? `linear-gradient(135deg, ${color}10, transparent)` : 'var(--panel)',
                    border: isMe ? `1px solid var(--volt)` : rank <= 3 ? `1px solid ${color}30` : '1px solid var(--line)',
                    boxShadow: isMe ? `0 0 20px rgba(198,241,53,0.15)` : undefined
                  }}>
                    <div style={{ width: 32, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                      {getRankBadge(rank)}
                    </div>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                      background: rank <= 3 ? `linear-gradient(135deg, ${color}40, ${color}20)` : 'var(--volt-dim)',
                      border: `2px solid ${rank <= 3 ? color + '50' : 'var(--line-strong)'}`
                    }}>
                      {leader.photoURL
                        ? <img src={leader.photoURL} alt={leader.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: rank <= 3 ? color : 'var(--volt)' }}>
                            {leader.displayName?.[0]?.toUpperCase() || '?'}
                          </div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 16, color: isMe ? 'var(--volt)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {leader.displayName}
                        {isMe && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: 'var(--volt)', opacity: 0.9 }}>(You)</span>}
                      </p>
                      <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>
                        {leader.streak > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Flame size={12} color="#FD79A8" /> {leader.streak}d
                          </span>
                        )}
                        {leader.totalMinutes > 0 && <span>{leader.totalMinutes}m active</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: rank <= 3 ? color : 'var(--ink)' }}>
                        {leader.totalReps.toLocaleString()}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--ink-dim)', fontWeight: 600 }}>reps</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
