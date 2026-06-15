import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import {
  searchUsersByName, sendFriendRequest, getFriendRequests,
  acceptFriendRequest, declineFriendRequest, getFriends, removeFriend
} from '../db';
import { Search, UserPlus, UserCheck, UserX, Users, X, Check, Flame, Activity, Heart } from 'lucide-react';
import Navbar from './Navbar';
import EmptyState, { EmptyFriends, EmptySearch } from './EmptyState';
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
    <div className="page-wrapper">
      <Navbar />

      {/* Background blobs */}
      <div className="bg-blob" style={{ top: '-60px', left: '25%', width: 380, height: 380, background: '#00CEC9', opacity: 0.12 }} />
      <div className="bg-blob" style={{ bottom: '5%', right: '15%', width: 300, height: 300, background: '#FD79A8', opacity: 0.1, animationDelay: '-6s' }} />

      <div className="main-content" style={{ maxWidth: 720 }}>
        {/* Header */}
        <div className="animate-slide-down" style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 32, fontWeight: 900, fontFamily: "'Outfit', sans-serif",
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <Heart color="var(--accent-pink)" size={28} /> Friends
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Find workout buddies and track each other's progress
          </p>
        </div>

        {/* Tabs */}
        <div className="animate-slide-up" style={{
          display: 'flex', gap: 6, marginBottom: 24,
          background: 'var(--glass-bg)', borderRadius: 16,
          padding: 6, border: '1px solid var(--border-light)'
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
                padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: activeTab === id ? 'var(--primary)' : 'transparent',
                color: activeTab === id ? 'white' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: 14, fontFamily: "'Inter', sans-serif",
                transition: 'all 0.25s ease',
                boxShadow: activeTab === id ? '0 4px 12px rgba(108,92,231,0.3)' : 'none'
              }}
            >
              <Icon size={16} />
              {label}
              {count > 0 && (
                <span style={{
                  background: activeTab === id ? 'rgba(255,255,255,0.25)' : 'var(--accent-pink)',
                  color: 'white', borderRadius: 20, padding: '2px 8px',
                  fontSize: 11, fontWeight: 700, minWidth: 20, textAlign: 'center'
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
                  <div key={person.id} className="glass-card" style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 16
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%', overflow: 'hidden',
                      background: 'linear-gradient(135deg, var(--primary-light), var(--accent-pink))',
                      border: '2px solid var(--border-color)', flexShrink: 0
                    }}>
                      {person.photoURL ? (
                        <img src={person.photoURL} alt={person.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 18, color: 'white'
                        }}>
                          {person.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 15 }}>{person.displayName}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span>{person.totalReps} reps</span>
                        {person.streak > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Flame size={11} color="#FD79A8" /> {person.streak}d
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Action */}
                    {friendIds.has(person.id) ? (
                      <span className="btn-skeu btn-skeu-secondary" style={{ padding: '6px 14px', fontSize: 12, cursor: 'default', opacity: 0.7 }}>
                        <UserCheck size={14} /> Friends
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(person.id)}
                        disabled={processingIds.has(person.id)}
                        className="btn-skeu btn-skeu-primary"
                        style={{ padding: '8px 16px', fontSize: 13 }}
                        id={`add-friend-${person.id}`}
                      >
                        {processingIds.has(person.id) ? (
                          <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                        ) : (
                          <><UserPlus size={14} /> Add</>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <EmptyState
                illustration={<EmptySearch />}
                title="No users found"
                subtitle={`Nobody matched "${searchQuery}". Try a different name.`}
              />
            ) : (
              <EmptyState
                illustration={<EmptySearch />}
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
                  <div key={req.id} className="glass-card" style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderRadius: 16,
                    border: '1px solid rgba(108,92,231,0.15)'
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', overflow: 'hidden',
                      background: 'linear-gradient(135deg, var(--primary-light), var(--accent-cyan))',
                      border: '2px solid var(--border-color)', flexShrink: 0
                    }}>
                      {req.fromPhotoURL ? (
                        <img src={req.fromPhotoURL} alt={req.fromDisplayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 18, color: 'white'
                        }}>
                          {req.fromDisplayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: 15 }}>{req.fromDisplayName}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Wants to be your friend • {req.timestamp ? new Date(req.timestamp).toLocaleDateString() : ''}
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleAcceptRequest(req.id, req.from)}
                        disabled={processingIds.has(req.id)}
                        className="btn-skeu btn-skeu-success"
                        style={{ padding: '8px 14px', fontSize: 13 }}
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req.id)}
                        disabled={processingIds.has(req.id)}
                        className="btn-skeu btn-skeu-secondary"
                        style={{ padding: '8px 14px', fontSize: 13 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                illustration={<EmptyFriends />}
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
                  <div key={friend.id} className="glass-card" style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderRadius: 16
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', overflow: 'hidden',
                      background: 'linear-gradient(135deg, var(--accent-green), var(--accent-cyan))',
                      border: '2px solid var(--border-color)', flexShrink: 0
                    }}>
                      {friend.photoURL ? (
                        <img src={friend.photoURL} alt={friend.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 18, color: 'white'
                        }}>
                          {friend.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {friend.displayName}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Activity size={11} color="var(--primary)" /> {friend.totalReps} reps
                        </span>
                        {friend.streak > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Flame size={11} color="#FD79A8" /> {friend.streak}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      disabled={processingIds.has(friend.id)}
                      className="btn-skeu btn-skeu-secondary"
                      style={{ padding: '8px 12px', fontSize: 12, color: 'var(--danger)' }}
                      title="Remove friend"
                    >
                      {processingIds.has(friend.id) ? (
                        <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      ) : (
                        <UserX size={14} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card-strong">
                <EmptyState
                  illustration={<EmptyFriends />}
                  title="No Friends Yet"
                  subtitle="Search for workout buddies and add them to your friends list!"
                  action={
                    <button
                      onClick={() => setActiveTab('search')}
                      className="btn-skeu btn-skeu-primary"
                      style={{ padding: '12px 28px' }}
                    >
                      <Search size={16} /> Find People
                    </button>
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
