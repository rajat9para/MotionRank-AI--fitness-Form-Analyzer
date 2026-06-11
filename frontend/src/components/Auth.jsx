import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { saveUserProfile } from '../db';
import { useTheme } from '../ThemeContext';
import { Dumbbell, Sun, Moon, Eye, EyeOff, Zap, BarChart2, Users, Trophy } from 'lucide-react';

const FEATURES = [
  { icon: Zap,       color: '#6C5CE7', title: 'AI Form Analysis',     desc: 'Real-time skeleton tracking with instant feedback' },
  { icon: BarChart2, color: '#00B894', title: 'Progress Analytics',   desc: 'LeetCode-style heatmaps & performance radars' },
  { icon: Users,     color: '#FD79A8', title: 'Social Fitness',        desc: 'Find friends & compete on global leaderboards' },
  { icon: Trophy,    color: '#FDCB6E', title: 'Voice Coach',           desc: 'AI coach speaks corrections & motivation live' },
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username });
        await saveUserProfile(cred.user.uid, { displayName: username, email, photoURL: null });
      }
      navigate('/dashboard');
    } catch (err) {
      const map = {
        'auth/email-already-in-use': 'Email already registered. Try signing in.',
        'auth/invalid-email': 'Please enter a valid email.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/user-not-found': 'No account with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      };
      setError(map[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await saveUserProfile(result.user.uid, {
        displayName: result.user.displayName || 'User',
        email: result.user.email,
        photoURL: result.user.photoURL || null
      });
      navigate('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Ensure your domain is authorized in Firebase.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--gradient-page)',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Hero video background — very low opacity so text stays readable */}
      <video
        autoPlay muted loop playsInline
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 0, opacity: isDark ? 0.15 : 0.10,
          pointerEvents: 'none', filter: 'blur(1px)'
        }}
      >
        <source src={import.meta.env.VITE_HERO_VIDEO_URL || "/assets/hero-video.mp4"} type="video/mp4" />
      </video>

      {/* Theme-aware background image as secondary layer */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: isDark ? "url('/assets/bg-dark.png')" : "url('/assets/bg-light.png')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: isDark ? 0.18 : 0.12,
        pointerEvents: 'none', transition: 'opacity 0.5s ease'
      }} />

      {/* Gradient overlay for text readability */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: isDark
          ? 'linear-gradient(135deg, rgba(13,13,26,0.88) 0%, rgba(22,22,46,0.75) 50%, rgba(19,13,26,0.85) 100%)'
          : 'linear-gradient(135deg, rgba(250,251,255,0.82) 0%, rgba(232,234,255,0.70) 50%, rgba(255,240,245,0.80) 100%)',
        pointerEvents: 'none'
      }} />

      {/* Animated bg blobs */}
      <div className="bg-blob" style={{ top: '5%',  left: '5%',   width: 500, height: 500, background: '#6C5CE7' }} />
      <div className="bg-blob" style={{ bottom: '0', right: '30%', width: 400, height: 400, background: '#FD79A8', animationDelay: '-7s' }} />
      <div className="bg-blob" style={{ top: '40%', right: '5%',   width: 300, height: 300, background: '#00CEC9', animationDelay: '-14s' }} />

      {/* Theme toggle */}
      <button className="theme-toggle" onClick={toggleTheme} id="auth-theme-toggle"
        style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* ── Left Panel ─────────────────────────────────── */}
      <div style={{
        flex: '0 0 42%', padding: '60px 56px', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(135deg, #6C5CE7, #FD79A8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(108,92,231,0.4)'
          }}>
            <Dumbbell size={26} color="white" />
          </div>
          <div>
            <span className="gradient-text" style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Outfit', sans-serif", display: 'block', lineHeight: 1.1 }}>
              MotionRank
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700 }}>
              AI FITNESS
            </span>
          </div>
        </div>

        <h1 style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.15, marginBottom: 18, fontFamily: "'Outfit', sans-serif" }}>
          Train Smarter.<br />
          <span className="gradient-text">Rank Higher.</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7, marginBottom: 40, maxWidth: 380 }}>
          AI-powered form analysis, real-time voice coaching, and gamified progress tracking — all in one platform.
        </p>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: `${color}18`,
                border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{title}</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel (Form) ──────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', position: 'relative', zIndex: 1,
      }}>
        <div className="glass-card-strong animate-scale-in" style={{
          width: '100%', maxWidth: 440, padding: '44px 40px',
        }}>
          {/* Heading */}
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, fontFamily: "'Outfit', sans-serif" }}>
            {isLogin ? 'Welcome back 👋' : 'Create your account'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
            {isLogin ? 'Sign in to continue your fitness journey' : 'Start training smarter today'}
          </p>

          {/* Error */}
          {error && (
            <div className="animate-slide-down" style={{
              marginBottom: 16, padding: '12px 16px', borderRadius: 12,
              background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)',
              color: 'var(--danger)', fontSize: 13, fontWeight: 500, textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!isLogin && (
              <input type="text" placeholder="Full Name" value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-glass" required id="auth-username" />
            )}
            <input type="email" placeholder="Email Address" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-glass" required id="auth-email" />

            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-glass" required minLength={6} id="auth-password"
                style={{ paddingRight: 48 }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4
                }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-skeu btn-skeu-primary" id="auth-submit"
              style={{ marginTop: 6, padding: '14px 24px', fontSize: 15, width: '100%' }}>
              {loading
                ? <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                : (isLogin ? 'Sign In' : 'Create Account')
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading} className="btn-skeu btn-skeu-secondary" id="google-signin"
            style={{ width: '100%', padding: '13px 24px', fontSize: 14 }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Toggle */}
          <div style={{ marginTop: 22, textAlign: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} id="auth-toggle"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--primary)', fontSize: 14, fontWeight: 700,
                fontFamily: "'Inter', sans-serif"
              }}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>

      {/* Hide left panel on small screens */}
      <style>{`
        @media (max-width: 900px) {
          .auth-left { display: none !important; }
        }
      `}</style>
    </div>
  );
}
