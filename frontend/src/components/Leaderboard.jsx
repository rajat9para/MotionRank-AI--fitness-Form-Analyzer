import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getLeaderboard } from '../db';
import { ArrowLeft, Trophy, Medal, Flame, Crown, Activity } from 'lucide-react';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        navigate('/');
        return;
      }
      setCurrentUserId(firebaseUser.uid);

      try {
        const data = await getLeaderboard();
        setLeaders(data);
      } catch (err) {
        console.error("Error loading leaderboard:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown size={22} className="text-yellow-400" />;
    if (rank === 2) return <Medal size={22} className="text-gray-300" />;
    if (rank === 3) return <Medal size={22} className="text-amber-600" />;
    return <span className="text-gray-500 font-bold text-lg w-[22px] text-center">{rank}</span>;
  };

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/15 to-transparent border-gray-400/20';
    if (rank === 3) return 'bg-gradient-to-r from-amber-700/20 to-transparent border-amber-700/30';
    return 'bg-white/5 border-white/5';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans">
      {/* Background Glows */}
      <div className="fixed top-0 right-1/4 w-[500px] h-[500px] bg-[#FF007F]/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="fixed bottom-0 left-1/4 w-[500px] h-[500px] bg-[#00E5FF]/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="relative max-w-3xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Link to="/dashboard" className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" id="leaderboard-back">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="text-yellow-400" size={28} />
              Global Leaderboard
            </h1>
            <p className="text-gray-400 mt-1">Top athletes ranked by total correct reps</p>
          </div>
        </div>

        {/* Leaderboard List */}
        {leaders.length > 0 ? (
          <div className="flex flex-col gap-3">
            {leaders.map((leader, idx) => {
              const rank = idx + 1;
              const isCurrentUser = leader.id === currentUserId;

              return (
                <div 
                  key={leader.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-md transition-all hover:scale-[1.01] ${getRankBg(rank)} ${isCurrentUser ? 'ring-2 ring-[#00E5FF]/50' : ''}`}
                >
                  {/* Rank */}
                  <div className="w-10 flex justify-center">
                    {getRankIcon(rank)}
                  </div>

                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#00E5FF]/30 to-[#FF007F]/30 border border-white/20 flex-shrink-0">
                    {leader.photoURL ? (
                      <img src={leader.photoURL} alt={leader.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white/60">
                        {leader.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate ${isCurrentUser ? 'text-[#00E5FF]' : ''}`}>
                      {leader.displayName}
                      {isCurrentUser && <span className="text-xs text-[#00E5FF]/60 ml-2">(You)</span>}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      {leader.streak > 0 && (
                        <span className="flex items-center gap-1">
                          <Flame size={12} className="text-[#FF007F]" /> {leader.streak}d streak
                        </span>
                      )}
                      {leader.totalMinutes > 0 && (
                        <span>{leader.totalMinutes}m active</span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className={`text-xl font-bold ${rank <= 3 ? 'text-[#00E5FF]' : ''}`}>
                      {leader.totalReps.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">reps</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
            <Trophy size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No Rankings Yet</h3>
            <p className="text-gray-500 mb-6">Complete workouts to appear on the leaderboard!</p>
            <Link to="/workout" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00E5FF] to-[#0088FF] text-black font-bold rounded-xl hover:scale-105 transition-transform">
              <Activity size={18} /> Start Working Out
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
