import React, { useState } from 'react';
import { useSimStore } from '../store';
import { Play, Settings, Pill, Shield, CheckCircle2, Zap } from 'lucide-react';
import FormulationGuideModal from './FormulationGuideModal';

const PRODUCTS = [
  {
    id: 'paracetamol-500',
    name: 'Paracetamol 500 mg',
    dosage: 'Bi-Layer Modified Release',
    form: 'Tablet',
    batchSize: '100,000 Tablets',
    difficulty: 'Standard',
    difficultyColor: '#0ea5e9',
    borderColor: '#0ea5e9',
    glowColor: 'rgba(14, 165, 233, 0.12)',
    desc: 'Baseline manufacturing scenario with granulation thermal drift deviation.',
    icon: '💊',
  },
  {
    id: 'amoxicillin-250',
    name: 'Amoxicillin 250 mg',
    dosage: 'Film-Coated Antibiotic',
    form: 'Tablet',
    batchSize: '75,000 Tablets',
    difficulty: 'Intermediate',
    difficultyColor: '#16a34a',
    borderColor: '#16a34a',
    glowColor: 'rgba(22, 163, 74, 0.12)',
    desc: 'Strict relative humidity & particle size sensitivity during milling and compression.',
    icon: '🧬',
  },
  {
    id: 'ibuprofen-400',
    name: 'Ibuprofen 400 mg',
    dosage: 'Immediate Release Analgesic',
    form: 'Tablet',
    batchSize: '120,000 Tablets',
    difficulty: 'Advanced',
    difficultyColor: '#db2777',
    borderColor: '#db2777',
    glowColor: 'rgba(219, 39, 119, 0.12)',
    desc: 'High friability challenge & fast compression turret speed with multiple process alarms.',
    icon: '⚗️',
  },
];

const MODES = [
  {
    id: 'individual',
    icon: <Zap style={{ width: 16, height: 16 }} aria-hidden="true" />,
    label: 'Individual Dual Role',
    tag: 'Recommended',
    desc: 'Unified side-by-side interface. Run both VM Operator controls and QMS oversight as a single user.',
    color: 'var(--neon-accent)',
    accentColor: 'rgba(14, 165, 233, 0.12)',
    borderColor: 'var(--neon-accent)',
  },
  {
    id: 'vm',
    icon: <Settings style={{ width: 16, height: 16 }} aria-hidden="true" />,
    label: 'VM Operator Focus',
    tag: null,
    desc: 'Focus primarily on machine operations, parameter control, and immediate alarm responses on the factory floor.',
    color: '#16a34a',
    accentColor: 'rgba(22, 163, 74, 0.1)',
    borderColor: '#16a34a',
  },
  {
    id: 'qms',
    icon: <Shield style={{ width: 16, height: 16 }} aria-hidden="true" />,
    label: 'QMS Quality Lead Focus',
    tag: null,
    desc: 'Focus on deviation triage, 6M Ishikawa investigation, CAPA verification, and batch release authorization.',
    color: '#db2777',
    accentColor: 'rgba(219, 39, 119, 0.1)',
    borderColor: '#db2777',
  },
];

const SYSTEM_CHECKLIST = [
  { label: 'Plant Purified Water Loop', status: 'VERIFIED', color: '#16a34a' },
  { label: 'HVAC Airflow Pressure (ISO 8)', status: 'STABLE [0.08" WG]', color: '#16a34a' },
  { label: 'Calibration Certificate PT-100', status: 'ACTIVE', color: '#16a34a' },
  { label: 'Audit Trail Signature Locks', status: 'LOCKED [21 CFR]', color: 'var(--neon-accent)' },
];

