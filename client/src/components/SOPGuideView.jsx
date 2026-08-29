import React, { useState } from 'react';
import { BookOpen, Search, ShieldCheck } from 'lucide-react';
import { useSimStore } from '../store';

const SOPS = [
  {
    id: 'SOP-MAN-003',
    title: 'High-Shear Wet Granulation & Thermal Monitoring',
    category: 'Virtual Manufacturing',
    categoryColor: 'var(--teal-light)',
    content: `1. PURITY CHECK: Ensure Granulator Bowl GB-02 is cleaned per SOP-CLEAN-012.

2. DISPENSING VERIFICATION: Confirm Paracetamol API (300kg) and Binder Solution (PVP K-30) weighed accurately.

3. IMPELLER SPEED: Maintain main impeller at 450 RPM ± 20 RPM during wet massing.

4. THERMAL TOLERANCE: Monitor temperature sensor PT-100. Target: 55.0°C. If temperature exceeds 65.0°C, IMMEDIATELY ACKNOWLEDGE alarm, pause main drive, and report event to QMS.

5. SAMPLING: Perform loss on drying (LOD) check at 15 min intervals. Target LOD: 2.2% - 2.8%.`,
  },
  {
    id: 'SOP-QMS-012',
    title: 'Quality Event Triage & 6M Ishikawa Fishbone Analysis',
    category: 'Quality Management',
    categoryColor: 'var(--mission-light)',
    content: `1. TRIAGE TIMELINE: QMS Triage Monitor must evaluate all incoming VM process alarms within 3 minutes.

2. SIGNIFICANCE EVALUATION: SME must assess whether the deviation impacts Critical Quality Attributes (CQAs) or Critical Process Parameters (CPPs).

3. ISHIKAWA 6M MATRIX: Document findings under Man, Machine, Material, Method, Measurement, and Environment.

4. 5-WHYS DRILL-DOWN: Continue questioning root cause until systemic machine/procedural breakdown is identified.

5. CAPA ASSIGNMENT: Log corrective action item with specific parameter target and tolerance band.`,
  },
  {
    id: 'SOP-REL-001',
    title: 'Batch Release & Certificate of Analysis (CoA) Protocol',
    category: 'Release & Compliance',
    categoryColor: 'var(--success-light)',
    content: `1. PRE-RELEASE AUDIT: Confirm all 9 manufacturing stages are marked 'completed' and signed off in e-Batch Record.

2. CAPA CLOSURE: Verify all opened CAPAs passed QMS parameter verification.

3. COA GENERATION: Run automated USP Pharmacopeia compliance suite (Assay 98-102%, Dissolution Q=80% at 30 min, Friability < 0.8%).

4. QA AUTHORIZATION: Authorized QA Reviewer must apply 21 CFR Part 11 electronic PKI signature.`,
  },
];

const SHORTCUTS = [
  { key: 'Space',  desc: 'Acknowledge Active Alarm' },
  { key: 'Tab',    desc: 'Switch VM & QMS Focus'    },
  { key: 'Esc',    desc: 'Close Role Details Modal'  },
  { key: 'Alt+C',  desc: 'Open CAPA Workbench'      },
];

// Split SOP content into numbered steps for display
function parseSopSteps(content) {
  return content.split('\n\n').filter(Boolean);
}

