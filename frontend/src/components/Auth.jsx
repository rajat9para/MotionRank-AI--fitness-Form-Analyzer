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
import { Dumbbell, Sun, Moon, Eye, EyeOff, ArrowLeft } from 'lucide-react';

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
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      background: 'var(--void, #050506)',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Background Image with Blur to match Landing Page Transformation theme */}
      <div style={{
        position: 'absolute', inset: -20, zIndex: 0,
        backgroundImage: "url('/assets/goggins_after.png')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(15px) brightness(0.4) contrast(1.1)',
        transform: 'scale(1.05)'
      }} />

      {/* Gradient overlay for text readability */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(135deg, rgba(10,10,13,0.7) 0%, rgba(5,5,6,0.9) 100%)',
      }} />

      {/* Top Left Navigation */}
      <button 
        onClick={() => navigate('/')}
        style={{
          position: 'absolute', top: 24, left: 24, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', color: '#f4f4f0',
          cursor: 'pointer', fontSize: 14, fontWeight: 600,
          fontFamily: "'Outfit', sans-serif", opacity: 0.7,
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
      >
        <ArrowLeft size={18} />
        Back to Home
      </button>

      {/* Theme toggle - Global Consistency */}
      <button className="theme-toggle" onClick={toggleTheme} id="auth-theme-toggle"
        style={{ 
          position: 'absolute', top: 20, right: 20, zIndex: 10,
          background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff'
        }}>
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* ── Centered Auth Form ──────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: 440, padding: '40px 24px', 
        position: 'relative', zIndex: 2,
      }}>
        <div className="animate-scale-in" style={{
          background: 'rgba(15, 15, 20, 0.65)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 24,
          padding: '44px 40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: '#c6f135',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(198,241,53,0.3)'
            }}>
              <Dumbbell size={26} color="#0a0a0d" />
            </div>
          </div>

          {/* Heading */}
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, fontFamily: "'Outfit', sans-serif", color: '#f4f4f0', textAlign: 'center' }}>
            {isLogin ? 'Welcome back' : 'Join the Forge'}
          </h2>
          <p style={{ color: '#a7a7a0', fontSize: 14, marginBottom: 28, textAlign: 'center' }}>
            {isLogin ? 'Sign in to track your transformation' : 'Create an account to begin'}
          </p>

          {/* Error */}
          {error && (
            <div className="animate-slide-down" style={{
              marginBottom: 16, padding: '12px 16px', borderRadius: 12,
              background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)',
              color: '#FF6B6B', fontSize: 13, fontWeight: 500, textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!isLogin && (
              <input type="text" placeholder="Full Name" value={username}
                onChange={(e) => setUsername(e.target.value)}
                required id="auth-username" 
                style={{
                  width: '100%', padding: '14px 18px', borderRadius: 14,
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#c6f135'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            )}
            <input type="email" placeholder="Email Address" value={email}
              onChange={(e) => setEmail(e.target.value)}
              required id="auth-email" 
              style={{
                width: '100%', padding: '14px 18px', borderRadius: 14,
                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#c6f135'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />

            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                required minLength={6} id="auth-password"
                style={{
                  width: '100%', padding: '14px 18px', paddingRight: 48, borderRadius: 14,
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#c6f135'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#a7a7a0', padding: 4
                }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" disabled={loading} id="auth-submit"
              style={{ 
                marginTop: 8, padding: '15px 24px', fontSize: 15, width: '100%',
                background: '#c6f135', color: '#0a0a0d', border: 'none', borderRadius: 14,
                fontWeight: 700, fontFamily: "'Inter', sans-serif", cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 14px rgba(198,241,53,0.2)'
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.boxShadow = '0 8px 24px rgba(198,241,53,0.4)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.boxShadow = '0 4px 14px rgba(198,241,53,0.2)')}
            >
              {loading
                ? <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#0a0a0d', margin: '0 auto' }} />
                : (isLogin ? 'Sign In' : 'Create Account')
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ color: '#6d6d68', fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading} id="google-signin"
            style={{ 
              width: '100%', padding: '14px 24px', fontSize: 14,
              background: 'rgba(255,255,255,0.05)', color: '#f4f4f0', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Toggle */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <span style={{ color: '#a7a7a0', fontSize: 14 }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} id="auth-toggle"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#c6f135', fontSize: 14, fontWeight: 700,
                fontFamily: "'Inter', sans-serif"
              }}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
