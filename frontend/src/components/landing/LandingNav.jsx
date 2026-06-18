import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dumbbell, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../ThemeContext';

const LINKS = [
  { label: 'AI Coach', id: 'ai-coach' },
  { label: 'Method', id: 'features' },
  { label: 'Results', id: 'transformation' },
  { label: 'Community', id: 'community' },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className={`mr-nav ${scrolled ? 'scrolled' : ''}`}
    >
      <button className="mr-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
        <span className="mr-logo-mark"><Dumbbell size={20} color="#0a0a0d" /></span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            MOTIONRANK
          </span>
          <span style={{ fontSize: '0.55rem', letterSpacing: '0.32em', color: 'var(--volt)', fontWeight: 700 }}>
            AI&nbsp;FITNESS
          </span>
        </span>
      </button>

      <div className="mr-nav-links" style={{ marginRight: 'auto', marginLeft: '60px' }}>
        {LINKS.map((l) => (
          <button key={l.id} className="mr-nav-link" onClick={() => scrollTo(l.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            {l.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Theme Toggle */}
        <button className="theme-toggle" onClick={toggleTheme} style={{ transform: 'scale(0.85)' }}>
          <div className="theme-toggle-track">
            <Sun size={14} color={isDark ? '#6d6d68' : '#0a0a0d'} />
            <Moon size={14} color={isDark ? '#c6f135' : '#6d6d68'} />
          </div>
          <div className={`theme-toggle-knob ${isDark ? 'dark' : 'light'}`}>
            {isDark ? <Moon size={14} color="#0a0a0d" /> : <Sun size={14} color="#0a0a0d" />}
          </div>
        </button>

        <button className="mr-nav-link" onClick={() => navigate('/auth')}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          Sign In
        </button>
        <button className="mr-btn mr-btn-primary" onClick={() => navigate('/auth')}
          style={{ padding: '11px 22px', fontSize: '0.78rem' }}>
          Start Free
        </button>
      </div>
    </motion.nav>
  );
}
