import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PHASES = [
  'INITIALIZING DISCIPLINE',
  'BUILDING STRENGTH',
  'ACTIVATING AI COACH',
  'FORGING MINDSET',
  'STAY HARD',
];

export default function LoadingScreen({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Honor reduced motion — skip quickly
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const total = reduce ? 400 : 2200;
    const start = performance.now();
    let raf;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / total);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));
      setPhase(Math.min(PHASES.length - 1, Math.floor(eased * PHASES.length)));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDone(true);
        setTimeout(() => onDone?.(), 650);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
          transition={{ duration: 0.6, ease: [0.7, 0, 0.3, 1] }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#050506', color: '#f4f4f0',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Outfit', sans-serif", overflow: 'hidden',
          }}
        >
          {/* particle glints */}
          {[...Array(18)].map((_, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0], y: [-8, 8] }}
              transition={{ duration: 2 + (i % 5) * 0.4, repeat: Infinity, delay: i * 0.13 }}
              style={{
                position: 'absolute',
                left: `${(i * 53) % 100}%`,
                top: `${(i * 37) % 100}%`,
                width: 2, height: 2, borderRadius: '50%',
                background: '#c6f135',
              }}
            />
          ))}

          <motion.div
            initial={{ opacity: 0, letterSpacing: '0.5em' }}
            animate={{ opacity: 1, letterSpacing: '0.04em' }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{ textAlign: 'center', padding: '0 24px' }}
          >
            <div style={{
              fontSize: '0.7rem', letterSpacing: '0.4em',
              color: '#c6f135', fontWeight: 700, marginBottom: 18,
            }}>
              MOTIONRANK&nbsp;AI
            </div>
            <div style={{
              fontWeight: 900, textTransform: 'uppercase',
              fontSize: 'clamp(2.6rem, 11vw, 7rem)', lineHeight: 0.9,
              letterSpacing: '-0.04em',
            }}>
              STAY <span style={{ color: '#c6f135' }}>HARD.</span>
            </div>
          </motion.div>

          {/* progress line */}
          <div style={{
            marginTop: 44, width: 'min(420px, 78vw)',
            height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden',
          }}>
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'linear', duration: 0.1 }}
              style={{ height: '100%', background: 'linear-gradient(90deg,#8fd400,#c6f135)' }}
            />
          </div>

          <div style={{
            marginTop: 16, display: 'flex', alignItems: 'center', gap: 14,
            fontSize: '0.7rem', letterSpacing: '0.22em', color: '#6d6d68',
            fontFamily: "'Inter', sans-serif", textTransform: 'uppercase',
          }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={phase}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
              >
                {PHASES[phase]}
              </motion.span>
            </AnimatePresence>
            <span style={{ color: '#c6f135', fontWeight: 700 }}>{progress}%</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
