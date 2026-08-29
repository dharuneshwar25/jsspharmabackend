import React, { useState } from 'react';
import { useSimStore } from '../store';
import { Network, HelpCircle, CheckCircle2, FileText, ArrowRight } from 'lucide-react';

const CATEGORIES = [
  { id: 'Man',         label: '👨‍🔬 Manpower',   desc: 'Personnel, training, SOP compliance' },
  { id: 'Machine',     label: '⚙️ Machine',     desc: 'Equipment, seals, wear, calibration' },
  { id: 'Material',    label: '🧪 Material',    desc: 'API quality, excipients, moisture'    },
  { id: 'Method',      label: '📋 Method',      desc: 'Parameters, speeds, process time'     },
  { id: 'Measurement', label: '📏 Measurement', desc: 'Sensors, probes, analytical precision' },
  { id: 'Environment', label: '🌡️ Environment', desc: 'HVAC, RH%, ambient temperature'       },
];

const WHY_STEPS = [
  { question: 'Why did the Granulation Bowl temperature exceed 65°C?',     default: 'High mechanical friction in main impeller drive shaft.' },
  { question: 'Why did the drive shaft experience high friction?',          default: 'Sealer ring degradation caused binder liquid ingress.'   },
  { question: 'Why did binder liquid penetrate the sealer ring?',          default: 'Preventive maintenance torque check was delayed past 500 hrs.' },
  { question: 'Why was PM torque check delayed?',                          default: 'Schedule conflict during previous batch release cycle.'  },
  { question: 'What is the validated Root Cause?',                         default: 'Mechanical seal failure due to overdue PM service leading to friction heat spike.' },
];

const DEFAULT_ISHIKAWA = {
  Man:         'Operator shift handover log verified; technical certification valid.',
  Machine:     'Impeller seal friction elevation detected at 450 RPM.',
  Material:    'Microcrystalline Cellulose batch Lot #MC-882 within CoA bounds.',
  Method:      'SOP-MAN-049 Granulation cycle parameter set correctly.',
  Measurement: 'Temperature probe PT-100 calibrated within ±0.2°C.',
  Environment: 'Cleanroom ISO Class 8 Relative Humidity at 42%.',
};

