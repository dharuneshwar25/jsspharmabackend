import React from 'react';
import { Lock, CheckCircle2, ChevronRight } from 'lucide-react';

const ICONS = {
  monitor:     '📡',
  sme:         '🔬',
  investigation: '🕵️',
  capa:        '🛠️',
  qa:          '✅',
};

const STATUS = {
  locked:    { label: 'Locked',           cls: 'status-badge--locked',  pulseBar: false },
  active:    { label: 'Action Required',  cls: 'status-badge--warning', pulseBar: true  },
  completed: { label: 'Completed',        cls: 'status-badge--success', pulseBar: false },
  available: { label: 'Available',        cls: 'status-badge--info',    pulseBar: false },
};

// QMS workflow stages for the linear visualization
const WORKFLOW_STEPS = [
  { key: 'qms_monitor',         label: 'Event Triage' },
  { key: 'sme',                 label: 'SME Assessment' },
  { key: 'investigation_officer', label: 'Investigation' },
  { key: 'capa_coordinator',    label: 'CAPA' },
  { key: 'qa_reviewer',         label: 'QA Release' },
];

export default function QMSRoleGrid({ qmsBatchRoles, onOpenRole }) {
  const completedCount = qmsBatchRoles.filter(r => r.status === 'completed').length;
  const progressPct    = Math.round((completedCount / Math.max(qmsBatchRoles.length, 1)) * 100);
  const activeRoleKey  = qmsBatchRoles.find(r => r.status === 'active')?.key || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div
        style={{
          background: 'rgba(168,85,247,0.05)',
          border: '1px solid rgba(168,85,247,0.18)',
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
            <span aria-hidden="true">🧬</span>
            Quality Management System — Audit Bench
          </h2>
          <p className="type-caption" style={{ fontSize: 10.5 }}>
            Quality roles unlock dynamically as process deviations progress through triage, investigation, CAPA, and QA release.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, minWidth: 120 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span className="type-data" style={{ fontSize: 22, color: 'var(--mission-light)' }}>
              {completedCount}<span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>/5</span>
            </span>
            <span className="type-caption" style={{ fontSize: 10 }}>roles signed off</span>
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
              background: 'linear-gradient(90deg, var(--mission), var(--mission-light))',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Workflow progression indicator */}
      <div
        style={{
          background: 'rgba(8,14,30,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          overflowX: 'auto',
        }}
        role="list"
        aria-label="QMS workflow progression"
      >
        {WORKFLOW_STEPS.map((step, idx) => {
          const roleData = qmsBatchRoles.find(r => r.key === step.key);
          const status   = roleData?.status || 'locked';
          const isLast   = idx === WORKFLOW_STEPS.length - 1;
          const isActive = status === 'active';
          const isDone   = status === 'completed';

          return (
            <React.Fragment key={step.key}>
              <div
                role="listitem"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  minWidth: 64,
                  flex: 1,
                }}
              >
                <div style={{
                  width: 28, height: 28,
                  borderRadius: '50%',
                  border: `2px solid ${isDone ? 'rgba(16,185,129,0.7)' : isActive ? 'rgba(245,158,11,0.8)' : 'rgba(255,255,255,0.1)'}`,
                  background: isDone ? 'rgba(16,185,129,0.15)' : isActive ? 'rgba(245,158,11,0.15)' : 'rgba(8,14,30,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isDone ? 12 : 10,
                  color: isDone ? 'var(--success-light)' : isActive ? 'var(--warning-light)' : 'var(--text-muted)',
                  boxShadow: isActive ? '0 0 12px rgba(245,158,11,0.4)' : 'none',
                  flexShrink: 0,
                  animation: isActive ? 'pulseGlow 2s infinite ease-in-out' : 'none',
                  transition: 'var(--transition-base)',
                }}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <span
                  className="type-caption"
                  style={{
                    fontSize: 9,
                    textAlign: 'center',
                    color: isDone ? 'var(--success-light)' : isActive ? 'var(--warning-light)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    fontWeight: isActive ? 700 : 400,
                  }}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div style={{
                  height: 2,
                  flex: 0,
                  width: 16,
                  background: isDone ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.07)',
                  flexShrink: 0,
                  marginBottom: 18,
                }} aria-hidden="true" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Role cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 10,
        }}
        role="list"
        aria-label="QMS role assignments"
      >
        {qmsBatchRoles.map((role) => {
          const locked    = role.status === 'locked';
          const completed = role.status === 'completed';
          const active    = role.status === 'active';
          const cfg       = STATUS[role.status] || STATUS.locked;

          return (
            <div
              key={role.key}
              role="listitem"
              onClick={() => !locked && onOpenRole(role.key)}
              style={{
                padding: 14,
                borderRadius: 'var(--radius-lg)',
                border: `1.5px solid ${
                  locked    ? 'rgba(255,255,255,0.05)'  :
                  active    ? 'rgba(245,158,11,0.5)'    :
                  completed ? 'rgba(16,185,129,0.35)'   :
                  'rgba(255,255,255,0.08)'
                }`,
                background: locked
                  ? 'rgba(8,14,30,0.4)'
                  : active
                  ? 'rgba(245,158,11,0.07)'
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
                boxShadow: active ? 'var(--shadow-warning, 0 0 18px rgba(245,158,11,0.2))' : 'none',
              }}
              onMouseEnter={e => {
                if (!locked) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
              }}
              aria-label={`${role.title} — ${cfg.label}`}
              tabIndex={locked ? -1 : 0}
              onKeyDown={e => e.key === 'Enter' && !locked && onOpenRole(role.key)}
            >
              {/* Active top bar */}
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                  animation: 'pipelineFlow 2.5s linear infinite',
                  backgroundSize: '200% 100%',
                }} aria-hidden="true" />
              )}

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: 'var(--radius-md)',
                    background: active ? 'rgba(245,158,11,0.1)' : 'rgba(8,14,30,0.7)',
                    border: `1px solid ${active ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, flexShrink: 0,
                  }}>
                    {ICONS[role.icon] || '🛠️'}
                  </div>
                  <div>
                    <span className="type-label" style={{ color: active ? 'var(--warning)' : 'var(--text-muted)', fontSize: 9 }}>
                      QMS STEP 0{role.order}
                    </span>
                    <div className="type-subhead" style={{ fontSize: 12.5, lineHeight: 1.25, marginTop: 1 }}>
                      {role.title}
                    </div>
                  </div>
                </div>

                <span className={`status-badge ${cfg.cls}`} style={{ fontSize: 9.5, flexShrink: 0 }}>
                  {completed && <CheckCircle2 aria-hidden="true" style={{ width: 10, height: 10 }} />}
                  {locked    && <Lock         aria-hidden="true" style={{ width: 10, height: 10 }} />}
                  {cfg.label}
                </span>
              </div>

              {/* Summary */}
              {role.summary && (
                <p className="type-body" style={{ fontSize: 11, lineHeight: 1.5 }}>{role.summary}</p>
              )}

              {/* Note */}
              {role.note && (
                <div style={{
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(6,182,212,0.06)',
                  border: '1px solid rgba(6,182,212,0.15)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  color: 'var(--teal-light)',
                  lineHeight: 1.5,
                }}>
                  {role.note}
                </div>
              )}

              {/* Footer */}
              <div style={{
                paddingTop: 8,
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span className="type-caption" style={{ fontSize: 10 }}>
                  {locked ? 'Awaiting upstream triage' : 'Gating active'}
                </span>
                {!locked && (
                  <ChevronRight
                    aria-hidden="true"
                    style={{ width: 14, height: 14, color: active ? 'var(--warning-light)' : 'var(--text-muted)' }}
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
