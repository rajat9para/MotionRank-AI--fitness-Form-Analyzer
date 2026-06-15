import { lazy, Suspense, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';

const HEADLINES = [
  'STAY HARD.',
  'NO EXCUSES.',
  'ONE MORE REP.',
  'FORGE YOURSELF.',
  'BECOME UNSTOPPABLE.',
];

export default function Hero() {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [showAfter, setShowAfter] = useState(false);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 140]);
  const contentY = useTransform(scrollY, [0, 600], [0, 80]);
  const fade = useTransform(scrollY, [0, 500], [1, 0]);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % HEADLINES.length), 2600);
    const transTimer = setInterval(() => setShowAfter((v) => !v), 4000); // Transform every 4s
    return () => { clearInterval(t); clearInterval(transTimer); };
  }, []);

  return (
    <header className="mr-hero">
      {/* Before Image */}
      <motion.div
        className="mr-hero-bg"
        style={{
          y: bgY,
          backgroundImage: "url('/assets/david_goggins_before.png')",
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          width: '50vw',
          height: '100%',
          left: 0,
          top: 0,
          opacity: showAfter ? 0 : 1,
          transition: 'opacity 2.5s ease-in-out'
        }}
      />
      {/* After Image */}
      <motion.div
        className="mr-hero-bg"
        style={{
          y: bgY,
          backgroundImage: "url('/assets/david_goggins_after.png')",
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          width: '50vw',
          height: '100%',
          left: 0,
          top: 0,
          opacity: showAfter ? 1 : 0,
          transition: 'opacity 2.5s ease-in-out'
        }}
      />
      {/* Dark gradient veil fading from right to left so text is readable but face on left is clear */}
      <div className="mr-hero-veil" style={{
        background: 'linear-gradient(to left, rgba(5,5,6,0.98) 0%, rgba(5,5,6,0.85) 40%, rgba(5,5,6,0.2) 70%, transparent 100%)'
      }} />

      <motion.div className="mr-hero-content" style={{
        y: contentY, opacity: fade,
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', textAlign: 'left',
        marginLeft: '48vw', paddingLeft: '4vw', paddingRight: '4vw', width: '50vw', maxWidth: '800px'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mr-eyebrow"
          style={{ marginBottom: 16, justifyContent: 'flex-start' }}
        >
          AI-POWERED TRANSFORMATION
        </motion.div>

        <h1 className="mr-display" style={{ marginBottom: 4, width: '100%', fontSize: 'clamp(2rem, 6vw, 6rem)' }}>
          <span className="mr-rotator" style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={idx}
                initial={{ opacity: 0, y: '0.45em', filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: '-0.45em', filter: 'blur(8px)' }}
                transition={{ duration: 0.55, ease: [0.7, 0, 0.3, 1] }}
                style={{ display: 'inline-block' }}
                className="mr-volt-text"
              >
                {HEADLINES[idx]}
              </motion.span>
            </AnimatePresence>
          </span>
        </h1>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="mr-display"
          style={{ fontSize: 'clamp(1.8rem, 5vw, 5rem)', color: 'var(--ink)', lineHeight: 0.95 }}
        >
          BUILD THE SOLDIER<br /><span className="mr-outline-text">WITHIN.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7 }}
          className="mr-muted"
          style={{ maxWidth: 460, fontSize: '0.95rem', lineHeight: 1.5, margin: '20px 0 28px 0' }}
        >
          Real-time AI form analysis, a voice coach that pushes you, and gamified
          progress built for people who refuse to stay average.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-start' }}
        >
          <button className="mr-btn mr-btn-primary" onClick={() => navigate('/auth')}>
            Start Training <ArrowRight size={17} />
          </button>
          <button className="mr-btn mr-btn-ghost"
            onClick={() => document.getElementById('ai-coach')?.scrollIntoView({ behavior: 'smooth' })}>
            <Play size={15} /> See How It Works
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20, marginTop: 32, width: '100%',
            background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          {[['50K+', 'Athletes Forged'], ['2.4M', 'Reps Analyzed'], ['98%', 'Form Accuracy']].map(([v, l]) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderLeft: '2px solid rgba(198,241,53,0.3)', paddingLeft: '12px' }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '1.6rem', color: 'var(--ink)' }}>{v}</div>
              <div className="mr-faint" style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '4px' }}>{l}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      <div className="mr-scrollcue">
        <span>Scroll</span>
        <span className="mr-scrollcue-line" />
      </div>
    </header>
  );
}
