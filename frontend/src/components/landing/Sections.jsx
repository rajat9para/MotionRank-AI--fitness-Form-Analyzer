import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Activity, Brain, Mic2, Trophy, ScanLine, Flame,
  ArrowUpRight, Check, Quote,
} from 'lucide-react';

const ease = [0.2, 0.8, 0.2, 1];

function Reveal({ children, delay = 0, y = 28 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/* ── Infinite marquee ─────────────────────────────────────────────────── */
export function Marquee() {
  const words = ['DISCIPLINE', 'GRIT', 'NO EXCUSES', 'STAY HARD', 'EARN IT', 'RELENTLESS'];
  const loop = [...words, ...words];
  return (
    <div className="mr-marquee" aria-hidden="true">
      <div className="mr-marquee-track">
        {loop.map((w, i) => (
          <span className="mr-marquee-item" key={i}>
            {w} <span className="dot">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── AI Coach showcase ────────────────────────────────────────────────── */
export function AICoach() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section id="ai-coach" className="mr-section" ref={ref}>
      <div style={{ display: 'grid', gap: 'clamp(40px,6vw,80px)', gridTemplateColumns: '1fr', alignItems: 'center' }}
        className="mr-aicoach-grid">
        <div>
          <Reveal><div className="mr-eyebrow" style={{ marginBottom: 22 }}>The AI Form Coach</div></Reveal>
          <Reveal delay={0.05}>
            <h2 className="mr-display" style={{ fontSize: 'clamp(2.2rem,6vw,4.4rem)', marginBottom: 24 }}>
              IT SEES EVERY<br /><span className="mr-volt-text">REP.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mr-muted" style={{ fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 480, marginBottom: 34 }}>
              Our pose-detection engine tracks 33 body landmarks in real time, scoring
              your depth, tempo, and alignment on every single rep — then your voice
              coach tells you exactly how to fix it. Mid-set.
            </p>
          </Reveal>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 460 }}>
            {[
              [ScanLine, '33-point skeletal tracking', 'Frame-by-frame joint analysis at 60fps.'],
              [Activity, 'Live form scoring', 'Instant 0–100 quality score per rep.'],
              [Mic2, 'Voice coaching cues', 'Audible corrections without breaking flow.'],
            ].map(([Icon, title, sub], i) => (
              <Reveal key={title} delay={0.15 + i * 0.08}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div className="mr-chip" style={{ flexShrink: 0 }}><Icon size={22} /></div>
                  <div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '1.02rem' }}>{title}</div>
                    <div className="mr-faint" style={{ fontSize: '0.9rem', marginTop: 2 }}>{sub}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.1}>
          <motion.div style={{ y: imgY }} className="mr-card mr-card-glow" >
            <img src="/assets/ai-pose.png" alt="AI pose-detection wireframe overlay on an athlete performing a squat"
              style={{ width: '100%', display: 'block', aspectRatio: '4/5', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', left: 18, bottom: 18, right: 18,
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            }}>
              <div style={{
                background: 'rgba(5,5,6,0.75)', backdropFilter: 'blur(10px)',
                border: '1px solid var(--line-strong)', borderRadius: 14, padding: '12px 16px',
              }}>
                <div className="mr-faint" style={{ fontSize: '0.62rem', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Form Score</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '1.9rem', color: 'var(--volt)' }}>94</div>
              </div>
              <div style={{
                background: 'var(--volt)', color: '#0a0a0d', borderRadius: 999,
                padding: '9px 16px', fontFamily: "'Outfit',sans-serif", fontWeight: 800,
                fontSize: '0.78rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: '#0a0a0d', animation: 'scrollcue 1.2s infinite' }} />
                Tracking Live
              </div>
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Feature pillars ──────────────────────────────────────────────────── */
const FEATURES = [
  [Brain, 'Adaptive Programming', 'AI builds and reshapes your plan around your performance, recovery, and goals — every week.'],
  [ScanLine, 'Real-Time Form Analysis', 'Computer-vision pose tracking grades technique and flags injury risk before it happens.'],
  [Mic2, 'Voice Coach', 'A relentless in-ear coach that counts reps, calls corrections, and refuses to let you quit.'],
  [Trophy, 'Gamified Ranks', 'Climb from Recruit to Legend. Earn XP, streaks, and badges for showing up and grinding.'],
  [Flame, 'Streak Engine', 'Daily discipline tracking with momentum multipliers that reward consistency over intensity.'],
  [Activity, 'Deep Analytics', 'Volume, tempo, symmetry, and progression dashboards that turn effort into evidence.'],
];

export function Features() {
  return (
    <section id="features" className="mr-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20, marginBottom: 56 }}>
        <div>
          <Reveal><div className="mr-eyebrow" style={{ marginBottom: 18 }}>Built For The Relentless</div></Reveal>
          <Reveal delay={0.05}>
            <h2 className="mr-display" style={{ fontSize: 'clamp(2.2rem,6vw,4.4rem)' }}>
              YOUR ENTIRE<br /><span className="mr-outline-text">ARSENAL.</span>
            </h2>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <p className="mr-muted" style={{ maxWidth: 340, fontSize: '1rem', lineHeight: 1.7 }}>
            Everything you need to train with intent — wrapped in one ruthless, intelligent platform.
          </p>
        </Reveal>
      </div>

      <div className="mr-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {FEATURES.map(([Icon, title, body], i) => (
          <Reveal key={title} delay={(i % 3) * 0.08}>
            <div
              className="mr-card mr-card-glow"
              style={{ padding: 30, height: '100%' }}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div className="mr-chip"><Icon size={22} /></div>
                <span className="mr-num">0{i + 1}</span>
              </div>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: '1.25rem', marginBottom: 10 }}>{title}</h3>
              <p className="mr-faint" style={{ fontSize: '0.94rem', lineHeight: 1.6 }}>{body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── Transformation / stats split ─────────────────────────────────────── */
export function Transformation() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);

  return (
    <section id="transformation" className="mr-section" ref={ref}>
      <div className="mr-transform-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'clamp(40px,6vw,72px)', alignItems: 'center' }}>
        <Reveal>
          <div className="mr-card" style={{ overflow: 'hidden', borderRadius: 24 }}>
            <motion.img style={{ scale: imgScale }} src="/assets/transformation.png"
              alt="Athlete silhouette lit by a single volt rim light"
              loading="lazy"
              width="900" height="1100"
              data-img
            />
          </div>
        </Reveal>
        <div>
          <Reveal><div className="mr-eyebrow" style={{ marginBottom: 22 }}>The Mission</div></Reveal>
          <Reveal delay={0.05}>
            <h2 className="mr-display" style={{ fontSize: 'clamp(2rem,5.5vw,4rem)', marginBottom: 24 }}>
              THE BODY ACHIEVES<br />WHAT THE <span className="mr-volt-text">MIND BELIEVES.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mr-muted" style={{ fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 460, marginBottom: 40 }}>
              MotionRank isn&apos;t a workout app. It&apos;s a system for becoming the
              hardest version of yourself — measured, ranked, and earned one rep at a time.
            </p>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {[['50K+', 'Athletes'], ['2.4M', 'Reps Tracked'], ['4.9', 'App Rating']].map(([v, l], i) => (
              <Reveal key={l} delay={0.15 + i * 0.08}>
                <div>
                  <div className="mr-stat-value">{v}</div>
                  <div className="mr-faint" style={{ fontSize: '0.74rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>{l}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Testimonial ──────────────────────────────────────────────────────── */
export function Testimonial() {
  return (
    <section id="community" className="mr-section">
      <Reveal>
        <div className="mr-card" style={{
          padding: 'clamp(36px,6vw,72px)',
          backgroundImage: "linear-gradient(rgba(5,5,6,0.82), rgba(5,5,6,0.92)), url('/assets/community.png')",
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          <Quote size={44} color="var(--volt)" style={{ marginBottom: 24 }} />
          <p style={{
            fontFamily: "'Outfit',sans-serif", fontWeight: 700,
            fontSize: 'clamp(1.4rem,3.4vw,2.6rem)', lineHeight: 1.25, letterSpacing: '-0.02em',
            maxWidth: 880, marginBottom: 32,
          }}>
            &ldquo;The voice coach called out my depth on rep seven when I was about to
            cheat it. <span className="mr-volt">This thing doesn&apos;t let you lie to yourself.</span>&rdquo;
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: 'var(--grad-volt)', display: 'grid', placeItems: 'center', fontFamily: "'Outfit',sans-serif", fontWeight: 900, color: '#0a0a0d' }}>M</div>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700 }}>Marcus Reed</div>
              <div className="mr-faint" style={{ fontSize: '0.85rem' }}>Powerlifter · Rank: Legend</div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── Final CTA ────────────────────────────────────────────────────────── */
export function FinalCTA() {
  const navigate = useNavigate();
  return (
    <section id="join" className="mr-section" style={{ textAlign: 'center' }}>
      <Reveal>
        <div className="mr-eyebrow" style={{ marginBottom: 26, justifyContent: 'center' }}>Your Time Is Now</div>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="mr-display" style={{ marginBottom: 30 }}>
          STOP <span className="mr-outline-text">WAITING.</span><br />
          <span className="mr-volt-text">START GRINDING.</span>
        </h2>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="mr-muted" style={{ fontSize: '1.1rem', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Join 50,000+ athletes forging discipline with AI. No credit card. No excuses.
        </p>
      </Reveal>
      <Reveal delay={0.15}>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
          <button className="mr-btn mr-btn-primary" onClick={() => navigate('/auth')}>
            Claim Your Rank <ArrowUpRight size={18} />
          </button>
        </div>
      </Reveal>
      <Reveal delay={0.2}>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Free to start', 'No card required', 'Cancel anytime'].map((t) => (
            <span key={t} className="mr-faint" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '0.85rem' }}>
              <Check size={15} color="var(--volt)" /> {t}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
