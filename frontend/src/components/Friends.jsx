import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import {
  searchUsersByName, sendFriendRequest, getFriendRequests,
  acceptFriendRequest, declineFriendRequest, getFriends, removeFriend
} from '../db';
import { Search, UserPlus, UserCheck, UserX, Users, X, Check, Flame, Activity, Heart } from 'lucide-react';
import Navbar from './Navbar';
import EmptyState from './EmptyState';
import { useToast } from '../ToastContext';

export default function Friends() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const searchTimeout = useRef(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Friend requests
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);

  // UI
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests' | 'search'
  const [processingIds, setProcessingIds] = useState(new Set());

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        navigate('/');
        return;
      }
      setUser(firebaseUser);

      try {
        const [friendsData, requestsData] = await Promise.all([
          getFriends(firebaseUser.uid),
          getFriendRequests(firebaseUser.uid)
        ]);
        setFriends(friendsData);
        setFriendRequests(requestsData);
      } catch (err) {
        console.error("Error loading friends:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Debounced search
  const handleSearch = (value) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchUsersByName(value, user?.uid);
      setSearchResults(results);
      setSearching(false);
    }, 400);
  };

  const handleSendRequest = async (toUserId) => {
    if (!user) return;
    setProcessingIds(prev => new Set(prev).add(toUserId));

    const result = await sendFriendRequest(
      user.uid, toUserId,
      user.displayName || 'User',
      user.photoURL || null
    );

    addToast(result.message, result.success ? 'success' : 'error');

    if (result.success && result.message.includes('now friends')) {
      // Refresh friends list
      const updated = await getFriends(user.uid);
      setFriends(updated);
    }

    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(toUserId);
      return next;
    });
  };

  const handleAcceptRequest = async (requestId, fromUserId) => {
    if (!user) return;
    setProcessingIds(prev => new Set(prev).add(requestId));

    const success = await acceptFriendRequest(requestId, user.uid, fromUserId);
    if (success) {
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));
      const updated = await getFriends(user.uid);
      setFriends(updated);
      addToast('Friend added!', 'success');
    } else {
      addToast('Failed to accept request', 'error');
    }

    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(requestId);
      return next;
    });
  };

  const handleDeclineRequest = async (requestId) => {
    setProcessingIds(prev => new Set(prev).add(requestId));

    const success = await declineFriendRequest(requestId);
    if (success) {
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));
    }

    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(requestId);
      return next;
    });
  };

  const handleRemoveFriend = async (friendId) => {
    if (!user) return;
    setProcessingIds(prev => new Set(prev).add(friendId));

    const success = await removeFriend(user.uid, friendId);
    if (success) {
      setFriends(prev => prev.filter(f => f.id !== friendId));
      addToast('Friend removed', 'info');
    }

    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(friendId);
      return next;
    });
  };

  const friendIds = new Set(friends.map(f => f.id));

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper mr-cine" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className="mr-grain" />

      {/* Background blobs */}
      <div className="bg-blob" style={{ top: '-60px', left: '25%', width: 380, height: 380, background: 'var(--volt)', opacity: 0.15, filter: 'blur(100px)' }} />
      <div className="bg-blob" style={{ bottom: '5%', right: '15%', width: 300, height: 300, background: 'rgba(108, 92, 231, 0.25)', opacity: 0.15, animationDelay: '-6s', filter: 'blur(120px)' }} />

      <div className="main-content" style={{ maxWidth: 720, position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <div className="animate-slide-down" style={{ marginBottom: 36 }}>
          <div className="mr-eyebrow" style={{ marginBottom: 12 }}>SOCIAL</div>
          <h1 style={{
            fontSize: 44, fontWeight: 900, fontFamily: "'Outfit', sans-serif",
            display: 'flex', alignItems: 'center', gap: 14, color: 'var(--ink)', marginBottom: 8
          }}>
            <Heart color="var(--volt)" size={32} /> Friends
          </h1>
          <p style={{ color: 'var(--ink-dim)', fontSize: 16 }}>
            Find workout buddies and track each other's progress
          </p>
        </div>

        {/* Tabs */}
        <div className="mr-card animate-slide-up" style={{
          display: 'flex', gap: 0, marginBottom: 32,
          padding: 6, borderRadius: 16, background: 'var(--panel)'
        }}>
          {[
            { id: 'friends', label: 'My Friends', icon: Users, count: friends.length },
            { id: 'requests', label: 'Requests', icon: UserPlus, count: friendRequests.length },
            { id: 'search', label: 'Find People', icon: Search, count: null },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              id={`tab-${id}`}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 8px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: activeTab === id ? 'var(--volt)' : 'transparent',
                color: activeTab === id ? '#0a0a0d' : 'var(--ink-dim)',
                fontWeight: 800, fontSize: 14, fontFamily: "'Inter', sans-serif",
                transition: 'all 0.25s ease'
              }}
            >
              <Icon size={18} />
              {label}
              {count > 0 && (
                <span style={{
                  background: activeTab === id ? 'rgba(0,0,0,0.15)' : 'var(--volt-dim)',
                  color: activeTab === id ? '#0a0a0d' : 'var(--volt)',
                  borderRadius: 20, padding: '2px 8px',
                  fontSize: 12, fontWeight: 800, minWidth: 22, textAlign: 'center'
                }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Search Tab ─────────────────────────────────────── */}
        {activeTab === 'search' && (
          <div className="animate-fade-in">
            {/* Search input */}
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <Search size={18} style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="text"
                placeholder="Search by name (min 2 characters)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="input-glass"
                style={{ paddingLeft: 46 }}
                id="friend-search-input"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Search results */}
            {searching ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div className="loading-spinner" style={{ margin: '0 auto', width: 28, height: 28 }} />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchResults.map((person) => (
                  <div key={person.id} className="mr-card" style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderRadius: 16,
                    background: 'var(--panel)', border: '1px solid var(--line)'
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', overflow: 'hidden',
                      background: 'var(--volt-dim)',
                      border: '2px solid var(--line-strong)', flexShrink: 0
                    }}>
                      {person.photoURL ? (
                        <img src={person.photoURL} alt={person.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 18, color: 'var(--volt)'
                        }}>
                          {person.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>{person.displayName}</p>
                      <p style={{ fontSize: 13, color: 'var(--ink-dim)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ fontWeight: 600 }}>{person.totalReps} reps</span>
                        {person.streak > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#FD79A8', fontWeight: 600 }}>
                            <Flame size={13} /> {person.streak}d
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Action */}
                    {friendIds.has(person.id) ? (
                      <span className="mr-btn mr-btn-ghost" style={{ padding: '8px 16px', fontSize: 13, cursor: 'default', opacity: 0.7, border: '1px solid var(--line-strong)' }}>
                        <UserCheck size={16} /> Friends
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(person.id)}
                        disabled={processingIds.has(person.id)}
                        className="mr-btn mr-btn-primary"
                        style={{ padding: '10px 20px', fontSize: 14 }}
                        id={`add-friend-${person.id}`}
                      >
                        {processingIds.has(person.id) ? (
                          <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: '#0a0a0d', borderTopColor: 'transparent' }} />
                        ) : (
                          <><UserPlus size={16} /> Add</>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <EmptyState
                icon={Search}
                title="No users found"
                subtitle={`Nobody matched "${searchQuery}". Try a different name.`}
              />
            ) : (
              <EmptyState
                icon={Search}
                title="Find workout buddies"
                subtitle="Type a name to search for people and send a friend request."
              />
            )}
          </div>
        )}

        {/* ── Requests Tab ───────────────────────────────────── */}
        {activeTab === 'requests' && (
          <div className="animate-fade-in">
            {friendRequests.length > 0 ? (
              <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {friendRequests.map((req) => (
                  <div key={req.id} className="mr-card" style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderRadius: 16,
                    border: '1px solid var(--volt)', background: 'var(--panel)',
                    boxShadow: '0 0 20px rgba(198,241,53,0.1)'
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 50, height: 50, borderRadius: '50%', overflow: 'hidden',
                      background: 'var(--volt-dim)',
                      border: '2px solid var(--line-strong)', flexShrink: 0
                    }}>
                      {req.fromPhotoURL ? (
                        <img src={req.fromPhotoURL} alt={req.fromDisplayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 20, color: 'var(--volt)'
                        }}>
                          {req.fromDisplayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>{req.fromDisplayName}</p>
                      <p style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 2 }}>
                        Wants to be your friend • {req.timestamp ? new Date(req.timestamp).toLocaleDateString() : ''}
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => handleAcceptRequest(req.id, req.from)}
                        disabled={processingIds.has(req.id)}
                        className="mr-btn mr-btn-primary"
                        style={{ padding: '10px 16px', fontSize: 14 }}
                      >
                        <Check size={16} /> Accept
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req.id)}
                        disabled={processingIds.has(req.id)}
                        className="mr-btn mr-btn-ghost"
                        style={{ padding: '10px 16px', fontSize: 14, border: '1px solid var(--line-strong)' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={UserPlus}
                title="No Pending Requests"
                subtitle="When someone sends you a friend request, it'll appear here."
              />
            )}
          </div>
        )}

        {/* ── Friends Tab ────────────────────────────────────── */}
        {activeTab === 'friends' && (
          <div className="animate-fade-in">
            {friends.length > 0 ? (
              <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {friends.map((friend) => (
                  <div key={friend.id} className="mr-card" style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderRadius: 16,
                    background: 'var(--panel)', border: '1px solid var(--line)'
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', overflow: 'hidden',
                      background: 'var(--volt-dim)',
                      border: '2px solid var(--line-strong)', flexShrink: 0
                    }}>
                      {friend.photoURL ? (
                        <img src={friend.photoURL} alt={friend.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 18, color: 'var(--volt)'
                        }}>
                          {friend.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {friend.displayName}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--ink-dim)', marginTop: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <Activity size={13} color="var(--volt)" /> {friend.totalReps} reps
                        </span>
                        {friend.streak > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#FD79A8', fontWeight: 600 }}>
                            <Flame size={13} /> {friend.streak}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      disabled={processingIds.has(friend.id)}
                      className="mr-btn mr-btn-ghost"
                      style={{ padding: '10px 14px', fontSize: 14, color: 'var(--danger)', border: '1px solid rgba(255,107,107,0.3)' }}
                      title="Remove friend"
                    >
                      {processingIds.has(friend.id) ? (
                        <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'var(--danger)', borderTopColor: 'transparent' }} />
                      ) : (
                        <UserX size={16} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mr-card empty-state" style={{ padding: '60px 40px', background: 'var(--panel)', border: '1px solid var(--line)' }}>
                <Users size={56} color="var(--ink-faint)" />
                <h3 style={{ fontWeight: 900, fontSize: 24, marginTop: 16, color: 'var(--ink)', fontFamily: "'Outfit', sans-serif" }}>No Friends Yet</h3>
                <p style={{ color: 'var(--ink-dim)', fontSize: 15, marginTop: 8, marginBottom: 24 }}>Search for workout buddies and add them to your friends list!</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="mr-btn mr-btn-primary"
                  style={{ padding: '14px 32px', fontSize: 16 }}
                >
                  <Search size={18} /> Find People
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
