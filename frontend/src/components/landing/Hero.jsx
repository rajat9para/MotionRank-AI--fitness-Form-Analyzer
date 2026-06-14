import { lazy, Suspense, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';

const HeroScene = lazy(() => import('./HeroScene'));

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
  const [show3D, setShow3D] = useState(false);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 140]);
  const contentY = useTransform(scrollY, [0, 600], [0, 80]);
  const fade = useTransform(scrollY, [0, 500], [1, 0]);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % HEADLINES.length), 2600);
    // Defer mounting the 3D canvas until after first paint for faster LCP
    const raf = requestAnimationFrame(() => setShow3D(true));
    return () => { clearInterval(t); cancelAnimationFrame(raf); };
  }, []);

  return (
    <header className="mr-hero">
      <motion.div
        className="mr-hero-bg"
        style={{ y: bgY, backgroundImage: "url('/assets/hero-athlete.png')" }}
      />
      <div className="mr-hero-veil" />

      {show3D && (
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>
      )}

      <motion.div className="mr-hero-content" style={{ y: contentY, opacity: fade }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mr-eyebrow"
          style={{ marginBottom: 24 }}
        >
          AI-POWERED TRANSFORMATION
        </motion.div>

        <h1 className="mr-display" style={{ marginBottom: 8 }}>
          <span className="mr-rotator">
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
          style={{ fontSize: 'clamp(2rem, 7vw, 5.2rem)', color: 'var(--ink)' }}
        >
          BUILD THE SOLDIER<br /><span className="mr-outline-text">WITHIN.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7 }}
          className="mr-muted"
          style={{ maxWidth: 460, fontSize: '1.05rem', lineHeight: 1.6, margin: '28px 0 36px' }}
        >
          Real-time AI form analysis, a voice coach that pushes you, and gamified
          progress built for people who refuse to stay average.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}
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
          style={{ display: 'flex', gap: 36, marginTop: 56, flexWrap: 'wrap' }}
        >
          {[['50K+', 'Athletes Forged'], ['2.4M', 'Reps Analyzed'], ['98%', 'Form Accuracy']].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '1.7rem', color: 'var(--ink)' }}>{v}</div>
              <div className="mr-faint" style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{l}</div>
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