export default function InvestigationSuiteView() {
  const { batchState, activeEvent, deviation, submitInvestigation } = useSimStore();

  const [selectedCategory, setSelectedCategory] = useState('Machine');
  const [ishikawaNotes, setIshikawaNotes]         = useState(DEFAULT_ISHIKAWA);
  const [whySteps, setWhySteps]                   = useState(
    WHY_STEPS.map(s => ({ question: s.question, answer: s.default }))
  );
  const [rootCause, setRootCause]                 = useState('Mechanical seal degradation & binder ingress leading to frictional overheat.');
  const [immediateAction, setImmediateAction]     = useState('Halt granulation, isolate granule mass in quarantine bin QB-04, replace seal ring.');
  const [proposedCorrective, setProposedCorrective] = useState('Perform shaft realignment, fit fresh PTFE seal gasket, recalibrate thermal sensors.');
  const [proposedPreventive, setProposedPreventive] = useState('Update PM schedule lock in CMMS to mandate seal inspection every 300 operating hrs.');
  const [submitted, setSubmitted]                 = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deviation?.id || !batchState?.batch?.id) return;
    try {
      await submitInvestigation(deviation.id, batchState.batch.id, {
        whatHappened:      activeEvent?.message || 'Granulation process thermal deviation',
        possibleCauses:    JSON.stringify(ishikawaNotes),
        evidence:          whySteps.map(w => w.answer).join(' -> '),
        rootCause,
        immediateAction,
        proposedCorrective,
        proposedPreventive,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Investigation submit failed:', err);
    }
  };

  const updateWhyStep = (idx, answer) => {
    setWhySteps(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], answer };
      return copy;
    });
  };

  return (
    <div
      style={{
        flex: 1,
        padding: '20px 16px 40px',
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 16,
        maxWidth: 1400,
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
          background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(8,12,24,0.85) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44,
            borderRadius: 6,
            background: 'var(--bg-card)',
            border: '2.5px solid var(--neon-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '3px 3px 0px 0px rgba(0,0,0,0.15)',
          }}>
            <Network aria-hidden="true" style={{ width: 18, height: 18, color: 'var(--neon-accent)' }} />
          </div>
          <div>
            <h1 className="type-heading" style={{ fontSize: 18, fontWeight: 900, color: '#ffffff' }}>
              QMS DEVIATION DIAGNOSTICS SUITE
            </h1>
            <p className="type-body" style={{ fontSize: 11.5, marginTop: 2, color: '#94a3b8' }}>
              6M Ishikawa Matrix & 5-Whys Diagnostic Wizard for Batch #{batchState?.batch?.id || '904'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="cyber-sticker cyber-sticker--pink">DEVIATION {deviation?.id || 'DEV-102'}</span>
          <span className="status-badge status-badge--warning" style={{ fontSize: 10, padding: '5px 12px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 6, boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.1)', background: 'var(--warning)', color: '#000' }}>
            INVESTIGATION ACTIVE
          </span>
        </div>
      </div>

      {/* ── CARD 2: Ishikawa 6M Fishbone (span 7) ────────────────────── */}
      <div
        className="glass-panel crosshair-corner animate-slide-up"
        style={{
          gridColumn: 'span 7',
          padding: 20,
          background: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          animationDelay: '0.05s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Network aria-hidden="true" style={{ width: 16, height: 16, color: 'var(--neon-accent)' }} />
            <h2 className="type-section" style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-primary)' }}>ISHIKAWA 6M CAUSE-EFFECT MATRIX</h2>
          </div>
          <span className="cyber-sticker" style={{ margin: 0, fontSize: 8 }}>FISHBONE ARRAY</span>
        </div>

        {/* 6M Category selectors grid */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}
          role="radiogroup"
          aria-label="6M category selection"
        >
          {CATEGORIES.map(cat => {
            const selected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  textAlign: 'left',
                  padding: 10,
                  borderRadius: 6,
                  border: `1px solid ${selected ? 'var(--neon-accent)' : 'rgba(0,0,0,0.08)'}`,
                  background: selected ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-input)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  boxShadow: selected ? '0 2px 8px rgba(6,182,212,0.15)' : 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 11,
                    fontWeight: 800,
                    color: selected ? 'var(--neon-text)' : 'var(--text-secondary)',
                  }}
                >
                  {cat.label}
                </span>
                <span className="type-caption" style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>{cat.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Category Notes Textarea */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 8,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
        >
          <label
            className="type-label"
            htmlFor={`ishikawa-${selectedCategory}`}
            style={{ color: 'var(--neon-accent)', fontSize: 9.5, fontWeight: 900 }}
          >
            FINDINGS // CATEGORY: {selectedCategory.toUpperCase()}
          </label>
          <textarea
            id={`ishikawa-${selectedCategory}`}
            rows={4}
            value={ishikawaNotes[selectedCategory]}
            onChange={e => setIshikawaNotes(prev => ({ ...prev, [selectedCategory]: e.target.value }))}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: 6,
              padding: '10px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-primary)',
              lineHeight: 1.6,
              resize: 'none',
              transition: 'var(--transition-fast)',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--neon-accent)'; e.target.style.outline = 'none'; }}
            onBlur={e  => { e.target.style.borderColor = 'rgba(0,0,0,0.15)'; }}
          />
        </div>
      </div>

      {/* ── CARD 3: 5-Whys Diagnostic Wizard (span 5) ───────────────── */}
      <div
        className="glass-panel crosshair-corner animate-slide-up"
        style={{
          gridColumn: 'span 5',
          padding: 20,
          background: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          animationDelay: '0.05s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle aria-hidden="true" style={{ width: 16, height: 16, color: '#ff007a' }} />
            <h2 className="type-section" style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-primary)' }}>5-WHYS ANALYSIS DIAGNOSTICS</h2>
          </div>
          <span className="cyber-sticker cyber-sticker--pink" style={{ margin: 0, fontSize: 8 }}>ROOT TRACE</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 310, paddingRight: 4 }}>
          {whySteps.map((step, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 8,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9.5,
                    fontWeight: 900,
                    color: '#ff007a',
                    border: '1.5px solid #ff007a',
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'rgba(255, 0, 122, 0.05)',
                  }}
                >
                  WHY_0{idx + 1}
                </span>
                <span className="type-caption" style={{ fontSize: 10, color: 'var(--text-primary)', fontWeight: 800, lineHeight: 1.3 }}>
                  {step.question}
                </span>
              </div>
              <input
                type="text"
                value={step.answer}
                onChange={e => updateWhyStep(idx, e.target.value)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(0,0,0,0.15)',
                  borderRadius: 4,
                  padding: '7px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-primary)',
                  transition: 'var(--transition-fast)',
                }}
                onFocus={e => { e.target.style.borderColor = '#ff007a'; e.target.style.outline = 'none'; }}
                onBlur={e  => { e.target.style.borderColor = 'rgba(0,0,0,0.15)'; }}
                aria-label={step.question}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── CARD 4: CAPA Formulation proposing (span 12) ──────────────── */}
      <form
        onSubmit={handleSubmit}
        className="glass-panel crosshair-corner animate-slide-up"
        style={{
          gridColumn: 'span 12',
          padding: 24,
          background: 'var(--bg-card)',
          animationDelay: '0.1s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <FileText aria-hidden="true" style={{ width: 16, height: 16, color: '#00ff66' }} />
          <h3 className="type-section" style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>PROPOSED CORRECTIVE & PREVENTIVE ACTION (CAPA) proposal</h3>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}
        >
          {[
            { id: 'rootCause',          label: 'Identified Root Cause',         value: rootCause,           setter: setRootCause          },
            { id: 'immediateAction',    label: 'Immediate Containment Action',   value: immediateAction,     setter: setImmediateAction    },
            { id: 'proposedCorrective', label: 'Proposed Corrective Action (CAPA)', value: proposedCorrective, setter: setProposedCorrective },
            { id: 'proposedPreventive', label: 'Proposed Preventive Action',     value: proposedPreventive,  setter: setProposedPreventive },
          ].map(field => (
            <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                htmlFor={field.id}
                className="type-label"
                style={{ fontSize: 9.5, color: 'var(--text-secondary)', fontWeight: 800 }}
              >
                {field.label.toUpperCase()}
              </label>
              <textarea
                id={field.id}
                rows={3}
                value={field.value}
                onChange={e => field.setter(e.target.value)}
                required
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11.5,
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  resize: 'none',
                  transition: 'var(--transition-fast)',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--neon-accent)'; e.target.style.outline = 'none'; }}
                onBlur={e  => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; }}
              />
            </div>
          ))}
        </div>

        {/* Submit action deck */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            borderTop: '1px solid rgba(0,0,0,0.08)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {submitted ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00ff66' }}>
              <CheckCircle2 aria-hidden="true" style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 12.5, color: '#00ff66', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                [ RECORD LOGGED // AUDIT TRAIL ARCHIVED SUCCESSFULLY ]
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="cyber-sticker cyber-sticker--yellow" style={{ fontSize: 8 }}>PREPARED</span>
              <span className="type-caption" style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>
                Verification mandate lock active. Findings will sync directly to CAPA coordinator console.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitted}
            className="pill-btn pill-btn-success"
            style={{ fontSize: '0.8125rem', padding: '11px 24px' }}
          >
            Submit Investigation Findings
            <ArrowRight aria-hidden="true" style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </form>
    </div>
  );
}
