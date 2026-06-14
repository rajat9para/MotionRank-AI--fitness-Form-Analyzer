import { Zap } from 'lucide-react';

export default function Footer() {
  const cols = [
    ['Product', ['Features', 'AI Coach', 'Ranks', 'Analytics']],
    ['Company', ['About', 'Careers', 'Blog', 'Press']],
    ['Support', ['Help Center', 'Contact', 'Privacy', 'Terms']],
  ];
  return (
    <footer className="mr-footer">
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 40, marginBottom: 48 }}>
          <div style={{ minWidth: 200 }}>
            <div className="mr-logo" style={{ marginBottom: 16 }}>
              <span className="mr-logo-mark"><Zap size={20} color="#0a0a0d" fill="#0a0a0d" /></span>
              <span style={{ fontWeight: 900, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
                MOTION<span className="mr-volt">RANK</span>
              </span>
            </div>
            <p className="mr-faint" style={{ fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 260 }}>
              AI-powered training for people who refuse to stay average.
            </p>
          </div>
          {cols.map(([title, links]) => (
            <div key={title}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>{title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {links.map((l) => (
                  <a key={l} href="#" className="mr-nav-link" style={{ fontSize: '0.88rem', textTransform: 'none', letterSpacing: 0 }}>{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mr-divider" style={{ marginBottom: 24 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span className="mr-faint" style={{ fontSize: '0.82rem' }}>© {new Date().getFullYear()} MotionRank. Stay hard.</span>
          <span className="mr-faint" style={{ fontSize: '0.82rem' }}>Built for the relentless.</span>
        </div>
      </div>
    </footer>
  );
}
