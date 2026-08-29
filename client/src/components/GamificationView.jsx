import React from 'react';
import { Trophy, Star, CheckCircle2, Lock } from 'lucide-react';

const BADGES = [
  { title: 'Zero Deviation Hero',     desc: 'Completed 3 full batches with zero unhandled alarms',          icon: '🛡️', unlocked: true,  color: 'var(--teal-light)'    },
  { title: 'Flash Alarm Responder',   desc: 'Acknowledged active alarm within 15 seconds',                   icon: '⚡', unlocked: true,  color: 'var(--warning-light)' },
  { title: 'CAPA Master Mind',        desc: 'Executed 5-Whys root-cause investigation with 100% precision',  icon: '🔬', unlocked: true,  color: 'var(--mission-light)' },
  { title: 'Master Factory Commander',desc: 'Achieved Rank 5 Commander status across VM and QMS',            icon: '👑', unlocked: false, color: 'var(--text-muted)'    },
  { title: 'cGMP Auditor Elite',      desc: 'Maintained 100% compliant 21 CFR Part 11 audit log',           icon: '📜', unlocked: true,  color: 'var(--success-light)' },
  { title: 'Bi-Layer Specialist',     desc: 'Perfected compression hardness & friability tolerances',        icon: '💊', unlocked: false, color: 'var(--text-muted)'    },
];

const LEADERBOARD = [
  { rank: 1, name: 'Cadet Sarah Lin',          xp: '14,850 XP', role: 'Quality Lead',      score: '99.2%', isMe: false },
  { rank: 2, name: 'Operator Marcus Vance',    xp: '12,400 XP', role: 'VM Specialist',    score: '98.5%', isMe: false },
  { rank: 3, name: 'You (Trainee Commander)',   xp: '9,750 XP',  role: 'Dual Commander',   score: '96.4%', isMe: true  },
  { rank: 4, name: 'Cadet Elena Rostova',       xp: '8,900 XP',  role: 'SME Officer',      score: '94.8%', isMe: false },
];

const XP_CURRENT  = 9750;
const XP_NEXT     = 12000;
const XP_PCT      = Math.round((XP_CURRENT / XP_NEXT) * 100);

