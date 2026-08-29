import { useEffect, useState } from 'react';
import { useSimStore } from '../store';
import RoleGrid from './vm/RoleGrid';
import OperatorStepFlow from './vm/OperatorStepFlow';
import MachineMonitorPanel from './vm/MachineMonitorPanel';
import { AlertTriangle, Wrench, CheckCircle2, Clock, ChevronRight } from 'lucide-react';

// =====================================================================
// VM PANEL — container for the 10-role technical flow
// =====================================================================
// This is the ONLY VM entry point. It never spawns a separate top-level
// panel: selecting a role swaps the content INSIDE this same panel
// between the 10-role grid and that role's dedicated operator view.
// =====================================================================

export default function VMPanel() {
  const {
    batchState,
    batchRoles,
    selectedRoleKey,
    openRole,
    activeEvent,
    alarmActive,
    operatorAction,
    capa,
    capaFix,
    submitCapaFix,
    roleDefinitions,
    qmsScores,
  } = useSimStore();

  const [showFixForm, setShowFixForm]     = useState(false);
  const [afterValue, setAfterValue]       = useState('');
  const [submittingFix, setSubmittingFix] = useState(false);

  const activeRoleDef = roleDefinitions?.find(r => r.key === selectedRoleKey);
  const isCurrentAlarmStage = activeRoleDef && activeRoleDef.stageName === activeEvent?.stage_name;
  const isCompleted = batchState?.stages?.every(s => s.status === 'completed');

  useEffect(() => {
    if (capa && (capa.status === 'open' || capa.status === 'failed') && activeEvent) {
      setAfterValue(String(activeEvent.expected ?? ''));
    }
  }, [capa?.status, activeEvent?.id]);

  if (!batchState) {
    return (
      <div className="placeholder">
        <div style={{
          width: 56, height: 56,
          borderRadius: 'var(--radius-xl)',
          background: 'rgba(6,182,212,0.08)',
          border: '1px solid rgba(6,182,212,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, marginBottom: 8,
        }}>
          ⚙️
        </div>
        <h2>VM Role Panel</h2>
        <p>Choose a simulation from Setup to start a batch, then select your operator role below.</p>
      </div>
    );
  }

  const { batch } = batchState;

  const handleAlarmAction = async (action) => {
    if (!activeEvent) return;
    await operatorAction(batch.id, activeEvent.id, action);
  };

  const handleFixSubmit = async (e) => {
    e.preventDefault();
    if (!capa || !activeEvent) return;
    setSubmittingFix(true);
    try {
      await submitCapaFix(capa.id, batch.id, activeEvent.parameter, activeEvent.actual, Number(afterValue));
      setShowFixForm(false);
    } catch (err) {
      console.error('CAPA fix failed:', err);
    } finally {
      setSubmittingFix(false);
    }
  };

  return (
    <div className="vm-panel-inner">

      {/* ── Plant-wide Alarm Banner ──────────────────────────────────── */}
      {alarmActive && activeEvent && !activeEvent.acknowledged && !isCurrentAlarmStage && (
        <div className="process-alarm" role="alert" aria-live="assertive">
          <div className="alarm-header">
            <div className="alarm-icon" aria-hidden="true">🚨</div>
            <div>
              <h3>Process Alarm Active</h3>
              <span className="alarm-stage">
                {activeEvent.stage_name || 'Unknown Stage'}
              </span>
            </div>
          </div>

          <div className="alarm-message">
            {activeEvent.message || 'Process parameter outside expected range.'}
          </div>

          <div className="alarm-readings" role="group" aria-label="Alarm readings">
            <div className="alarm-reading">
              <span>Parameter</span>
              <strong>{activeEvent.parameter || '—'}</strong>
            </div>
            <div className="alarm-reading">
              <span>Expected</span>
              <strong>{activeEvent.expected ?? '—'}</strong>
            </div>
            <div className="alarm-reading">
              <span>Actual</span>
              <strong className="alarm-actual">{activeEvent.actual ?? '—'}</strong>
            </div>
          </div>

          <div className="alarm-actions" role="group" aria-label="Alarm response actions">
            <button type="button" onClick={() => handleAlarmAction('acknowledge')}>
              ✓ Acknowledge
            </button>
            <button type="button" onClick={() => handleAlarmAction('pause')}>
              ⏸ Pause
            </button>
            <button type="button" onClick={() => handleAlarmAction('stop')}>
              ⏹ Stop
            </button>
            <button type="button" onClick={() => handleAlarmAction('resume')}>
              ▶ Resume
            </button>
          </div>
        </div>
      )}

      {/* ── CAPA Waiting State ───────────────────────────────────────── */}
      {capa && !capa.sent_for_review && (capa.status === 'open' || capa.status === 'failed') && (
        <div className="vm-fix-waiting" role="status">
          <span style={{ fontSize: 18, flexShrink: 0 }}>🧾</span>
          <span>
            QMS has opened <strong style={{ color: 'var(--teal-light)' }}>CAPA #{capa.id}</strong> for this event.
            Waiting for the CAPA Coordinator to prepare and send the corrective action to VM.
          </span>
        </div>
      )}

      {/* ── CAPA Fix Card ────────────────────────────────────────────── */}
      {capa && capa.sent_for_review && (capa.status === 'open' || capa.status === 'failed') && activeEvent && (
        <div className="vm-fix-card" role="region" aria-label="Corrective action required">
          <div className="vm-fix-header">
            <div className="vm-fix-icon" aria-hidden="true">🛠️</div>
            <div>
              <h3>Corrective Action Required</h3>
              <span>CAPA #{capa.id}</span>
            </div>
          </div>

          <p className="vm-fix-copy">
            {capa.status === 'failed'
              ? 'The previous reading failed verification. Reapply the corrective action and submit a new reading.'
              : 'QMS has logged a CAPA for this event. Apply the corrective action on the machine and submit the corrected reading.'}
          </p>

          <div className="vm-fix-readings" role="group" aria-label="Parameter readings">
            <div>
              <span>Parameter</span>
              <strong>{activeEvent.parameter}</strong>
            </div>
            <div>
              <span>Before (drifted)</span>
              <strong style={{ color: 'var(--danger-light)' }}>{activeEvent.actual}</strong>
            </div>
            <div>
              <span>Target</span>
              <strong style={{ color: 'var(--success-light)' }}>{activeEvent.expected}</strong>
            </div>
          </div>

          {!showFixForm ? (
            <button
              type="button"
              className="qms-primary-button"
              onClick={() => setShowFixForm(true)}
              style={{ alignSelf: 'flex-start' }}
            >
              <Wrench aria-hidden="true" style={{ width: 13, height: 13 }} />
              Submit Corrected Reading
            </button>
          ) : (
            <form onSubmit={handleFixSubmit} className="vm-fix-form">
              <div className="qms-form-group">
                <label htmlFor="afterValue">Corrected {activeEvent.parameter}</label>
                <input
                  id="afterValue"
                  type="number"
                  step="0.1"
                  value={afterValue}
                  onChange={e => setAfterValue(e.target.value)}
                  required
                  aria-describedby="afterValueHint"
                />
                <span id="afterValueHint" className="type-caption" style={{ fontSize: 10 }}>
                  Enter the corrected value after applying the fix on the machine.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  className="qms-primary-button"
                  disabled={submittingFix}
                >
                  {submittingFix ? (
                    <>⟳ Submitting...</>
                  ) : (
                    <>
                      <CheckCircle2 aria-hidden="true" style={{ width: 13, height: 13 }} />
                      Submit Fix
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="pill-btn pill-btn-secondary"
                  style={{ fontSize: 12, padding: '7px 16px' }}
                  onClick={() => setShowFixForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Pending Verification ─────────────────────────────────────── */}
      {capa && capa.status === 'pending_verification' && (
        <div className="vm-fix-waiting" role="status">
          <span style={{ fontSize: 18, flexShrink: 0 }}>✅</span>
          <span>
            Corrected reading submitted (<strong style={{ color: 'var(--teal-light)' }}>{capaFix?.afterValue}</strong>).
            Waiting for QMS verification from the QA Reviewer.
          </span>
        </div>
      )}

      {/* ── Batch Release Banner ─────────────────────────────────────── */}
      {batch.status === 'released' && (
        <div className="vm-release-banner" role="status">
          <CheckCircle2 aria-hidden="true" style={{ width: 18, height: 18, color: 'var(--success-light)', flexShrink: 0 }} />
          Batch released by QMS — continue the remaining pipeline stages.
        </div>
      )}

      {/* ── Role Grid / Operator Step Flow ───────────────────────────── */}
      {isCompleted ? (
        <SimulationCompletionCard batchState={batchState} qmsScores={qmsScores} />
      ) : (
        <>
          {!selectedRoleKey && <RoleGrid batchRoles={batchRoles} onOpenRole={openRole} />}
          {selectedRoleKey && selectedRoleKey === 'monitor'   && <MachineMonitorPanel />}
          {selectedRoleKey && selectedRoleKey !== 'monitor'   && <OperatorStepFlow roleKey={selectedRoleKey} />}
        </>
      )}
    </div>
  );
}

function SimulationCompletionCard({ batchState, qmsScores }) {
  const vmScores = batchState?.stepScores || [];
  const loading = false;
  const batch = batchState?.batch;
  // Aggregate VM Operator Checkpoints
  const vmTotalScore = vmScores.reduce((acc, curr) => acc + curr.marks_awarded, 0);
  const vmTotalMax = vmScores.reduce((acc, curr) => acc + curr.marks_max, 0);

  // Aggregate QMS Decision Checkpoints
  const quizScoresArray = Object.values(qmsScores || {});
  const qmsTotalScore = quizScoresArray.reduce((acc, curr) => acc + curr.score, 0);
  const qmsTotalMax = quizScoresArray.reduce((acc, curr) => acc + curr.maxScore, 0);

  // Combined totals
  const totalScore = vmTotalScore + qmsTotalScore;
  const totalMax = vmTotalMax + qmsTotalMax;
  
  const scorePercent = totalMax > 0 ? (totalScore / totalMax) * 100 : 100;
  
  let grade = 'A+';
  let gradeColor = '#10b981';
  let gradeDesc = 'Exceptional cGMP Compliance & Quality Triage';
  
  if (scorePercent < 50) {
    grade = 'FAIL';
    gradeColor = '#ef4444';
    gradeDesc = 'Critical GMP Violations: Batch Rejected';
  } else if (scorePercent < 75) {
    grade = 'C (Deficient)';
    gradeColor = '#f59e0b';
    gradeDesc = 'Quality Deviations Detected: Rework Recommended';
  } else if (scorePercent < 90) {
    grade = 'B (Acceptable)';
    gradeColor = '#3b82f6';
    gradeDesc = 'Good SOP Compliance with Minor Deviations';
  } else if (scorePercent < 95) {
    grade = 'A';
    gradeColor = '#10b981';
    gradeDesc = 'High Quality Execution & Compliance Standard';
  }

  const handleViewScorecard = () => {
    window.dispatchEvent(new CustomEvent('change-view', { detail: 'scorecard' }));
  };

  const handleRestart = () => {
    window.dispatchEvent(new CustomEvent('change-view', { detail: 'setup' }));
  };

  return (
    <div className="sim-completion-card glass-surface animate-fade-in" style={{ padding: '24px 28px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="completion-award-glow" style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }} />
      
      <div className="completion-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, zIndex: 1 }}>
        <span className="trophy-pulse" style={{ fontSize: 48, display: 'block', animation: 'floatPill 4s ease-in-out infinite' }}>🏆</span>
        <h2 className="type-heading" style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '0.04em', color: '#ffffff' }}>Simulation Concluded</h2>
        <p className="type-body" style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Batch #{batch?.id} · {batchState?.simulationConfig?.name || 'Paracetamol 500 mg'}
        </p>
      </div>

      <div className="completion-content-row" style={{ display: 'flex', gap: 32, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', zIndex: 1 }}>
        {/* Score Ring Display */}
        <div className="score-gauge-container" style={{ flexShrink: 0 }}>
          <div className="score-ring-outer" style={{
            position: 'relative',
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: `conic-gradient(#10b981 ${scorePercent}%, rgba(255,255,255,0.06) ${scorePercent}%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16,185,129,0.15)'
          }}>
            <div className="score-ring-inner" style={{
              width: 124,
              height: 124,
              borderRadius: '50%',
              background: '#090e1a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2
            }}>
              <span className="score-percent" style={{ fontSize: 32, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>{scorePercent.toFixed(0)}%</span>
              <span className="score-fraction" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{totalScore} / {totalMax} Pts</span>
            </div>
          </div>
        </div>

        {/* Evaluation Summary */}
        <div className="completion-metrics" style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grade-badge-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="completion-grade" style={{ fontSize: 24, fontWeight: 900, color: gradeColor, display: 'block' }}>
              {grade}
            </span>
            <p className="grade-description" style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0, fontWeight: 600, lineHeight: 1.4 }}>{gradeDesc}</p>
          </div>

          <div className="metrics-breakdown" style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
            <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>VM Operator Checkpoints</span>
              <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{loading ? '...' : `${vmTotalScore} / ${vmTotalMax} Pts`}</strong>
            </div>
            <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>QMS Decision Rubrics</span>
              <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{qmsTotalScore} / {qmsTotalMax} Pts</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="completion-actions" style={{ display: 'flex', gap: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, zIndex: 1, flexWrap: 'wrap' }}>
        <button type="button" className="qms-primary-button" style={{ flex: 1, minWidth: 200, padding: '12px 24px', fontSize: 13, background: 'linear-gradient(135deg, var(--teal) 0%, var(--pharma-blue) 100%)', borderColor: 'rgba(6,182,212,0.4)', color: '#ffffff', fontWeight: 800 }} onClick={handleViewScorecard}>
          📊 View Performance Scorecard
        </button>
        <button type="button" className="pill-btn pill-btn-secondary" style={{ padding: '12px 24px', fontSize: 13, border: '2px solid #000000', color: 'var(--text-primary)', fontWeight: 800, minWidth: 160 }} onClick={handleRestart}>
          ⟳ Start New Simulation
        </button>
      </div>
    </div>
  );
}
