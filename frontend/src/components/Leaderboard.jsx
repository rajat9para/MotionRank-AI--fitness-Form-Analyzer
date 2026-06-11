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

  const podiumColors = { 1: '#FDCB6E', 2: '#B2BEC3', 3: '#CD7F32' };
  const podiumHeights = { 1: 150, 2: 115, 3: 90 };

  const getRankBadge = (rank) => {
    if (rank === 1) return <Crown size={20} color="#FDCB6E" />;
    if (rank === 2) return <Medal size={18} color="#B2BEC3" />;
    if (rank === 3) return <Medal size={18} color="#CD7F32" />;
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
    <div className="page-wrapper">
      <Navbar />
      <div className="bg-blob" style={{ top: '-50px', right: '20%',  width: 450, height: 450, background: '#FDCB6E', opacity: 0.1 }} />
      <div className="bg-blob" style={{ bottom: '10%', left: '5%',   width: 350, height: 350, background: '#6C5CE7', opacity: 0.08, animationDelay: '-8s' }} />

      <div className="main-content" style={{ maxWidth: 760 }}>

        {/* Header */}
        <div className="animate-slide-down" style={{ marginBottom: 36, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #FDCB6E30, #FDCB6E10)', border: '1px solid #FDCB6E40', marginBottom: 16 }}>
            <Trophy size={28} color="#FDCB6E" />
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 900, fontFamily: "'Outfit', sans-serif", marginBottom: 6 }}>Global Leaderboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Top athletes ranked by total correct reps</p>
        </div>

        {leaders.length === 0 ? (
          <div className="glass-card-strong animate-scale-in" style={{ textAlign: 'center', padding: '70px 40px' }}>
            <Trophy size={56} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.3 }} />
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No Rankings Yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Complete workouts to appear here!</p>
            <Link to="/workout" className="btn-skeu btn-skeu-primary" style={{ padding: '12px 28px' }}>
              <Activity size={16} /> Start Working Out
            </Link>
          </div>
        ) : (
          <>
            {/* ── Podium ───────────────────────────── */}
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
                      {rank === 1 && <Star size={20} color="#FDCB6E" style={{ marginBottom: 6 }} />}
                      {/* Avatar */}
                      <div style={{
                        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
                        border: `3px solid ${color}`, marginBottom: 8,
                        boxShadow: `0 0 24px ${color}50`
                      }}>
                        {leader.photoURL
                          ? <img src={leader.photoURL} alt={leader.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${color}50, ${color}25)`, fontWeight: 800, fontSize: size * 0.38, color }}>
                              {leader.displayName?.[0]?.toUpperCase() || '?'}
                            </div>
                        }
                      </div>
                      <p style={{ fontWeight: 800, fontSize: 13, textAlign: 'center', marginBottom: 3, color: 'var(--text-primary)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                        {leader.displayName}
                      </p>
                      <p style={{ fontWeight: 900, fontSize: 15, color, fontFamily: "'Outfit', sans-serif" }}>
                        {leader.totalReps.toLocaleString()}
                      </p>
                      {/* Podium bar */}
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

            {/* ── Full Rankings ─────────────────────── */}
            <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {leaders.map((leader, idx) => {
                const rank = idx + 1;
                const isMe = leader.id === currentUserId;
                const color = podiumColors[rank];
                return (
                  <div key={leader.id} className="glass-card" style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderRadius: 16,
                    background: rank <= 3 ? `linear-gradient(135deg, ${color}10, transparent)` : undefined,
                    border: isMe ? `1px solid var(--primary)` : rank <= 3 ? `1px solid ${color}30` : undefined,
                    boxShadow: isMe ? `0 0 0 1px var(--primary-light), var(--shadow-sm)` : undefined
                  }}>
                    <div style={{ width: 32, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                      {getRankBadge(rank)}
                    </div>
                    {/* Avatar */}
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                      background: rank <= 3 ? `linear-gradient(135deg, ${color}40, ${color}20)` : 'var(--gradient-primary)',
                      border: `2px solid ${rank <= 3 ? color + '50' : 'var(--border-color)'}`
                    }}>
                      {leader.photoURL
                        ? <img src={leader.photoURL} alt={leader.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: rank <= 3 ? color : 'white' }}>
                            {leader.displayName?.[0]?.toUpperCase() || '?'}
                          </div>
                      }
                    </div>
                    {/* Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: isMe ? 'var(--primary)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {leader.displayName}
                        {isMe && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: 'var(--primary-light)', opacity: 0.9 }}>(You)</span>}
                      </p>
                      <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {leader.streak > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Flame size={11} color="#FD79A8" /> {leader.streak}d
                          </span>
                        )}
                        {leader.totalMinutes > 0 && <span>{leader.totalMinutes}m active</span>}
                      </div>
                    </div>
                    {/* Score */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: rank <= 3 ? color : 'var(--text-primary)' }}>
                        {leader.totalReps.toLocaleString()}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>reps</p>
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
