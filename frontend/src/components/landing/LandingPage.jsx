import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, BarChart2, Users, Trophy, Check, ArrowRight } from 'lucide-react';
import LandingNav from './LandingNav';
import Hero from './Hero';
import './landing.css';

const FEATURES = [
  {
    num: '01',
    icon: Zap,
    title: 'AI FORM ANALYSIS',
    desc: 'Real-time skeleton tracking with instant feedback. Green lines mean go. Red means fix it.',
  },
  {
    num: '02',
    icon: BarChart2,
    title: 'PROGRESS ANALYTICS',
    desc: 'LeetCode-style heatmaps and performance radars. See your trajectory in real time.',
  },
  {
    num: '03',
    icon: Users,
    title: 'SOCIAL FITNESS',
    desc: 'Find allies, compete on global leaderboards, and push each other harder.',
  },
  {
    num: '04',
    icon: Trophy,
    title: 'VOICE COACH',
    desc: 'AI speaks form corrections and motivation. A coach in your pocket, 24/7.',
  },
];

const TRANSFORMATIONS = [
  { before: 'No form tracking', after: 'Perfect form feedback', imgBefore: '/assets/motionrank_before.png', imgAfter: '/assets/motionrank_after.png' },
  { before: 'Solo workouts', after: 'Global community', imgBefore: '/assets/community_before.png', imgAfter: '/assets/community_after.png' },
  { before: 'No data', after: 'Full analytics', imgBefore: '/assets/data_before.png', imgAfter: '/assets/data_after.png' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [transIdx, setTransIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTransIdx((i) => (i + 1) % TRANSFORMATIONS.length), 3500);
    return () => clearInterval(t);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <div className="mr-cine">
      {/* Grain overlay */}
      <div className="mr-grain" />

      {/* Navigation */}
      <LandingNav />

      {/* Hero Section */}
      <Hero />

      {/* AI Coach Section */}
      <section id="ai-coach" className="mr-section" style={{ marginTop: 80 }}>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <div className="mr-eyebrow" style={{ marginBottom: 24 }}>
            INTELLIGENT COACHING
          </div>
          <h2 className="mr-display" style={{ marginBottom: 36, fontSize: 'clamp(2.2rem, 8vw, 5rem)' }}>
            <span className="mr-volt-text">Your Personal AI Coach</span>
            <br />
            Speaks Real-Time Corrections
          </h2>
          <p className="mr-muted" style={{ fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 600, marginBottom: 48 }}>
            Not just form analysis. Our voice coach listens to your workout, watches your form, and speaks instant feedback. Corrections for push-ups. Motivation between sets. Real coaching, real-time.
          </p>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginTop: 48 }}
          >
            {[
              { title: 'Form Corrections', desc: 'Real-time form feedback with specific cues' },
              { title: 'Voice Motivation', desc: 'AI pushes you with personalized encouragement' },
              { title: 'Rep Counter', desc: 'Automatic rep counting with accuracy' },
              { title: 'Fatigue Detection', desc: 'Detects when to push or rest' },
            ].map((item, i) => (
              <motion.div key={i} variants={itemVariants} className="mr-card mr-card-glow" style={{ padding: 28 }}>
                <div style={{ color: '#c6f135', fontWeight: 700, fontSize: '0.8rem', marginBottom: 12, letterSpacing: '0.1em' }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 10, color: '#f4f4f0' }}>{item.title}</h3>
                <p style={{ color: '#a7a7a0', fontSize: '0.95rem', lineHeight: 1.6 }}>{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="mr-section" style={{ marginTop: 80 }}>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <div className="mr-eyebrow" style={{ marginBottom: 24 }}>
            PLATFORM FEATURES
          </div>
          <h2 className="mr-display" style={{ marginBottom: 56, fontSize: 'clamp(2.2rem, 8vw, 5rem)' }}>
            Built for Athletes Who<br />
            <span className="mr-outline-text">Refuse Mediocrity.</span>
          </h2>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mr-grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}
          >
            {FEATURES.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div key={idx} variants={itemVariants} className="mr-card mr-card-glow" style={{ padding: 32 }}>
                  <div style={{ marginBottom: 16 }}>
                    <div className="mr-chip">
                      <Icon size={28} />
                    </div>
                  </div>
                  <div className="mr-num">{feature.num}</div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 12, color: '#f4f4f0' }}>
                    {feature.title}
                  </h3>
                  <p style={{ color: '#a7a7a0', fontSize: '0.95rem', lineHeight: 1.6 }}>{feature.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </section>

      {/* Transformation Section */}
      <section id="transformation" className="mr-section" style={{ marginTop: 80 }}>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <div className="mr-eyebrow" style={{ marginBottom: 24 }}>
            THE DIFFERENCE
          </div>
          <h2 className="mr-display" style={{ marginBottom: 48, fontSize: 'clamp(2.2rem, 8vw, 5rem)' }}>
            Before and After<br />
            MotionRank
          </h2>

          <div style={{ position: 'relative', height: 460, width: '100%', maxWidth: 1100, margin: '0 auto' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={transIdx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                style={{ display: 'flex', gap: 32, alignItems: 'center', position: 'absolute', width: '100%' }}
              >
                {/* Before Card */}
                <div className="mr-card" style={{ 
                  flex: 1, height: 460, overflow: 'hidden', position: 'relative', 
                  backgroundColor: 'rgba(10, 10, 12, 0.8)',
                  borderRadius: 24, border: '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                }}>
                  <img src={TRANSFORMATIONS[transIdx].imgBefore} alt="Before" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4, filter: 'grayscale(100%)', transform: 'scale(1.05)', transition: 'transform 10s ease-out' }} 
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,5,6,0.95) 0%, rgba(5,5,6,0.4) 40%, transparent 100%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '36px 32px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.2em', color: '#a7a7a0', textTransform: 'uppercase', marginBottom: 8 }}>Before</div>
                    <p style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 600, margin: 0, fontFamily: "'Outfit', sans-serif" }}>{TRANSFORMATIONS[transIdx].before}</p>
                  </div>
                </div>
                
                {/* Center Arrow */}
                <div style={{ 
                  width: 64, height: 64, borderRadius: '50%', background: 'rgba(198, 241, 53, 0.1)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  border: '1px solid rgba(198, 241, 53, 0.3)', backdropFilter: 'blur(10px)',
                  boxShadow: '0 0 30px rgba(198,241,53,0.2)'
                }}>
                  <ArrowRight size={32} style={{ color: '#c6f135' }} />
                </div>
                
                {/* After Card */}
                <div className="mr-card" style={{ 
                  flex: 1, height: 460, overflow: 'hidden', position: 'relative', 
                  borderColor: 'rgba(198, 241, 53, 0.5)', borderWidth: 1, 
                  borderRadius: 24, background: 'rgba(198, 241, 53, 0.02)', 
                  boxShadow: '0 20px 60px rgba(198,241,53,0.15), inset 0 0 0 1px rgba(198,241,53,0.2)'
                }}>
                  <img src={TRANSFORMATIONS[transIdx].imgAfter} alt="After" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9, transform: 'scale(1.05)', transition: 'transform 10s ease-out' }} 
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,5,6,0.95) 0%, rgba(198,241,53,0.1) 60%, transparent 100%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '36px 32px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.2em', color: '#c6f135', textTransform: 'uppercase', marginBottom: 8 }}>After</div>
                    <p style={{ color: '#c6f135', fontSize: '1.6rem', fontWeight: 700, margin: 0, fontFamily: "'Outfit', sans-serif" }}>{TRANSFORMATIONS[transIdx].after}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div style={{ display: 'flex', gap: 8, marginTop: 40, justifyContent: 'center' }}>
            {TRANSFORMATIONS.map((_, i) => (
              <div key={i} style={{ 
                width: i === transIdx ? 32 : 8, height: 8, borderRadius: 4, 
                background: i === transIdx ? '#c6f135' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease'
              }} />
            ))}
          </div>
        </motion.div>
      </section>

      {/* Community Section */}
      <section id="community" className="mr-section" style={{ marginTop: 80 }}>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <div className="mr-eyebrow" style={{ marginBottom: 24 }}>
            COMMUNITY
          </div>
          <h2 className="mr-display" style={{ marginBottom: 36, fontSize: 'clamp(2.2rem, 8vw, 5rem)' }}>
            50K+ Athletes<br />
            Already <span className="mr-volt-text">Forged</span>
          </h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 32,
              marginTop: 48,
            }}
          >
            {[
              { label: '50K+', desc: 'Athletes Connected' },
              { label: '2.4M', desc: 'Reps Analyzed' },
              { label: '98%', desc: 'Form Accuracy' },
              { label: '24/7', desc: 'Voice Coaching' },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div className="mr-stat-value" style={{ marginBottom: 8 }}>{stat.label}</div>
                <div className="mr-muted" style={{ fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {stat.desc}
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{ marginTop: 56, textAlign: 'center' }}
          >
            <button className="mr-btn mr-btn-primary" onClick={() => navigate('/auth')} style={{ fontSize: '1rem', padding: '18px 40px' }}>
              Join the Forge <ArrowRight size={18} />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Marquee */}
      <div className="mr-marquee">
        <div className="mr-marquee-track">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mr-marquee-item">
              <span>AI FORM ANALYSIS</span>
              <span className="dot">●</span>
              <span>VOICE COACHING</span>
              <span className="dot">●</span>
              <span>SOCIAL FITNESS</span>
              <span className="dot">●</span>
              <span>PROGRESS TRACKING</span>
              <span className="dot">●</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="mr-footer">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 40,
            marginBottom: 48,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, marginBottom: 16, color: '#f4f4f0' }}>PRODUCT</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Features', 'Pricing', 'Security', 'API'].map((item) => (
                <a key={item} href="#" style={{ color: '#a7a7a0', fontSize: '0.9rem', textDecoration: 'none', transition: 'color 0.25s' }} onMouseEnter={(e) => (e.target.style.color = '#c6f135')} onMouseLeave={(e) => (e.target.style.color = '#a7a7a0')}>
                  {item}
                </a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 16, color: '#f4f4f0' }}>COMPANY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                <a key={item} href="#" style={{ color: '#a7a7a0', fontSize: '0.9rem', textDecoration: 'none', transition: 'color 0.25s' }} onMouseEnter={(e) => (e.target.style.color = '#c6f135')} onMouseLeave={(e) => (e.target.style.color = '#a7a7a0')}>
                  {item}
                </a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 16, color: '#f4f4f0' }}>LEGAL</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Privacy', 'Terms', 'Cookies', 'License'].map((item) => (
                <a key={item} href="#" style={{ color: '#a7a7a0', fontSize: '0.9rem', textDecoration: 'none', transition: 'color 0.25s' }} onMouseEnter={(e) => (e.target.style.color = '#c6f135')} onMouseLeave={(e) => (e.target.style.color = '#a7a7a0')}>
                  {item}
                </a>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="mr-divider" style={{ marginBottom: 28 }} />

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <p className="mr-muted" style={{ fontSize: '0.85rem' }}>
            © 2026 MotionRank AI. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Twitter', 'GitHub', 'LinkedIn'].map((platform) => (
              <a
                key={platform}
                href="#"
                style={{
                  color: '#a7a7a0',
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  transition: 'color 0.25s',
                }}
                onMouseEnter={(e) => (e.target.style.color = '#c6f135')}
                onMouseLeave={(e) => (e.target.style.color = '#a7a7a0')}
              >
                {platform}
              </a>
            ))}
          </div>
        </motion.div>
      </footer>
    </div>
  );
}
