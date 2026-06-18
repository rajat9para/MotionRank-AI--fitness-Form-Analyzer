import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useTheme } from '../ThemeContext';
import { Activity, Play, Trophy, User, LogOut, Sun, Moon, Menu, X, Dumbbell, Heart, MessageSquare, Shield, Bug } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setIsAdmin(u?.email === 'rajat@example.com' || u?.email === 'admin@motionrank.com');
    });
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  const links = [
    { to: '/dashboard', icon: Activity, label: 'Dashboard' },
    { to: '/workout', icon: Play, label: 'Workout' },
    { to: '/community', icon: MessageSquare, label: 'Community' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/friends', icon: Heart, label: 'Friends' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  if (isAdmin) {
    links.push({ to: '/admin', icon: Shield, label: 'Admin' });
  }
  links.push({ to: '/report-bug', icon: Bug, label: 'Report Bug' });

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 38, height: 38,
            borderRadius: 11,
            background: 'var(--volt)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(198, 241, 53, 0.35)'
          }}>
            <Dumbbell size={20} color="#0a0a0d" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
            <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              MotionRank
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', color: 'var(--volt)', textTransform: 'uppercase' }}>
              AI Fitness
            </span>
          </div>
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
          {/* Theme Toggle — Sliding Pill */}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" id="theme-toggle-btn">
            <div className="theme-toggle-icons">
              <Sun size={14} color={isDark ? '#6d6d68' : '#0a0a0d'} />
              <Moon size={14} color={isDark ? '#c6f135' : '#6d6d68'} />
            </div>
            <div className={`theme-toggle-knob ${isDark ? 'dark' : 'light'}`}>
              {isDark ? <Moon size={14} color="#0a0a0d" /> : <Sun size={14} color="#0a0a0d" />}
            </div>
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
            className="mr-btn mr-btn-ghost"
            style={{ padding: '8px 14px', fontSize: 13, border: '1px solid var(--line-strong)' }}
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