export default function ScenarioSetupView({ onLaunchCommandCenter }) {
  const { simulations, startNewBatch, loading } = useSimStore();

  const [selectedSimId, setSelectedSimId] = useState(simulations[0]?.id || 'paracetamol-500');
  const [selectedMode, setSelectedMode]   = useState('individual');
  const [isGuideOpen, setIsGuideOpen]     = useState(false);

  const handleLaunchClick = () => {
    setIsGuideOpen(true);
  };

  const handleConfirmLaunch = async () => {
    setIsGuideOpen(false);
    await startNewBatch(selectedSimId);
    onLaunchCommandCenter();
  };

  const selectedProduct = PRODUCTS.find(p => p.id === selectedSimId);
  const selectedSimConfig = simulations.find(s => s.id === selectedSimId) || null;

  return (
    <div
      style={{
        flex: 1,
        padding: '20px 16px 40px',
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 16,
        maxWidth: 1300,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ── CARD 1: Header (span 12) ─────────────────────────────────── */}
      <div
        className="glass-panel crosshair-corner animate-fade-in"
        style={{
          gridColumn: 'span 12',
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44,
            borderRadius: 6,
            background: 'var(--bg-base)',
            border: '2.5px solid var(--neon-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '3px 3px 0px 0px #000000',
          }}>
            <Settings aria-hidden="true" style={{ width: 18, height: 18, color: 'var(--neon-accent)' }} />
          </div>
          <div>
            <h1 className="type-heading" style={{ fontSize: 18, fontWeight: 900 }}>
              BATCH SIMULATION SETUP
            </h1>
            <p className="type-body" style={{ fontSize: 11.5, marginTop: 2, color: 'var(--text-secondary)' }}>
              Configure product parameters, choose simulation mode, and initialize manufacturing loop.
            </p>
          </div>
        </div>
        <span className="cyber-sticker cyber-sticker--pink">INITIALIZATION PREPARED</span>
      </div>

      {/* ── CARD 2: Product Formulation Selection (span 8) ──────────── */}
      <div
        className="glass-panel crosshair-corner animate-slide-up"
        style={{
          gridColumn: 'span 8',
          padding: '20px 24px',
          animationDelay: '0.05s',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span className="cyber-sticker" style={{ margin: 0 }}>
            STEP 01
          </span>
          <h2 className="type-section" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 900 }}>
            <Pill aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--neon-accent)' }} />
            SELECT ACTIVE FORMULATION
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
          {PRODUCTS.map(p => {
            const selected = selectedSimId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedSimId(p.id)}
                style={{
                  textAlign: 'left',
                  padding: 16,
                  borderRadius: 8,
                  border: `3px solid ${selected ? '#000000' : 'var(--glass-border)'}`,
                  background: selected ? p.glowColor : 'var(--bg-base)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  position: 'relative',
                  boxShadow: selected ? `4px 4px 0px 0px ${p.borderColor}` : 'none',
                }}
                aria-pressed={selected}
                aria-label={`Select ${p.name}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: selected ? p.difficultyColor : 'var(--text-muted)',
                        background: 'var(--bg-surface)',
                        border: `1.5px solid ${selected ? p.borderColor : 'var(--glass-border)'}`,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 9,
                        fontWeight: 800,
                      }}
                    >
                      {p.dosage}
                    </span>
                  </div>
                  {selected && (
                    <CheckCircle2
                      aria-hidden="true"
                      style={{ width: 16, height: 16, color: p.borderColor, flexShrink: 0 }}
                    />
                  )}
                </div>

                <div>
                  <div className="type-subhead" style={{ fontSize: 13.5, marginBottom: 5, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {p.name}
                  </div>
                  <p className="type-caption" style={{ fontSize: 10, lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                    {p.desc}
                  </p>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 10,
                  borderTop: '2px solid var(--glass-border)',
                  marginTop: 4,
                  width: '100%',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>BATCH SIZE: <strong style={{ color: '#16a34a' }}>{p.batchSize}</strong></span>
                  <span style={{ color: p.difficultyColor, fontWeight: 900 }}>
                    {p.difficulty.toUpperCase()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CARD 3: cGMP Readiness Checklist (span 4) ────────────────── */}
      <div
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
            cGMP PRE-FLIGHT
          </span>
          <h3 className="type-section" style={{ fontSize: 12.5, fontWeight: 900, color: 'var(--text-primary)', marginTop: 8, marginBottom: 14 }}>
            FACILITY COMPLIANCE CHECKS
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
          {SYSTEM_CHECKLIST.map(item => (
            <div
              key={item.label}
              style={{
                background: 'var(--bg-base)',
                border: '2px solid var(--glass-border)',
                borderRadius: 6,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.1)',
              }}
            >
              <span className="type-caption" style={{ fontSize: 9.5, color: 'var(--text-secondary)', fontWeight: 800 }}>
                {item.label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  fontWeight: 900,
                  color: item.color,
                  border: `1.5px solid ${item.color}`,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'var(--bg-surface)',
                }}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '2px solid var(--glass-border)', paddingTop: 8, fontSize: 8.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          SECURE ENCRYPTED COMPLIANCE REPORTING
        </div>
      </div>

      {/* ── CARD 4: Operational Mode (span 8) ─────────────────────────── */}
      <div
        className="glass-panel crosshair-corner animate-slide-up"
        style={{
          gridColumn: 'span 8',
          padding: '20px 24px',
          animationDelay: '0.1s',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span className="cyber-sticker cyber-sticker--pink" style={{ margin: 0 }}>
            STEP 02
          </span>
          <h2 className="type-section" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 900 }}>
            <Shield aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--neon-accent)' }} />
            CHOOSE OPERATIONAL CONSOLE MODE
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          {MODES.map(m => {
            const selected = selectedMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                style={{
                  textAlign: 'left',
                  padding: 16,
                  borderRadius: 8,
                  border: `3px solid ${selected ? '#000000' : 'var(--glass-border)'}`,
                  background: selected ? m.accentColor : 'var(--bg-base)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: selected ? `4px 4px 0px 0px ${m.borderColor}` : 'none',
                }}
                aria-pressed={selected}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    color: selected ? m.color : 'var(--text-muted)',
                  }}
                  >
                    {m.icon}
                    <span className="type-subhead" style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {m.label}
                    </span>
                  </div>
                  {m.tag && (
                    <span className="cyber-sticker cyber-sticker--pink" style={{ fontSize: 8, padding: '1px 5px', boxShadow: 'none', borderSize: 1 }}>
                      {m.tag}
                    </span>
                  )}
                </div>
                <p className="type-caption" style={{ fontSize: 9.5, lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                  {m.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CARD 5: Command Launch Deck (span 4) ─────────────────────── */}
      <div
        className="glass-panel crosshair-corner animate-slide-up"
        style={{
          gridColumn: 'span 4',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)',
          animationDelay: '0.15s',
        }}
      >
        <div>
          <span className="cyber-sticker cyber-sticker--green" style={{ marginBottom: 12 }}>
            LAUNCH CONTROLS
          </span>
        </div>

        <div style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
          <div style={{ borderLeft: '2px solid var(--neon-accent)', paddingLeft: 8 }}>
            <span style={{ color: 'var(--text-muted)' }}>FORMULATION: </span>
            <strong style={{ color: 'var(--text-primary)' }}>{selectedProduct?.name?.toUpperCase()}</strong>
          </div>
          <div style={{ borderLeft: '2px solid var(--neon-accent)', paddingLeft: 8 }}>
            <span style={{ color: 'var(--text-muted)' }}>RUN MODE: </span>
            <strong style={{ color: 'var(--text-primary)' }}>{selectedMode === 'individual' ? 'DUAL VM & QMS OVERWATCH' : selectedMode.toUpperCase() + ' FOCUS'}</strong>
          </div>
        </div>

        <button
          onClick={handleLaunchClick}
          disabled={loading}
          className="pill-btn"
          style={{ width: '100%', fontSize: '0.85rem', padding: '14px 20px', display: 'flex', justifyContent: 'center' }}
        >
          {loading ? (
            <>
              <span className="animate-spin-slow" style={{ display: 'inline-block', width: 14, height: 14, marginRight: 6 }}>⟳</span>
              LOADING ENGINE...
            </>
          ) : (
            <>
              <Play aria-hidden="true" style={{ width: 15, height: 15, fill: 'currentColor' }} />
              ACTIVATE SIM ENGINE
            </>
          )}
        </button>
      </div>

      <FormulationGuideModal
        config={selectedSimConfig}
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onConfirm={handleConfirmLaunch}
      />
    </div>
  );
}
