import { Dumbbell, Target, BarChart3, AlertTriangle } from 'lucide-react';

export default function EmptyState({ icon: Icon = Dumbbell, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div style={{
        width: 72, height: 72, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--volt-dim)', margin: '0 auto 20px'
      }}>
        <Icon size={32} color="var(--volt)" />
      </div>
      <h3 style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif", marginBottom: 6 }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5, maxWidth: 320, margin: '0 auto 20px' }}>
        {subtitle}
      </p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-skeu btn-skeu-primary" style={{ padding: '10px 24px', fontSize: 13 }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
