import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getUserProfile } from '../db';
import { submitBugReport } from '../communityDb';
import { AlertTriangle, Send, ArrowLeft } from 'lucide-react';
import Navbar from './Navbar';
import { useToast } from '../ToastContext';

const CATEGORIES = [
  { id: 'bug', label: 'Bug', color: '#FF6B6B' },
  { id: 'feature', label: 'Feature Request', color: '#60A5FA' },
  { id: 'ui', label: 'UI Issue', color: '#FBBF24' },
  { id: 'performance', label: 'Performance', color: '#34D399' },
  { id: 'other', label: 'Other', color: '#A78BFA' }
];

export default function BugReport() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('bug');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      addToast('Please describe the issue', 'warning');
      return;
    }
    if (description.trim().length < 10) {
      addToast('Description must be at least 10 characters', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const u = auth.currentUser;
      if (!u) { navigate('/'); return; }
      const pd = await getUserProfile(u.uid);
      await submitBugReport(u.uid, pd?.displayName || u.email, description.trim(), category);
      addToast('Bug report submitted — thank you!', 'success');
      navigate('/dashboard');
    } catch (e) {
      addToast('Failed to submit report', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper mr-cine" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className="mr-grain" />
      <div className="bg-blob" style={{ top: '-60px', right: '-100px', width: 350, height: 350, background: '#FF6B6B', opacity: 0.1, filter: 'blur(100px)' }} />

      <div className="main-content" style={{ maxWidth: 580, position: 'relative', zIndex: 2 }}>
        <button onClick={() => navigate(-1)} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--ink-dim)', fontSize: 14, fontWeight: 800, marginBottom: 24
        }} className="animate-slide-up">
          <ArrowLeft size={18} /> Back
        </button>

        <div className="animate-slide-down" style={{ marginBottom: 36 }}>
          <div className="mr-eyebrow" style={{ marginBottom: 12 }}>BUG REPORT</div>
          <h1 style={{ fontSize: 44, fontWeight: 900, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 14, color: 'var(--ink)' }}>
            <AlertTriangle color="var(--volt)" size={32} /> Report a Bug
          </h1>
          <p style={{ color: 'var(--ink-dim)', fontSize: 16, marginTop: 8 }}>
            Found something broken? Let us know so we can fix it.
          </p>
        </div>

        <div className="mr-card animate-slide-up" style={{ padding: 32, background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>Category</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)} className="mr-btn" style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 800, border: '1px solid transparent',
                borderColor: category === c.id ? c.color : 'var(--line-strong)',
                background: category === c.id ? `${c.color}15` : 'transparent',
                color: category === c.id ? c.color : 'var(--ink-dim)'
              }}>{c.label}</button>
            ))}
          </div>

          <label style={{ display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened? What did you expect to happen? Steps to reproduce..."
            className="input-glass"
            rows={6}
            style={{ resize: 'none', marginBottom: 24, fontSize: 14 }}
          />
          <p style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: -16, marginBottom: 20 }}>{description.length}/500 characters</p>

          <button onClick={handleSubmit} disabled={submitting || !description.trim()}
            className="mr-btn mr-btn-primary" style={{ padding: '14px 28px', fontSize: 15, width: '100%' }}>
            {submitting ? <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: '#0a0a0d', borderTopColor: 'transparent' }} /> : <><Send size={16} /> Submit Report</>}
          </button>
        </div>
      </div>
    </div>
  );
}
