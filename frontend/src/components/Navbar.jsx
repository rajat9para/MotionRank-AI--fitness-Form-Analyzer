import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useTheme } from '../ThemeContext';
import { Activity, Play, Trophy, User, LogOut, Sun, Moon, Menu, X, Dumbbell, Heart } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  const links = [
    { to: '/dashboard', icon: Activity, label: 'Dashboard' },
    { to: '/workout', icon: Play, label: 'Workout' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/friends', icon: Heart, label: 'Friends' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 38, height: 38,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6C5CE7 0%, #FD79A8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(108, 92, 231, 0.3)'
          }}>
            <Dumbbell size={20} color="white" />
          </div>
          <span className="gradient-text" style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
            MotionRank
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className={`nav-links ${mobileOpen ? 'open' : ''}`}>
          {links.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link ${isActive(to) ? 'active' : ''}`}
              id={`nav-${label.toLowerCase()}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}

          {/* Mobile-only sign out */}
          <button
            className="nav-link"
            onClick={handleSignOut}
            style={{ border: 'none', cursor: 'pointer', background: 'none', width: '100%', display: 'none' }}
            id="nav-signout-mobile"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Theme Toggle */}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" id="theme-toggle-btn">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Avatar */}
          {user && (
            <Link to="/profile" className="nav-avatar" id="nav-avatar">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} />
              ) : (
                <div className="nav-avatar-placeholder">
                  {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </Link>
          )}

          {/* Sign Out (desktop) */}
          <button
            onClick={handleSignOut}
            className="btn-skeu btn-skeu-secondary"
            style={{ padding: '8px 14px', fontSize: 13 }}
            id="sign-out-btn"
          >
            <LogOut size={14} />
            <span style={{ display: 'inline' }}>Sign Out</span>
          </button>

          {/* Mobile menu toggle */}
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} id="mobile-menu-btn">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
