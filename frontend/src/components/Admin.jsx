import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getAllUsers, getAdminStats, banUser, unbanUser, getBugReports, updateBugReportStatus, createAnnouncement, getAnnouncements, toggleAnnouncement } from '../adminDb';
import { Users, Shield, BarChart3, Megaphone, AlertTriangle, CheckCircle, Send } from 'lucide-react';
import Navbar from './Navbar';
import { useToast } from '../ToastContext';

export default function Admin() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalSessions: 0, openBugReports: 0, totalReps: 0 });
  const [users, setUsers] = useState([]);
  const [bugReports, setBugReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  const ADMIN_EMAILS = ['rajat@example.com', 'admin@motionrank.com'];

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { navigate('/'); return; }
      if (!ADMIN_EMAILS.includes(u.email)) {
        navigate('/dashboard');
        return;
      }
      setUser(u);

      try {
        const [adminStats, allUsers, reports, anns] = await Promise.all([
          getAdminStats(),
          getAllUsers(),
          getBugReports(),
          getAnnouncements()
        ]);
        setStats(adminStats);
        setUsers(allUsers);
        setBugReports(reports);
        setAnnouncements(anns);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleBan = async (userId) => {
    await banUser(userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: true } : u));
    addToast('User banned', 'success');
  };

  const handleUnban = async (userId) => {
    await unbanUser(userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: false } : u));
    addToast('User unbanned', 'success');
  };

  const handleBugStatus = async (reportId, status) => {
    await updateBugReportStatus(reportId, status);
    setBugReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
    addToast(`Bug marked as ${status}`, 'success');
  };

  const handleAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMsg.trim()) {
      addToast('Title and message required', 'warning');
      return;
    }
    setSendingAnnouncement(true);
    try {
      await createAnnouncement(announcementTitle.trim(), announcementMsg.trim(), user.email);
      setAnnouncementTitle('');
      setAnnouncementMsg('');
      const anns = await getAnnouncements();
      setAnnouncements(anns);
      addToast('Announcement published!', 'success');
    } catch (e) {
      addToast('Failed to publish', 'error');
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const toggleActive = async (id, active) => {
    await toggleAnnouncement(id, active);
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active } : a));
  };

  if (loading) return (
    <div className="page-wrapper">
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div className="loading-spinner" />
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'bugs', label: 'Bug Reports', icon: AlertTriangle },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ];

  return (
    <div className="page-wrapper mr-cine" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className="mr-grain" />
      <div className="bg-blob" style={{ top: '-80px', right: '-80px', width: 400, height: 400, background: '#FF6B6B', opacity: 0.1, filter: 'blur(100px)' }} />

      <div className="main-content" style={{ maxWidth: 880, position: 'relative', zIndex: 2 }}>
        <div className="animate-slide-down" style={{ marginBottom: 36 }}>
          <div className="mr-eyebrow" style={{ marginBottom: 12 }}>ADMIN DASHBOARD</div>
          <h1 style={{ fontSize: 44, fontWeight: 900, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 14, color: 'var(--ink)' }}>
            <Shield color="var(--volt)" size={32} /> Admin Panel
          </h1>
        </div>

        {/* Tab Bar */}
        <div className="mr-card animate-slide-up" style={{ display: 'flex', gap: 0, padding: 0, marginBottom: 32, overflow: 'hidden', background: 'var(--panel)', border: '1px solid var(--line)' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 6, background: activeTab === tab.id ? 'var(--volt)' : 'transparent',
              border: 'none', cursor: 'pointer', borderRadius: activeTab === tab.id ? 12 : 0,
              color: activeTab === tab.id ? '#0a0a0d' : 'var(--ink-dim)',
              fontWeight: 800, fontSize: 13, transition: 'all 0.2s'
            }}>
              <tab.icon size={18} color={activeTab === tab.id ? '#0a0a0d' : 'var(--ink-dim)'} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="stats-grid animate-slide-up">
            {[
              { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'var(--volt)' },
              { label: 'Total Sessions', value: stats.totalSessions, icon: BarChart3, color: '#60A5FA' },
              { label: 'Total Reps', value: stats.totalReps.toLocaleString(), icon: CheckCircle, color: '#34D399' },
              { label: 'Open Bugs', value: stats.openBugReports, icon: AlertTriangle, color: '#FF6B6B' },
            ].map((stat, i) => (
              <div key={i} className="admin-stat-card mr-card" style={{ animationDelay: `${i * 0.08}s`, display: 'flex', alignItems: 'center', gap: 16, padding: 24, background: 'var(--panel)', border: '1px solid var(--line)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${stat.color}22, ${stat.color}11)`, flexShrink: 0, border: `1px solid ${stat.color}33` }}>
                  <stat.icon color={stat.color} size={24} />
                </div>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--ink-dim)', fontWeight: 700 }}>{stat.label}</p>
                  <p style={{ fontSize: 32, fontWeight: 900, color: 'var(--ink)', fontFamily: "'Outfit', sans-serif" }}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div className="mr-card animate-slide-up" style={{ padding: 0, overflow: 'hidden', background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 900, fontSize: 18, color: 'var(--ink)' }}>All Users ({users.length})</h3>
            </div>
            {users.map((u) => (
              <div key={u.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: u.banned ? '#FF6B6B22' : 'var(--volt-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${u.banned ? '#FF6B6B' : 'var(--line-strong)'}` }}>
                    {u.photoURL ? <img src={u.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> :
                      <span style={{ color: u.banned ? '#FF6B6B' : 'var(--volt)', fontWeight: 800, fontSize: 16 }}>{u.displayName?.[0]?.toUpperCase() || '?'}</span>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.displayName}</p>
                    <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{u.totalReps || 0} reps · {u.streak || 0} day streak</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {u.banned ? (
                    <button onClick={() => handleUnban(u.id)} className="mr-btn" style={{ padding: '8px 16px', fontSize: 13, background: '#34D39915', color: '#34D399', border: '1px solid #34D39933' }}>Unban</button>
                  ) : (
                    <button onClick={() => handleBan(u.id)} className="mr-btn" style={{ padding: '8px 16px', fontSize: 13, background: '#FF6B6B15', color: '#FF6B6B', border: '1px solid #FF6B6B33' }}>Ban</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bug Reports */}
        {activeTab === 'bugs' && (
          <div className="mr-card animate-slide-up" style={{ padding: 0, overflow: 'hidden', background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ fontWeight: 900, fontSize: 18, color: 'var(--ink)' }}>Bug Reports ({bugReports.length})</h3>
            </div>
            {bugReports.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <CheckCircle size={40} color="#34D399" style={{ margin: '0 auto' }} />
                <p style={{ color: 'var(--ink-dim)', fontSize: 15, marginTop: 12 }}>No bug reports — all clear!</p>
              </div>
            ) : bugReports.map(r => (
              <div key={r.id} style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, fontWeight: 800, background: '#FF6B6B22', color: '#FF6B6B', textTransform: 'uppercase' }}>{r.category}</span>
                    <span style={{ fontSize: 13, marginLeft: 12, color: 'var(--ink-dim)', fontWeight: 700 }}>{r.userName}</span>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{r.timestamp?.toLocaleDateString?.() || ''}</span>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink)', marginBottom: 16 }}>{r.description}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['open', 'resolved', 'wont_fix'].map(s => (
                    <button key={s} onClick={() => handleBugStatus(r.id, s)} className="mr-btn" style={{
                      padding: '8px 16px', fontSize: 13, fontWeight: 800, textTransform: 'capitalize',
                      background: r.status === s ? (s === 'resolved' ? '#34D39922' : s === 'wont_fix' ? '#FF6B6B22' : 'var(--volt-dim)') : 'transparent',
                      color: r.status === s ? (s === 'resolved' ? '#34D399' : s === 'wont_fix' ? '#FF6B6B' : 'var(--volt)') : 'var(--ink-dim)',
                      border: `1px solid ${r.status === s ? (s === 'resolved' ? '#34D39944' : s === 'wont_fix' ? '#FF6B6B44' : 'var(--line-strong)') : 'transparent'}`
                    }}>{s.replace('_', ' ')}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Announcements */}
        {activeTab === 'announcements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-slide-up">
            <div className="mr-card" style={{ padding: 32, background: 'var(--panel)', border: '1px solid var(--line)' }}>
              <h3 style={{ fontWeight: 900, fontSize: 18, color: 'var(--ink)', marginBottom: 16 }}>New Announcement</h3>
              <input type="text" value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)}
                placeholder="Title" className="input-glass" style={{ marginBottom: 16, fontSize: 15 }} />
              <textarea value={announcementMsg} onChange={e => setAnnouncementMsg(e.target.value)}
                placeholder="Message..." className="input-glass" rows={3} style={{ resize: 'none', marginBottom: 20, fontSize: 15 }} />
              <button onClick={handleAnnouncement} disabled={sendingAnnouncement} className="mr-btn mr-btn-primary" style={{ padding: '14px 28px', fontSize: 15 }}>
                {sendingAnnouncement ? <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: '#0a0a0d', borderTopColor: 'transparent' }} /> : <><Send size={16} /> Publish</>}
              </button>
            </div>

            <div className="mr-card" style={{ padding: 0, overflow: 'hidden', background: 'var(--panel)', border: '1px solid var(--line)' }}>
              {announcements.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Megaphone size={40} color="var(--ink-dim)" style={{ margin: '0 auto' }} />
                  <p style={{ color: 'var(--ink-dim)', fontSize: 15, marginTop: 12 }}>No announcements yet</p>
                </div>
              ) : announcements.map(a => (
                <div key={a.id} style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 15, color: a.active ? 'var(--ink)' : 'var(--ink-dim)' }}>{a.title}</p>
                    <p style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 4 }}>{a.message?.substring(0, 60)}{a.message?.length > 60 ? '...' : ''}</p>
                  </div>
                  <button onClick={() => toggleActive(a.id, !a.active)} className="mr-btn" style={{
                    padding: '8px 16px', fontSize: 13,
                    color: a.active ? '#34D399' : 'var(--ink-dim)',
                    background: a.active ? '#34D39915' : 'transparent',
                    border: `1px solid ${a.active ? '#34D39944' : 'transparent'}`
                  }}>{a.active ? 'Active' : 'Inactive'}</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
