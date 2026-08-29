import { useEffect, useMemo, useRef, useState } from 'react';
import { useSimStore } from '../../store';

// Converts camelCase or snake_case keys → "Title Case" labels
// e.g. "targetWeight" → "Target Weight", "actual_weight" → "Actual Weight"
function formatKey(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

const ICONS = {
  weight: '⚖️',
  grinder: '⚙️',
  droplet: '💧',
  wind: '🌬️',
  blend: '🔄',
  press: '🔨',
  spray: '💨',
  search: '🔍',
  box: '📦',
  radar: '📡',
};

// Simulates a live gauge easing from a start value toward a target value
// over durationMs. If the batch's scripted defect fires on this exact
// parameter, the gauge drifts toward the defect's drifted value instead —
// so the operator visually sees the same drift the document describes
// (25°C → 26°C → 28°C → 32°C).
function useLiveReading({ target, durationMs = 3000, driftTo }) {
  const [value, setValue] = useState(target ?? 0);
  const [settled, setSettled] = useState(false);
  const startRef = useRef(null);

  useEffect(() => {
    setSettled(false);
    startRef.current = null;
    const base = target ?? 0;
    const noise = () => (Math.random() - 0.5) * (base * 0.02 || 0.4);
    const endValue = driftTo != null ? driftTo : base;

    let raf;
    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = t < 1 ? base + (endValue - base) * t + noise() : endValue;
      setValue(Number(eased.toFixed(2)));
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setValue(Number(endValue.toFixed(2)));
        setSettled(true);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, driftTo]);

  return { value, settled };
}

export default function OperatorStepFlow({ roleKey }) {
  const {
    roleDetail,
    roleDetailLoading,
    submitRoleStep,
    closeRole,
    operatorAction,
    batchState,
    error,
  } = useSimStore();

  const [submitting, setSubmitting] = useState(false);
  const [draftValue, setDraftValue] = useState('');
  const [totalsDraft, setTotalsDraft] = useState({});
  const [checklistDraft, setChecklistDraft] = useState({});
  const [formError, setFormError] = useState('');

  const role = roleDetail?.role;
  const stage = roleDetail?.stage;
  const operationData = roleDetail?.operationData || {};
  const currentStepIndex = stage?.current_step ?? 0;
  const currentStep = role?.steps?.[currentStepIndex] || null;
  const isDone = role && currentStepIndex >= role.steps.length;

  // For 'set' steps flagged fromSelectTarget, look up the target the
  // operator picked in the earlier 'select' step (e.g. Dispensing:
  // Material -> Target Quantity).
  const inferredTarget = useMemo(() => {
    if (!currentStep) return null;
    if (currentStep.target != null) return currentStep.target;
    if (currentStep.fromSelectTarget && role) {
      const selectStep = role.steps.find((s) => s.type === 'select');
      const picked = selectStep && operationData[selectStep.field];
      const option = selectStep?.options.find((o) => o.value === picked);
      return option ? option.target : null;
    }
    // Fallback for Dispensing monitor/scale steps: read the targetQty set by the operator in step 4
    if (role?.key === 'dispensing' && (currentStep.key === 'monitor' || currentStep.key === 'confirm') && operationData.targetQty != null) {
      return Number(operationData.targetQty);
    }
    return null;
  }, [currentStep, role, operationData]);

  // Reset per-step local draft state whenever the step changes.
  useEffect(() => {
    if (currentStep?.type === 'set' && inferredTarget !== null) {
      setDraftValue(String(inferredTarget));
    } else {
      setDraftValue('');
    }
    setTotalsDraft({});
    setChecklistDraft({});
    setFormError('');
  }, [currentStepIndex, roleKey, inferredTarget, currentStep?.type]);

  const driftInfo =
    currentStep &&
    (currentStep.type === 'monitor' || currentStep.type === 'confirm') &&
    roleDetail?.activeEvent &&
    roleDetail.activeEvent.parameter === currentStep.field
      ? roleDetail.activeEvent
      : null;

  const showLiveGauge = currentStep && (currentStep.type === 'monitor' || currentStep.type === 'confirm');
  const { value: liveValue, settled } = useLiveReading({
    target: showLiveGauge ? (inferredTarget ?? currentStep.target ?? 0) : 0,
    durationMs: currentStep?.durationMs ?? 3000,
    driftTo: driftInfo ? Number(driftInfo.actual) : null,
  });

  useEffect(() => {
    if (showLiveGauge && settled) {
      setDraftValue(String(liveValue));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled]);

  if (!roleDetail) {
    if (error) {
      return (
        <div className="operator-panel animate-fade-in">
          <PanelHeader roleKey={roleKey} title="Error Loading Panel" onBack={closeRole} />
          <div className="operator-locked" style={{ padding: '24px 16px', textAlign: 'center' }}>
            <span className="operator-locked-icon" style={{ color: 'var(--danger-light)', fontSize: 32, display: 'block', marginBottom: 12 }}>⚠️</span>
            <h3>Failed to load operator station</h3>
            <p className="operator-step-error" style={{ margin: '12px auto', maxWidth: 400, color: 'var(--danger-light)', background: 'rgba(239,68,68,0.1)', padding: 10, borderRadius: 6, fontSize: 12 }}>
              {error}
            </p>
            <button type="button" className="pill-btn pill-btn-secondary" style={{ fontSize: 12, padding: '8px 20px' }} onClick={closeRole}>
              Return to Role Selection
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="operator-panel">
        <PanelHeader roleKey={roleKey} title="Loading..." onBack={closeRole} />
        <p className="operator-loading">Loading role panel…</p>
      </div>
    );
  }

  if (roleDetailLoading) {
    return (
      <div className="operator-panel">
        <PanelHeader roleKey={roleKey} title="Loading..." onBack={closeRole} />
        <p className="operator-loading">Loading role panel…</p>
      </div>
    );
  }

  if (roleDetail.locked) {
    return (
      <div className="operator-panel">
        <PanelHeader roleKey={roleKey} title={role.title} onBack={closeRole} />
        <div className="operator-locked">
          <span className="operator-locked-icon">🔒</span>
          <h3>This role is locked</h3>
          <p>Earlier stages in the pipeline must be completed before this role becomes active.</p>
        </div>
      </div>
    );
  }

  const submit = async (value) => {
    setSubmitting(true);
    setFormError('');
    try {
      await submitRoleStep(currentStep.key, value);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const alarmForThisStage = roleDetail.activeEvent;

  return (
    <div className="operator-panel">
      <PanelHeader roleKey={roleKey} title={role.title} onBack={closeRole} showSkip={roleKey !== 'monitor' && !isDone} />

      <p className="operator-summary">{role.summary}</p>

      <StepProgress steps={role.steps} currentIndex={currentStepIndex} done={isDone} />

      {alarmForThisStage && !alarmForThisStage.acknowledged && (
        <div className="operator-alarm-inline">
          <div className="operator-alarm-inline-head">
            <span>🚨</span>
            <div>
              <strong>Process Alarm — {alarmForThisStage.parameter}</strong>
              <span className="operator-alarm-inline-msg">{alarmForThisStage.message}</span>
            </div>
          </div>
          <div className="operator-alarm-inline-readings">
            <div className="alarm-reading">
              <span>Expected</span>
              <strong>{alarmForThisStage.expected}</strong>
            </div>
            <div className="alarm-reading">
              <span>Actual</span>
              <strong className="alarm-actual">{alarmForThisStage.actual}</strong>
            </div>
          </div>
          <div className="operator-alarm-inline-actions">
            <button type="button" style={{ background: '#dc2626', borderColor: '#dc2626' }} onClick={() => operatorAction(batchState.batch.id, alarmForThisStage.id, 'acknowledge')}>
              ACKNOWLEDGE
            </button>
            <button type="button" style={{ background: '#d97706', borderColor: '#d97706', boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)' }} onClick={() => operatorAction(batchState.batch.id, alarmForThisStage.id, 'pause')}>
              PAUSE
            </button>
            <button type="button" style={{ background: '#b91c1c', borderColor: '#b91c1c', boxShadow: '0 2px 8px rgba(185, 28, 28, 0.3)' }} onClick={() => operatorAction(batchState.batch.id, alarmForThisStage.id, 'stop')}>
              STOP
            </button>
            <button type="button" style={{ background: '#059669', borderColor: '#059669', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)' }} onClick={() => operatorAction(batchState.batch.id, alarmForThisStage.id, 'report')}>
              REPORT EVENT
            </button>
          </div>
        </div>
      )}

      {isDone ? (
        <div className="operator-complete-banner">
          <span className="operator-complete-icon">✅</span>
          <div>
            <h3>Stage Complete</h3>
            <p>{role.title} finished its technical flow for this batch. Material has moved to the next stage.</p>
          </div>
        </div>
      ) : (
        <div className="operator-step-card">
          <div className="operator-step-head">
            <span className="operator-step-index">
              Step {currentStepIndex + 1} / {role.steps.length}
            </span>
            <h3>{currentStep.label}</h3>
          </div>

          {formError && <div className="operator-step-error">{formError}</div>}

          {/* ---------- info ---------- */}
          {currentStep.type === 'info' && (
            <div className="operator-step-body">
              <pre className="operator-info-text">{currentStep.text}</pre>
              <button type="button" className="qms-primary-button" disabled={submitting} onClick={() => submit(true)}>
                {submitting ? 'PLEASE WAIT…' : 'ACKNOWLEDGE & CONTINUE'}
              </button>
            </div>
          )}

          {/* ---------- select ---------- */}
          {currentStep.type === 'select' && (
            <div className="operator-step-body">
              <div className="operator-select-options">
                {currentStep.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className="operator-select-option"
                    disabled={submitting}
                    onClick={() => submit(opt.value)}
                  >
                    {opt.label}
                    {opt.target != null && (
                      <span className="operator-select-target">
                        Target: {opt.target} {opt.unit}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ---------- load ---------- */}
          {currentStep.type === 'load' && (
            <div className="operator-step-body">
              <p className="operator-step-text">{currentStep.text}</p>
              <button type="button" className="qms-primary-button" disabled={submitting} onClick={() => submit(true)}>
                {submitting ? 'PLEASE WAIT…' : 'CONFIRM LOADED'}
              </button>
            </div>
          )}

          {/* ---------- set ---------- */}
          {currentStep.type === 'set' && (
            <form
              className="operator-step-body"
              onSubmit={(e) => {
                e.preventDefault();
                if (draftValue === '') return;
                submit(Number(draftValue));
              }}
            >
              <label className="operator-field-label">
                {currentStep.label} ({currentStep.unit})
              </label>
              <input
                type="number"
                step="0.1"
                value={draftValue === '' ? (inferredTarget ?? '') : draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                required
              />
              <button type="submit" className="qms-primary-button" disabled={submitting}>
                {submitting ? 'SETTING…' : 'SET / CONFIRM'}
              </button>
            </form>
          )}

          {/* ---------- start ---------- */}
          {currentStep.type === 'start' && (
            <div className="operator-step-body">
              <p className="operator-step-text">
                Machine parameters are set. Start the process to begin this stage.
              </p>
              <button type="button" className="qms-primary-button start-btn" disabled={submitting} onClick={() => submit(true)}>
                {submitting ? 'STARTING…' : '▶ START'}
              </button>
            </div>
          )}

          {/* ---------- monitor / confirm (live gauge) ---------- */}
          {(currentStep.type === 'monitor' || currentStep.type === 'confirm') && (
            <div className="operator-step-body">
              <div className={`operator-gauge ${!settled ? 'operator-gauge-live' : ''}`}>
                <span className="operator-gauge-label">{currentStep.label}</span>
                <span className="operator-gauge-value">
                  {liveValue} {currentStep.unit}
                </span>
                {!settled && <span className="operator-gauge-ticking">● reading…</span>}
              </div>

              {currentStep.type === 'confirm' && settled && (
                <>
                  <label className="operator-field-label">
                    {currentStep.label} — Enter actual value ({currentStep.unit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    placeholder={`e.g. ${liveValue}`}
                  />
                </>
              )}

              <button
                type="button"
                className="qms-primary-button"
                disabled={!settled || submitting}
                onClick={() => submit(Number(draftValue !== '' ? draftValue : liveValue))}
              >
                {submitting ? 'SUBMITTING…' : currentStep.type === 'confirm' ? 'CONFIRM READING' : 'ACKNOWLEDGE READING'}
              </button>
            </div>
          )}

          {/* ---------- totals ---------- */}
          {currentStep.type === 'totals' && (
            <form
              className="operator-step-body"
              onSubmit={(e) => {
                e.preventDefault();
                submit(totalsDraft);
              }}
            >
              {currentStep.fields.map((f) => (
                <div key={f.key} className="operator-totals-row">
                  <label className="operator-field-label">
                    {f.label} ({f.unit})
                  </label>
                  <input
                    type="number"
                    placeholder={f.target != null ? `e.g. ${f.target}` : ''}
                    value={totalsDraft[f.key] ?? ''}
                    onChange={(e) => setTotalsDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    required
                  />
                </div>
              ))}
              <button type="submit" className="qms-primary-button" disabled={submitting}>
                {submitting ? 'SUBMITTING…' : 'SUBMIT TOTALS'}
              </button>
            </form>
          )}

          {/* ---------- checklist ---------- */}
          {currentStep.type === 'checklist' && (
            <div className="operator-step-body">
              {currentStep.items.map((item) => (
                <div key={item.key} className="operator-checklist-row">
                  <span>{item.label}</span>
                  <div className="operator-checklist-toggle">
                    <button
                      type="button"
                      className={checklistDraft[item.key] === true ? 'toggle-pass active' : 'toggle-pass'}
                      onClick={() => setChecklistDraft((d) => ({ ...d, [item.key]: true }))}
                    >
                      PASS
                    </button>
                    <button
                      type="button"
                      className={checklistDraft[item.key] === false ? 'toggle-fail active' : 'toggle-fail'}
                      onClick={() => setChecklistDraft((d) => ({ ...d, [item.key]: false }))}
                    >
                      FAIL
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="qms-primary-button"
                disabled={submitting || currentStep.items.some((i) => checklistDraft[i.key] === undefined)}
                onClick={() => submit(checklistDraft)}
              >
                {submitting ? 'SUBMITTING…' : 'SUBMIT CHECKLIST'}
              </button>
            </div>
          )}

          {/* ---------- record ---------- */}
          {currentStep.type === 'record' && (
            <div className="operator-step-body">
              <p className="operator-step-text" style={{ marginBottom: 6, opacity: 0.75, fontSize: 11 }}>
                Review and confirm all recorded values for this stage before closing.
              </p>
              <div className="operator-record-summary">
                {Object.entries(operationData)
                  .filter(([, v]) => typeof v !== 'object')
                  .map(([k, v]) => {
                    const display = v === true ? '✓ Yes' : v === false ? '✗ No' : String(v);
                    return (
                      <div key={k} className="operator-record-row">
                        <span>{formatKey(k)}</span>
                        <strong style={v === false ? { color: '#ef4444' } : {}}>{display}</strong>
                      </div>
                    );
                  })}
              </div>
              <button type="button" className="qms-primary-button" disabled={submitting} onClick={() => submit(true)}>
                {submitting ? 'RECORDING…' : 'CONFIRM RECORD'}
              </button>
            </div>
          )}

          {/* ---------- complete ---------- */}
          {currentStep.type === 'complete' && (
            <div className="operator-step-body">
              <p className="operator-step-text">
                This is the final step. Completing it hands the material to the next role in the pipeline.
              </p>
              <button type="button" className="qms-primary-button complete-btn" disabled={submitting} onClick={() => submit(true)}>
                {submitting ? 'COMPLETING…' : '✓ ' + currentStep.label.toUpperCase()}
              </button>
            </div>
          )}
        </div>
      )}

      {currentStep && currentStep.context && (
        <StepContext context={currentStep.context} stepLabel={currentStep.label} />
      )}

      <StepLog stepLog={roleDetail.stepLog} />
    </div>
  );
}

function PanelHeader({ roleKey, title, onBack, showSkip }) {
  const { skipVmRole, batchState } = useSimStore();
  const [skipping, setSkipping] = useState(false);

  const handleSkip = async () => {
    if (!batchState?.batch?.id) return;
    setSkipping(true);
    try {
      await skipVmRole(roleKey);
    } catch (err) {
      alert("Skip failed: " + err.message);
    } finally {
      setSkipping(false);
    }
  };

  return (
    <div className="operator-panel-header" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <button type="button" className="operator-back-btn" onClick={onBack}>
        ← All Roles
      </button>
      <span className="operator-panel-icon">{ICONS[roleKey] || '🛠️'}</span>
      <h2>{title}</h2>
      {showSkip && (
        <button
          type="button"
          className="qms-primary-button"
          style={{
            marginLeft: 'auto',
            background: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
            borderColor: '#ea580c',
            boxShadow: '0 4px 10px rgba(217, 119, 6, 0.35)',
            fontSize: '11px',
            padding: '6px 14px',
            borderRadius: '12px'
          }}
          disabled={skipping}
          onClick={handleSkip}
        >
          ⚡ {skipping ? 'SKIPPING...' : 'DEMO SKIP'}
        </button>
      )}
    </div>
  );
}

function StepProgress({ steps, currentIndex, done }) {
  return (
    <div className="operator-progress-rail">
      {steps.map((s, i) => (
        <div
          key={s.key}
          className={`operator-progress-dot ${
            i < currentIndex || done ? 'op-complete' : i === currentIndex ? 'op-active' : ''
          }`}
          title={s.label}
        />
      ))}
    </div>
  );
}

function StepLog({ stepLog }) {
  if (!stepLog || stepLog.length === 0) return null;
  return (
    <details className="operator-step-log">
      <summary>Step history ({stepLog.length})</summary>
      <ul>
        {stepLog.map((entry) => (
          <li key={entry.id} className={entry.flagged ? 'log-flagged' : ''}>
            <span className="log-time">{entry.created_at}</span>
            <span className="log-label">{entry.label}</span>
            <span className="log-value">{entry.value_json}</span>
            {!!entry.flagged && <span className="log-flag">⚠ OUT OF TOLERANCE</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

function StepContext({ context, stepLabel }) {
  const [open, setOpen] = useState(true);

  if (!context) return null;

  const items = [
    { icon: '📋', label: 'What to do here', value: context.what },
    { icon: '🏭', label: 'Industry practice', value: context.industry },
    { icon: '📤', label: 'Output of this step', value: context.output },
    { icon: '🎓', label: 'What you learn', value: context.learning },
  ];

  return (
    <div className="step-context-panel">
      <button
        type="button"
        className="step-context-toggle"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="step-context-toggle-icon">💡</span>
        <span>Understanding this step{open ? '' : ` — ${stepLabel}`}</span>
        <span className="step-context-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="step-context-body">
          {items.map((item) => (
            <div key={item.label} className="step-context-item">
              <div className="step-context-item-head">
                <span className="step-context-icon">{item.icon}</span>
                <strong>{item.label}</strong>
              </div>
              <p>{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

