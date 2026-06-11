import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame, Medal, Activity, CheckCircle, Play, LogOut, User, Trophy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { getUserProfile, getWeeklyActivity, getUserSessions } from '../db';

const fallbackData = [
  { day: 'Mon', reps: 0 }, { day: 'Tue', reps: 0 },
  { day: 'Wed', reps: 0 }, { day: 'Thu', reps: 0 },
  { day: 'Fri', reps: 0 }, { day: 'Sat', reps: 0 },
  { day: 'Sun', reps: 0 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [weeklyData, setWeeklyData] = useState(fallbackData);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        navigate('/');
        return;
      }
      setUser(firebaseUser);

      try {
        // Fetch user profile
        const profileData = await getUserProfile(firebaseUser.uid);
        setProfile(profileData);

        // Fetch weekly chart data
        const weekly = await getWeeklyActivity(firebaseUser.uid);
        if (weekly.length > 0) setWeeklyData(weekly);

        // Fetch recent sessions
        const sessions = await getUserSessions(firebaseUser.uid);
        setRecentSessions(sessions.slice(0, 5));
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  const displayName = user?.displayName || profile?.displayName || 'Athlete';
  const totalReps = profile?.totalReps || 0;
  const totalMinutes = profile?.totalMinutes || 0;
  const streak = profile?.streak || 0;

  // Calculate average form score from recent sessions
  const avgFormScore = recentSessions.length > 0
    ? Math.round(recentSessions.reduce((sum, s) => sum + (s.formScore || 0), 0) / recentSessions.length)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white flex font-sans">
      
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white/5 border-r border-white/10 p-6 flex flex-col justify-between backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#FF007F]">
            AI Fitness Form
          </h1>
          <nav className="flex flex-col gap-2 mt-8">
            <Link to="/dashboard" className="flex items-center gap-3 text-[#00E5FF] font-semibold bg-[#00E5FF]/10 px-4 py-2.5 rounded-lg" id="nav-dashboard">
              <Activity size={18} /> Dashboard
            </Link>
            <Link to="/workout" className="flex items-center gap-3 text-gray-400 hover:text-white px-4 py-2.5 transition-colors rounded-lg hover:bg-white/5" id="nav-workout">
              <Play size={18} /> Workout
            </Link>
            <Link to="/leaderboard" className="flex items-center gap-3 text-gray-400 hover:text-white px-4 py-2.5 transition-colors rounded-lg hover:bg-white/5" id="nav-leaderboard">
              <Trophy size={18} /> Leaderboard
            </Link>
            <Link to="/profile" className="flex items-center gap-3 text-gray-400 hover:text-white px-4 py-2.5 transition-colors rounded-lg hover:bg-white/5" id="nav-profile">
              <User size={18} /> Profile
            </Link>
          </nav>
        </div>

        {/* Sign Out */}
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-3 text-gray-500 hover:text-red-400 px-4 py-2.5 transition-colors rounded-lg hover:bg-red-500/10 mt-auto"
          id="sign-out-btn"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 overflow-y-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-bold">Welcome back, {displayName}!</h2>
            <p className="text-gray-400 mt-1">Let's crush today's workout</p>
          </div>
          <div className="flex items-center gap-4">
            {streak > 0 && (
              <div className="flex items-center gap-2 bg-[#FF007F]/10 border border-[#FF007F]/30 px-4 py-2 rounded-full shadow-[0_0_10px_rgba(255,0,127,0.2)]">
                <Flame size={20} color="#FF007F" />
                <span className="font-bold text-[#FF007F]">{streak} Day Streak</span>
              </div>
            )}
            <Link to="/workout" className="flex items-center gap-2 bg-gradient-to-r from-[#00E5FF] to-[#0088FF] text-black px-6 py-3 rounded-full font-bold shadow-[0_0_15px_rgba(0,229,255,0.4)] hover:scale-105 transition-transform" id="start-workout-btn">
              <Play size={18} fill="currentColor" /> Start Workout
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md hover:bg-white/[0.07] transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2.5 bg-[#00E5FF]/10 rounded-xl">
                <Activity className="text-[#00E5FF]" size={22} />
              </div>
              <h3 className="text-gray-400 font-semibold">Total Correct Reps</h3>
            </div>
            <p className="text-4xl font-bold">{totalReps.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md hover:bg-white/[0.07] transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2.5 bg-[#FF007F]/10 rounded-xl">
                <CheckCircle className="text-[#FF007F]" size={22} />
              </div>
              <h3 className="text-gray-400 font-semibold">Avg Form Score</h3>
            </div>
            <p className="text-4xl font-bold text-[#FF007F]">{avgFormScore > 0 ? `${avgFormScore}%` : '—'}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md hover:bg-white/[0.07] transition-colors">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2.5 bg-orange-500/10 rounded-xl">
                <Flame className="text-orange-500" size={22} />
              </div>
              <h3 className="text-gray-400 font-semibold">Active Minutes</h3>
            </div>
            <p className="text-4xl font-bold">{totalMinutes > 0 ? `${totalMinutes}m` : '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <h3 className="text-xl font-bold mb-6">Weekly Activity</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis dataKey="day" stroke="#666" />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} 
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="reps" fill="#00E5FF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Sessions / Achievements */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <h3 className="text-xl font-bold mb-6">
              {recentSessions.length > 0 ? 'Recent Workouts' : 'Achievements'}
            </h3>
            <div className="flex flex-col gap-4">
              {recentSessions.length > 0 ? (
                recentSessions.map((session, idx) => (
                  <div key={session.id || idx} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="p-2 bg-[#00E5FF]/10 rounded-full">
                      <Activity className="text-[#00E5FF]" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold capitalize text-sm">{session.exerciseType || 'Workout'}</p>
                      <p className="text-xs text-gray-400">
                        {session.correctReps} reps • {session.timestamp ? new Date(session.timestamp).toLocaleDateString() : ''}
                      </p>
                    </div>
                    {session.formScore > 0 && (
                      <span className="text-[#00E5FF] font-bold text-sm">{session.formScore}%</span>
                    )}
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/30">
                    <div className="bg-yellow-500/20 p-2 rounded-full">
                      <Medal className="text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-bold text-yellow-400">Form Master</p>
                      <p className="text-xs text-gray-400">95%+ accuracy session</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-gray-400/20 to-transparent border border-gray-400/30">
                    <div className="bg-gray-400/20 p-2 rounded-full">
                      <Medal className="text-gray-300" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-300">Consistency King</p>
                      <p className="text-xs text-gray-400">7 day streak</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
