import React from 'react';
import Tablet3DViewer from './Tablet3DViewer';
import { Play, Sparkles, Activity, ShieldCheck, Award, ChevronRight } from 'lucide-react';

const STAGES = [
  { num: '01', name: 'Dispensing',   desc: 'API & excipient weighing',          icon: '⚖️', color: '#00ccff' },
  { num: '02', name: 'Milling',      desc: 'Particle size reduction',           icon: '⚙️', color: '#16a34a' },
  { num: '03', name: 'Granulation',  desc: 'High-shear wet binder mix',         icon: '💧', color: '#db2777' },
  { num: '04', name: 'Drying',       desc: 'Fluidized bed moisture control',    icon: '🌬️', color: '#ea580c' },
  { num: '05', name: 'Blending',     desc: 'Uniform lubricant distribution',    icon: '🔄', color: '#4f46e5' },
  { num: '06', name: 'Compression',  desc: 'Rotary high-speed tablet press',    icon: '🔨', color: '#e11d48' },
  { num: '07', name: 'Coating',      desc: 'Functional enteric film coating',   icon: '💨', color: '#0284c7' },
  { num: '08', name: 'Inspection',   desc: 'Automatic optical tablet sorter',   icon: '🔍', color: '#10b981' },
  { num: '09', name: 'Packaging',    desc: 'Blister thermoforming & boxing',    icon: '📦', color: '#7c3aed' },
];

const KEY_METRICS = [
  { label: 'Manufacturing Pipeline', value: '9 Full Stages',    color: 'var(--neon-accent)', sub: 'Continuous Process Verification' },
  { label: 'Operational Control',       value: '15 Roles Config', color: '#16a34a', sub: 'VM Operators & QMS Reviewers' },
  { label: 'Compliance Framework',  value: 'cGMP & 21 CFR',   color: '#db2777', sub: 'Audit Trail Signature Locks' },
];

const CAPABILITIES = [
  {
    Icon: Activity,
    color: 'var(--neon-accent)',
    title: 'Side-by-Side VM & QMS',
    desc: 'Work seamlessly across Virtual Manufacturing operator controls and Quality Management System oversight with real-time shared state synchronization.',
    tag: 'INTEGRATED SYNC',
  },
  {
    Icon: ShieldCheck,
    color: '#16a34a',
    title: 'CAPA Diagnostics Suite',
    desc: 'Execute 6M Ishikawa Fishbone diagrams and 5-Whys diagnostic trees. Log formal CAPAs and verify corrective action efficacy before authorizing release.',
    tag: 'QUALITY AUDITED',
  },
  {
    Icon: Award,
    color: '#db2777',
    title: 'Gamified Leaderboards',
    desc: 'Earn compliance points, unlock achievements, track response speed, and generate downloadable post-simulation performance scorecards.',
    tag: 'ACCREDITED RUNS',
  },
];