export default function GamificationView() {
  return (
    <div
      style={{
        flex: 1,
        padding: '28px 24px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ── Rank Card ─────────────────────────────────────────────────── */}
      <div
        className="glass-panel crosshair-corner animate-fade-in"
        style={{
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Purple glow */}
        <div style={{
          position: 'absolute', top: -60, right: -40,
          width: 250, height: 250,
          background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} aria-hidden="true" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, zIndex: 1 }}>
          {/* Rank badge */}
          <div style={{
            width: 64, height: 64,
            borderRadius: 'var(--radius-xl)',
            background: 'rgba(168,85,247,0.15)',
            border: '2px solid rgba(168,85,247,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30,
            boxShadow: '0 0 24px rgba(168,85,247,0.3)',
            flexShrink: 0,
          }}>
            🎖️
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 className="type-heading" style={{ fontSize: 18, color: 'var(--mission-light)' }}>
                Rank 3 — Senior Pharma Commander
              </h1>
              <span className="hud-tag" style={{ color: 'var(--mission)', borderColor: 'rgba(168,85,247,0.35)', background: 'rgba(168,85,247,0.1)' }}>
                {XP_CURRENT.toLocaleString()} XP
              </span>
            </div>
            <p className="type-caption" style={{ fontSize: 11 }}>
              Next Rank: <strong style={{ color: 'var(--mission-light)' }}>Master Factory Commander</strong> — {(XP_NEXT - XP_CURRENT).toLocaleString()} XP remaining
            </p>
          </div>
        </div>

        {/* XP progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220, zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="type-label" style={{ fontSize: 9 }}>XP Progress to Rank 4</span>
            <span className="type-data" style={{ fontSize: 18, color: 'var(--mission-light)' }}>{XP_PCT}%</span>
          </div>
          <div style={{
            width: '100%', height: 8,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
            border: '1px solid rgba(168,85,247,0.2)',
            padding: 1,
          }}>
            <div style={{
              height: '100%',
              width: `${XP_PCT}%`,
              background: 'linear-gradient(90deg, var(--mission), var(--teal))',
              borderRadius: 'var(--radius-full)',
              transition: 'width 1s ease',
              boxShadow: '0 0 8px rgba(168,85,247,0.4)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="type-caption" style={{ fontSize: 9.5 }}>0 XP</span>
            <span className="type-caption" style={{ fontSize: 9.5 }}>{XP_NEXT.toLocaleString()} XP</span>
          </div>
        </div>
      </div>

      {/* ── Badges Grid ───────────────────────────────────────────────── */}
      <div
        className="glass-panel animate-slide-up"
        style={{ padding: '20px 24px', animationDelay: '0.05s' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Trophy aria-hidden="true" style={{ width: 16, height: 16, color: 'var(--warning)' }} />
          <h2 className="type-section">Achievements & Badges</h2>
          <span className="status-badge status-badge--warning" style={{ fontSize: 9.5, marginLeft: 4 }}>
            {BADGES.filter(b => b.unlocked).length} / {BADGES.length} Unlocked
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {BADGES.map((b, idx) => (
            <div
              key={idx}
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                border: `1.5px solid ${b.unlocked ? `${b.color}35` : 'rgba(255,255,255,0.05)'}`,
                background: b.unlocked ? `${b.color}08` : 'rgba(8,14,30,0.4)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                opacity: b.unlocked ? 1 : 0.5,
                transition: 'var(--transition-base)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (b.unlocked) e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
              }}
            >
              {/* Badge icon */}
              <div style={{
                width: 42, height: 42,
                borderRadius: 'var(--radius-lg)',
                background: b.unlocked ? `${b.color}15` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${b.unlocked ? `${b.color}30` : 'rgba(255,255,255,0.06)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
                boxShadow: b.unlocked ? `0 0 12px ${b.color}30` : 'none',
              }}>
                {b.icon}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="type-subhead" style={{ fontSize: 12, color: b.unlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {b.title}
                  </span>
                  {b.unlocked
                    ? <CheckCircle2 aria-label="Unlocked" style={{ width: 12, height: 12, color: 'var(--success-light)', flexShrink: 0 }} />
                    : <Lock        aria-label="Locked"   style={{ width: 12, height: 12, color: 'var(--text-muted)',    flexShrink: 0 }} />
                  }
                </div>
                <p className="type-body" style={{ fontSize: 11 }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Leaderboard ───────────────────────────────────────────────── */}
      <div
        className="glass-panel animate-slide-up"
        style={{ padding: '20px 24px', animationDelay: '0.1s' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Star aria-hidden="true" style={{ width: 16, height: 16, color: 'var(--teal)' }} />
          <h2 className="type-section">Global Simulation Leaderboard</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} role="list">
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 140px 100px 100px',
            gap: 8,
            padding: '0 14px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            {['#', 'Trainee', 'Role', 'Score', 'XP'].map(h => (
              <span key={h} className="type-label" style={{ fontSize: 9 }}>{h}</span>
            ))}
          </div>

          {LEADERBOARD.map(row => (
            <div
              key={row.rank}
              role="listitem"
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 140px 100px 100px',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: row.isMe
                  ? 'rgba(6,182,212,0.08)'
                  : 'transparent',
                border: `1px solid ${row.isMe ? 'rgba(6,182,212,0.2)' : 'transparent'}`,
                transition: 'var(--transition-fast)',
              }}
              onMouseEnter={e => {
                if (!row.isMe) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={e => {
                if (!row.isMe) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  fontWeight: 800,
                  color: row.rank === 1 ? '#fbbf24' : row.rank === 2 ? '#94a3b8' : row.rank === 3 ? '#cd7f32' : 'var(--text-muted)',
                }}
              >
                #{row.rank}
              </span>
              <span
                className="type-subhead"
                style={{ fontSize: 12.5, color: row.isMe ? 'var(--teal-light)' : 'var(--text-primary)' }}
              >
                {row.name}
              </span>
              <span className="type-caption" style={{ fontSize: 11 }}>{row.role}</span>
              <span
                className="type-caption"
                style={{ fontSize: 11, color: 'var(--success-light)', fontWeight: 700, fontFamily: 'var(--font-display)' }}
              >
                {row.score}
              </span>
              <span
                className="type-caption"
                style={{ fontSize: 11, color: 'var(--mission-light)', fontWeight: 700, fontFamily: 'var(--font-display)' }}
              >
                {row.xp}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
