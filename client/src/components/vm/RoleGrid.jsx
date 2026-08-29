import React from 'react';
import { Lock, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';

const ICONS = {
  weight: '⚖️', grinder: '⚙️', droplet: '💧', wind: '🌬️',
  blend: '🔄', press: '🔨', spray: '💨', search: '🔍',
  box: '📦', radar: '📡',
};

const STATUS = {
  locked:    { label: 'Locked',      cls: 'status-badge--locked',  dot: 'var(--text-muted)' },
  active:    { label: 'In Progress', cls: 'status-badge--info',    dot: 'var(--teal)' },
  completed: { label: 'Completed',   cls: 'status-badge--success', dot: 'var(--success)' },
  available: { label: 'Available',   cls: 'status-badge--info',    dot: 'var(--pharma-blue-light)' },
};

export default function RoleGrid({ batchRoles, onOpenRole }) {
  const completedCount = batchRoles.filter(r => r.status === 'completed').length;
  const progressPct    = Math.round((completedCount / Math.max(batchRoles.length, 1)) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div
        style={{
          background: 'rgba(6,182,212,0.05)',
          border: '1px solid rgba(6,182,212,0.18)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            className="type-section"
            style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}
          >
            <span aria-hidden="true">⚙️</span>
            Virtual Manufacturing — Production Stations
          </h2>
          <p className="type-caption" style={{ fontSize: 10.5 }}>
            Select an active station to access its operator control panel. Stations unlock sequentially per cGMP SOP.
          </p>
        </div>

        {/* Progress indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, minWidth: 120 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span
              className="type-data"
              style={{ fontSize: 22, color: 'var(--teal-light)' }}
            >
              {progressPct}%
            </span>
            <span className="type-caption" style={{ fontSize: 10 }}>line progress</span>
          </div>
          <div style={{
            width: 120, height: 4,
            background: 'rgba(255,255,255,0.07)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, var(--pharma-blue), var(--teal))',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Station grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 10,
        }}
        role="list"
        aria-label="Manufacturing station roles"
      >
        {batchRoles.map((role, idx) => {
          const locked    = role.status === 'locked';
          const completed = role.status === 'completed';
          const active    = role.status === 'active';
          const cfg       = STATUS[role.status] || STATUS.locked;
          const stationNo = role.type === 'monitor'
            ? 'MONITOR'
            : `STATION ${String(role.order || idx + 1).padStart(2, '0')}`;
          const pct = role.type === 'process' && role.totalSteps
            ? Math.round((role.currentStep / role.totalSteps) * 100)
            : null;

          return (
            <div
              key={role.key}
              role="listitem"
              onClick={() => !locked && onOpenRole(role.key)}
              style={{
                padding: 14,
                borderRadius: 'var(--radius-lg)',
                border: `1.5px solid ${
                  locked    ? 'rgba(255,255,255,0.05)' :
                  active    ? 'rgba(6,182,212,0.5)'    :
                  completed ? 'rgba(16,185,129,0.35)'  :
                  'rgba(255,255,255,0.08)'
                }`,
                background: locked
                  ? 'rgba(8,14,30,0.4)'
                  : active
                  ? 'rgba(6,182,212,0.08)'
                  : completed
                  ? 'rgba(16,185,129,0.05)'
                  : 'rgba(8,14,30,0.55)',
                cursor: locked ? 'not-allowed' : 'pointer',
                opacity: locked ? 0.55 : 1,
                transition: 'var(--transition-base)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: active ? 'var(--shadow-teal)' : 'none',
              }}
              onMouseEnter={e => {
                if (!locked) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  if (!active && !completed) {
                    e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)';
                  }
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                if (!active && !completed && !locked) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }
              }}
              aria-label={`${role.title} — ${cfg.label}`}
              tabIndex={locked ? -1 : 0}
              onKeyDown={e => e.key === 'Enter' && !locked && onOpenRole(role.key)}
            >
              {/* Active indicator bar */}
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: 'linear-gradient(90deg, var(--teal), var(--pharma-blue-light))',
                  animation: 'pipelineFlow 3s linear infinite',
                  backgroundSize: '200% 100%',
                }} aria-hidden="true" />
              )}

              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Icon */}
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: 'var(--radius-md)',
                    background: locked ? 'rgba(8,14,30,0.6)' : active ? 'rgba(6,182,212,0.12)' : 'rgba(8,14,30,0.7)',
                    border: `1px solid ${active ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.07)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, flexShrink: 0,
                  }}>
                    {ICONS[role.icon] || '🛠️'}
                  </div>
                  <div>
                    <span className="type-label" style={{ color: active ? 'var(--teal)' : 'var(--text-muted)', fontSize: 9 }}>
                      {stationNo}
                    </span>
                    <div className="type-subhead" style={{ fontSize: 12.5, lineHeight: 1.25, marginTop: 1 }}>
                      {role.title}
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                <span
                  className={`status-badge ${cfg.cls}`}
                  style={{ fontSize: 9.5, flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  {completed && <CheckCircle2 aria-hidden="true" style={{ width: 10, height: 10 }} />}
                  {locked    && <Lock         aria-hidden="true" style={{ width: 10, height: 10 }} />}
                  {cfg.label}
                </span>
              </div>

              {/* Summary */}
              {role.summary && (
                <p className="type-body" style={{ fontSize: 11, lineHeight: 1.5 }}>{role.summary}</p>
              )}

              {/* Footer row */}
              <div style={{
                paddingTop: 8,
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}>
                {pct !== null && !locked ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      flex: 1, height: 3,
                      background: 'rgba(255,255,255,0.07)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: active ? 'var(--teal)' : 'var(--success)',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <span className="type-caption" style={{ fontSize: 10, fontWeight: 700, color: active ? 'var(--teal-light)' : 'var(--success-light)', flexShrink: 0 }}>
                      {pct}%
                    </span>
                  </div>
                ) : (
                  <span className="type-caption" style={{ fontSize: 10 }}>
                    {locked ? 'Prerequisites pending' : 'Ready to launch'}
                  </span>
                )}

                {!locked && (
                  <ChevronRight
                    aria-hidden="true"
                    style={{ width: 14, height: 14, color: active ? 'var(--teal)' : 'var(--text-muted)', flexShrink: 0 }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
