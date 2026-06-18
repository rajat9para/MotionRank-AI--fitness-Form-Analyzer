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
import { Dumbbell, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useTheme } from '../ThemeContext';

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
      // Fire-and-forget profile save to speed up login
      saveUserProfile(result.user.uid, {
        displayName: result.user.displayName || 'User',
        email: result.user.email,
        photoURL: result.user.photoURL || null
      }).catch(e => console.warn('Profile save (background):', e));
      
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
    <div className="mr-cine" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="mr-grain" />

      {/* Top Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 40px', position: 'relative', zIndex: 10
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
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
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.28em', color: 'var(--volt)', textTransform: 'uppercase' }}>
              AI Fitness
            </span>
          </div>
        </div>

        {/* Theme Toggle Slider */}
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" id="theme-toggle-btn">
          <div className="theme-toggle-icons">
            <Sun size={14} color={isDark ? '#6d6d68' : '#0a0a0d'} />
            <Moon size={14} color={isDark ? '#c6f135' : '#6d6d68'} />
          </div>
          <div className={`theme-toggle-knob ${isDark ? 'dark' : 'light'}`}>
            {isDark ? <Moon size={14} color="#0a0a0d" /> : <Sun size={14} color="#0a0a0d" />}
          </div>
        </button>
      </div>

      {/* Centered Form Container */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', position: 'relative', zIndex: 2,
      }}>
        <div className="mr-card animate-scale-in" style={{
          width: '100%', maxWidth: 440, padding: '44px 40px',
          background: 'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
          borderColor: 'rgba(255,255,255,0.08)',
        }}>
          {/* Heading */}
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, fontFamily: "'Outfit', sans-serif", color: 'var(--ink)', textAlign: 'center' }}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ color: 'var(--ink-dim)', fontSize: 14, marginBottom: 28, textAlign: 'center' }}>
            {isLogin ? 'Enter your details to access your dashboard' : 'Sign up to start tracking your fitness journey'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-glass"
                  placeholder="Athlete name"
                  required
                  id="auth-username"
                />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glass"
                placeholder="you@example.com"
                required
                id="auth-email"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-glass"
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: 44 }}
                  id="auth-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 4
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="animate-slide-down" style={{
                padding: '10px 14px', background: 'rgba(255,107,107,0.1)',
                border: '1px solid rgba(255,107,107,0.3)', borderRadius: 12,
                color: '#FF6B6B', fontSize: 13, fontWeight: 600
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mr-btn mr-btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              id="auth-submit-btn"
            >
              {loading ? <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mr-btn mr-btn-ghost"
            style={{ width: '100%', border: '1px solid var(--line-strong)' }}
            id="auth-google-btn"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--ink-dim)' }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              style={{
                background: 'none', border: 'none', color: 'var(--volt)',
                fontWeight: 700, marginLeft: 6, cursor: 'pointer', fontFamily: "'Inter', sans-serif"
              }}
              id="auth-toggle-mode"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