export default function SOPGuideView() {
  const { batchState, simulations } = useSimStore();
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [search, setSearch]           = useState('');
  const [selectedSop, setSelectedSop] = useState('SOP-MAN-003');

  const activeConfig = simulations.find(s => s.id === selectedRecipeId) || batchState?.simulationConfig || simulations[0] || null;

  const ALL_SOPS = [
    ...SOPS,
    {
      id: 'BATCH-INSTRUCTIONS',
      title: activeConfig ? `Recipe Targets: ${activeConfig.name}` : 'Active Batch Recipe Targets',
      category: 'Batch Reference',
      categoryColor: 'var(--mission-light)',
      content: '',
      isBatchInstructions: true,
    }
  ];

  const filtered    = ALL_SOPS.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );
  const currentSop  = ALL_SOPS.find(s => s.id === selectedSop) || ALL_SOPS[0];
  const steps       = currentSop.isBatchInstructions ? [] : parseSopSteps(currentSop.content);

  return (
    <div
      style={{
        flex: 1,
        padding: '28px 24px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 1300,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div
        className="glass-panel crosshair-corner animate-fade-in"
        style={{
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
            width: 40, height: 40,
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(6,182,212,0.15)',
            border: '2px solid rgba(6,182,212,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen aria-hidden="true" style={{ width: 18, height: 18, color: 'var(--teal)' }} />
          </div>
          <div>
            <h1 className="type-heading" style={{ fontSize: 20, fontWeight: 900, color: '#ffffff' }}>
              Standard Operating Procedures — cGMP Handbook
            </h1>
            <p className="type-body" style={{ fontSize: 12, marginTop: 2, color: '#94a3b8' }}>
              Official Alarm Matrix, Operational SOPs & Simulation Reference Guide
            </p>
          </div>
        </div>
        <span className="cyber-sticker">cGMP Compliant</span>
      </div>

      {/* ── Demo Notice ────────────────────────────────────────────────── */}
      <div
        className="glass-panel animate-fade-in"
        style={{
          padding: '12px 18px',
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 18 }}>🚨</span>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#f87171', lineHeight: 1.4 }}>
          <strong>PROTOTYPE RUNTIME NOTICE // FUNCTIONAL LIMITATION WARNING</strong><br />
          This handbook and recipe targets list represents the conceptual workflow design. 
          Only the <strong>Paracetamol 500 mg</strong> recipe and the corresponding <strong>Milling Stage temperature deviation</strong> are fully interactive in this prototype environment. All other SOP entries are for validation demonstration.
        </div>
      </div>

      {/* ── Two-pane layout ────────────────────────────────────────────── */}
      <div
        className="animate-slide-up"
        style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, animationDelay: '0.05s' }}
      >
        {/* Left pane: SOP list */}
        <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search
              aria-hidden="true"
              style={{ width: 13, height: 13, color: 'var(--text-muted)', position: 'absolute', left: 11, top: 11 }}
            />
            <input
              type="text"
              placeholder="Search SOPs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 'var(--radius-md)',
                paddingLeft: 32, paddingRight: 12,
                paddingTop: 8, paddingBottom: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--text-primary)',
                transition: 'var(--transition-fast)',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.outline = 'none'; }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; }}
              aria-label="Search Standard Operating Procedures"
            />
          </div>

          <span className="type-label" style={{ fontSize: 9, marginBottom: -4 }}>
            {filtered.length} SOP{filtered.length !== 1 ? 's' : ''} Available
          </span>

          <nav aria-label="SOP list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(sop => {
              const selected = selectedSop === sop.id;
              return (
                <button
                  key={sop.id}
                  onClick={() => setSelectedSop(sop.id)}
                  aria-current={selected ? 'page' : undefined}
                  style={{
                    textAlign: 'left',
                    padding: '11px 13px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${selected ? 'rgba(6,182,212,0.45)' : 'rgba(0,0,0,0.06)'}`,
                    background: selected ? 'rgba(6,182,212,0.08)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    boxShadow: selected ? '0 0 10px rgba(6,182,212,0.15)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!selected) e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={e => {
                    if (!selected) e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
                  }}
                >
                  <span
                    className="type-label"
                    style={{ color: selected ? 'var(--teal)' : 'var(--text-muted)', fontSize: 9.5 }}
                  >
                    {sop.id}
                  </span>
                  <span
                    className="type-subhead"
                    style={{ fontSize: 11.5, color: selected ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.3 }}
                  >
                    {sop.title}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right pane: viewer */}
        <div className="glass-panel crosshair-corner" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* SOP header */}
          <div style={{ borderBottom: '1px solid rgba(6,182,212,0.15)', paddingBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                className="status-badge"
                style={{
                  background: `${currentSop.categoryColor}14`,
                  color: currentSop.categoryColor,
                  borderColor: `${currentSop.categoryColor}30`,
                  fontSize: 9.5,
                }}
              >
                {currentSop.category}
              </span>
              <span className="type-label" style={{ color: 'var(--teal)', fontSize: 9.5 }}>
                {currentSop.id}
              </span>
            </div>
            <h2 className="type-section" style={{ fontSize: 16 }}>
              {currentSop.title}
            </h2>
          </div>

          {/* Step-by-step content */}
          {currentSop.isBatchInstructions ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {simulations.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '4px 0' }}>
                  <span className="type-label" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Select Recipe:</span>
                  <select
                    value={selectedRecipeId || activeConfig?.id || ''}
                    onChange={e => setSelectedRecipeId(e.target.value)}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11.5,
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  >
                    {simulations.map(sim => (
                      <option key={sim.id} value={sim.id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                        {sim.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} role="list">
                {activeConfig ? (
                  (activeConfig.evaluationRubric?.vmCheckpoints || []).map((checkpoint, idx) => (
                    <div
                      key={idx}
                      role="listitem"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        background: 'var(--bg-card)',
                        border: '1px solid rgba(0,0,0,0.06)',
                        borderRadius: 'var(--radius-md)',
                        padding: '11px 14px',
                        transition: 'var(--transition-fast)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}
                    >
                      {/* Step number */}
                      <div style={{
                        width: 22, height: 22,
                        borderRadius: '50%',
                        background: 'rgba(168,85,247,0.1)',
                        border: '1px solid rgba(168,85,247,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--mission-light)',
                        flexShrink: 0,
                        marginTop: 1,
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span
                            className="type-label"
                            style={{ color: 'var(--teal-light)', fontSize: 10 }}
                          >
                            {checkpoint.stage.toUpperCase()}
                          </span>
                          <span className="status-badge" style={{
                            background: 'rgba(6,182,212,0.1)',
                            color: 'var(--teal)',
                            borderColor: 'rgba(6,182,212,0.25)',
                            fontSize: '9px',
                            padding: '1px 6px'
                          }}>
                            {checkpoint.marks} pts
                          </span>
                        </div>
                        <p
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            lineHeight: 1.65,
                          }}
                        >
                          {checkpoint.expectedBehavior}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                    No active recipe config found. Start a batch in Setup.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} role="list">
              {steps.map((step, idx) => {
                const colonIdx = step.indexOf(':');
                const label    = colonIdx > -1 ? step.slice(0, colonIdx) : null;
                const body     = colonIdx > -1 ? step.slice(colonIdx + 1).trim() : step;

                return (
                  <div
                    key={idx}
                    role="listitem"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      background: 'var(--bg-card)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: 'var(--radius-md)',
                      padding: '11px 14px',
                      transition: 'var(--transition-fast)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}
                  >
                    {/* Step number */}
                    <div style={{
                      width: 22, height: 22,
                      borderRadius: '50%',
                      background: 'rgba(6,182,212,0.1)',
                      border: '1px solid rgba(6,182,212,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--teal)',
                      flexShrink: 0,
                      marginTop: 1,
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      {label && (
                        <span
                          className="type-label"
                          style={{ color: 'var(--teal-light)', display: 'block', marginBottom: 4, fontSize: 10 }}
                        >
                          {label}
                        </span>
                      )}
                      <p
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.65,
                        }}
                      >
                        {body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Keyboard shortcuts */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(124, 58, 237, 0.05)',
              border: '1px solid rgba(124, 58, 237, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <h3
              style={{ display: 'flex', alignItems: 'center', gap: 7 }}
              className="type-section"
            >
              <ShieldCheck aria-hidden="true" style={{ width: 14, height: 14, color: 'var(--mission-light)' }} />
              Command Center Keyboard Shortcuts
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 }}>
              {SHORTCUTS.map(({ key, desc }) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11.5,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <kbd
                    style={{
                      padding: '2px 9px',
                      background: 'var(--bg-input)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderBottom: '2px solid rgba(0,0,0,0.15)',
                      borderRadius: 5,
                      fontSize: 10.5,
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {key}
                  </kbd>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