export default function LandingView({ onStartSetup }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 16,
        padding: '20px 16px 40px',
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ── CARD A: Hero Section (span 8, row span 2) ─────────────────── */}
      <section
        className="glass-panel crosshair-corner animate-fade-in"
        style={{
          gridColumn: 'span 8',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '40px 48px',
          background: 'var(--bg-surface)',
          minHeight: 380,
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: 18 }}>
            <span className="cyber-sticker cyber-sticker--pink">
              <Sparkles
                aria-hidden="true"
                style={{ width: 11, height: 11, color: 'var(--neon-accent)' }}
                className="animate-status"
              />
              SYSTEM ONLINE // BATCH SIMULATOR
            </span>
          </div>

          <h1
            className="type-display animate-slide-up"
            style={{
              marginBottom: 16,
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--neon-accent) 60%, var(--neon-secondary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.1,
              fontWeight: 900,
            }}
          >
            MASTER PHARMACEUTICAL<br />
            MANUFACTURING & QMS
          </h1>

          <p
            className="type-body animate-slide-up"
            style={{ marginBottom: 20, maxWidth: 540, fontSize: 13, color: 'var(--text-secondary)' }}
          >
            Operate Virtual Manufacturing equipment, respond to real-time process deviations, execute root-cause investigations, write CAPAs, and authorize batch releases under strict cGMP conditions.
          </p>

          <div
            className="animate-slide-up"
            style={{
              marginBottom: 24,
              padding: '12px 16px',
              background: 'rgba(245, 158, 11, 0.06)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              maxWidth: 540,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16, marginTop: -2 }}>⚠️</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, lineHeight: 1.5, color: '#f59e0b' }}>
              <strong>ENVIRONMENT STATUS // PROTOTYPE LOGICAL FLOW ACTIVE</strong><br />
              This system is deployed in demo mode to showcase the proposed VM/QMS technical integration. 
              Certain features, custom recipe builders, and advanced audit trails are mocked or restricted.
            </div>
          </div>

          <div
            className="animate-slide-up"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}
          >
            <button
              onClick={onStartSetup}
              className="pill-btn"
              style={{ fontSize: '0.875rem', padding: '12px 28px' }}
            >
              <Play aria-hidden="true" style={{ width: 15, height: 15, fill: 'currentColor' }} />
              Launch Simulation
            </button>
            <a
              href="#pipeline-circuit"
              className="pill-btn pill-btn-secondary"
              style={{ fontSize: '0.875rem', padding: '12px 24px' }}
            >
              Explore Workflow
              <ChevronRight aria-hidden="true" style={{ width: 14, height: 14 }} />
            </a>
          </div>
        </div>
      </section>

      {/* ── CARD B: 3D Twin Viewer (span 4) ───────────────────────────── */}
      <section
        className="glass-panel crosshair-corner animate-fade-in"
        style={{
          gridColumn: 'span 4',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 16,
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="cyber-sticker" style={{ margin: 0 }}>
            [ DIGITAL TWIN INSPECTOR ]
          </span>
          <div className="status-pill running" style={{ padding: '2px 8px', fontSize: 8 }}>
            ACTIVE SCAN
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
          <Tablet3DViewer
            tabletName="Paracetamol 500 mg"
            batchCode="BATCH-JSS-2026-904"
          />
        </div>

        <div style={{ borderTop: '2px solid var(--glass-border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--text-muted)' }}>CQA SENSOR FEED</span>
          <span style={{ color: 'var(--neon-accent)' }} className="animate-status">PT-100 CONNECTED</span>
        </div>
      </section>

      {/* ── CARD C: Key Metrics Dashboard (span 4) ───────────────────── */}
      <section
        className="glass-panel crosshair-corner animate-fade-in"
        style={{
          gridColumn: 'span 4',
          padding: 20,
          background: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <span className="cyber-sticker cyber-sticker--yellow" style={{ marginBottom: 12 }}>
            METRIC STREAM
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, margin: '12px 0' }}>
          {KEY_METRICS.map(m => (
            <div
              key={m.label}
              style={{
                borderLeft: `3px solid ${m.color}`,
                paddingLeft: 12,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span className="type-label" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                {m.label}
              </span>
              <strong className="type-data" style={{ color: m.color, fontSize: '1.4rem' }}>
                {m.value}
              </strong>
              <span className="type-caption" style={{ fontSize: 9, color: 'var(--text-secondary)' }}>
                {m.sub}
              </span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '2px solid var(--glass-border)', paddingTop: 8, fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          REGULATORY COMPLIANCE // SECURE GATEWAY
        </div>
      </section>

      {/* ── CARD D: 9-Stage Manufacturing Pipeline Circuit (span 12) ──── */}
      <section
        id="pipeline-circuit"
        className="glass-panel crosshair-corner animate-fade-in"
        style={{
          gridColumn: 'span 12',
          padding: 24,
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <span className="cyber-sticker cyber-sticker--green" style={{ marginBottom: 10 }}>
              End-to-End Workflow Circuit
            </span>
            <h2 className="type-heading" style={{ marginTop: 8, fontSize: 18 }}>
              Continuous Process Verification Pipeline
            </h2>
          </div>
          <span className="type-caption" style={{ color: 'var(--neon-accent)' }}>
            [ STAGE 01 - 09 CPV LOOP ]
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 12,
          }}
        >
          {STAGES.map((stg, idx) => (
            <div
              key={stg.num}
              className="glass-surface"
              style={{
                padding: '16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                cursor: 'default',
                transition: 'var(--transition-base)',
                position: 'relative',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = stg.color;
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `4px 4px 0px 0px ${stg.color}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: '#ffffff',
                    background: '#000000',
                    border: `1.5px solid ${stg.color}`,
                    padding: '1px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {stg.num}
                </span>
                <span style={{ fontSize: 18 }}>{stg.icon}</span>
              </div>

              <div>
                <div className="type-subhead" style={{ fontSize: 12, marginBottom: 4, color: 'var(--text-primary)', fontWeight: 800 }}>
                  {stg.name}
                </div>
                <p className="type-caption" style={{ fontSize: 9.5, lineHeight: 1.3, color: 'var(--text-secondary)' }}>
                  {stg.desc}
                </p>
              </div>

              <div
                style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: 3,
                  background: stg.color,
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── CARDS E, F, G: Capability Modules (span 4 each) ───────────── */}
      {CAPABILITIES.map(({ Icon, color, title, desc, tag }) => (
        <section
          key={title}
          className="glass-panel crosshair-corner animate-fade-in"
          style={{
            gridColumn: 'span 4',
            padding: 24,
            background: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{
              width: 40, height: 40,
              borderRadius: 6,
              background: '#000000',
              border: `2px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `3px 3px 0px 0px #000000`,
            }}>
              <Icon aria-hidden="true" style={{ width: 20, height: 20, color }} />
            </div>
            <span className="type-caption" style={{ color, fontSize: 9, fontWeight: 800 }}>
              [{tag}]
            </span>
          </div>

          <div>
            <h3 className="type-section" style={{ fontSize: 13, marginBottom: 8, color: 'var(--text-primary)', fontWeight: 800 }}>
              {title}
            </h3>
            <p className="type-body" style={{ fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {desc}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
            <span className="animate-status">●</span> MODULE INITIALIZED
          </div>
        </section>
      ))}
    </div>
  );
}
