import { useState, useMemo } from 'react';
import { useSimStore } from '../../store';
import QMSPanelHeader from './QMSPanelHeader';

// =====================================================================
// QMS ROLE 12 — SME / Quality Reviewer
// =====================================================================
// Investigates the quality impact of an event the Monitor assigned and
// produces the Impact Assessment — including the significance decision
// that gates the Investigation Officer.
// =====================================================================

const EVENT_QUIZ_OPTIONS = {
  actualQty: [
    { text: "Option A: Calibrate scale load cells and re-weigh raw materials (Correct)", score: 10, value: "A", note: "Correct GMP Action: Scale calibration and re-weighing is the standard compliance corrective path." },
    { text: "Option B: Override batch records and proceed with the current weight", score: 0, value: "B", note: "Critical Violation: Bypassing limit checks violates strict regulatory guidelines and can fail FDA audits." },
    { text: "Option C: Blend this deficient batch with a higher-potency batch later", score: 1, value: "C", note: "Compliance Failure: Ad-hoc blending to average out potency is a critical data integrity violation." },
    { text: "Option D: Adjust the target values in the master recipe retrospectively", score: 2, value: "D", note: "GMP Violation: Changing master recipe values without change control is illegal in pharmaceutical manufacturing." }
  ],
  temperature: [
    { text: "Option A: Pause milling, inspect water-cooling jacket flow, check screen mesh (Correct)", score: 10, value: "A", note: "Correct GMP Action: Cooling system verification is the correct engineering check for friction heat." },
    { text: "Option B: Increase speed to run the mill faster and finish the stage quickly", score: 2, value: "B", note: "Friction Risk: Increasing speed generates more friction heat, increasing thermal degradation risk." },
    { text: "Option C: Bypass temperature sensor alerts and disable the alarm line", score: 0, value: "C", note: "Severe Breach: Disabling alarms leads to hidden quality failures and is a severe compliance breach." },
    { text: "Option D: Stop mill and pour chilled water directly into the milling chamber", score: 1, value: "D", note: "Contamination Risk: Pouring water directly into dry milled powder causes batch contamination and clogging." }
  ],
  actualWeight: [
    { text: "Option A: Pause press, perform manual tablet weight verification check, inspect feed frame scrape-off blade. (Correct)", score: 10, value: "A", note: "Correct GMP Action: Manual weight sampling and scraper blade inspection is the standard corrective verification path for weight deviations." },
    { text: "Option B: Increase compaction force to squeeze tablets into a thinner profile and keep running.", score: 2, value: "B", note: "Incorrect Action: Squeezing tablets into a thinner profile increases hardness but does not change the physical tablet mass/dosage weight." },
    { text: "Option C: Proceed with compression and let the downstream sorting scale reject light tablets.", score: 1, value: "C", note: "High Waste Risk: Proceeding generates massive product scrap and bypasses key in-process weight checks." },
    { text: "Option D: Manually log the target weight of 500mg regardless of what the scale reads.", score: 0, value: "D", note: "Data Integrity Breach: Fabricating records violates critical cGMP and ALCOA+ data integrity rules." }
  ],
  defectRate: [
    { text: "Option A: Isolate batch lot, review previous Coating/Compression telemetry records, perform 100% inspection swap. (Correct)", score: 10, value: "A", note: "Correct GMP Action: Lot isolation, process log review, and 100% sorting is the standard root-cause investigation procedure for defect rate spikes." },
    { text: "Option B: Lower inspection sensitivity to ignore cosmetic defects and reduce rejections.", score: 0, value: "B", note: "Severe Violation: Lowering inspection thresholds compromises patient safety and violates regulatory specifications." },
    { text: "Option C: Discharge the batch into the packaging hopper and run it anyway.", score: 1, value: "C", note: "Severe Compliance Breach: Proceeding with a failing defect rate is a direct GMP violation and will prompt regulatory audits." },
    { text: "Option D: Discard the rejected tablets and log the reject count as zero to pass.", score: 2, value: "D", note: "Falsification: Falsifying reject yields violates material balance regulations and is a high-risk compliance violation." }
  ],
  generic: [
    { text: "Option A: Report deviation, check machine calibration, run diagnostics (Correct)", score: 10, value: "A", note: "Correct GMP Action: Standard diagnostic investigation is the primary compliance route." },
    { text: "Option B: Resume machine operations immediately and ignore alerts", score: 0, value: "B", note: "High Risk: Ignoring active process alarms can damage equipment and ruin product quality." },
    { text: "Option C: Manually edit database values to clear the error status", score: 1, value: "C", note: "Data Integrity Violation: Direct database edits violate data integrity regulations (ALCOA+)." },
    { text: "Option D: Terminate the batch and discard all raw materials without logging", score: 2, value: "D", note: "Compliance Failure: Discarding materials without documentation violates material balance controls." }
  ]
};

export default function SMEPanel() {
  const { qmsRoleDetail, qmsRoleDetailLoading, closeQmsRole, submitImpactAssessment, batchState, recordQuizScore, qmsScores } =
    useSimStore();

  const [severity, setSeverity] = useState('minor');
  const [productImpact, setProductImpact] = useState('no_impact');
  const [significant, setSignificant] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { activeEvent, deviation } = qmsRoleDetail || {};
  const optionsKey = activeEvent && EVENT_QUIZ_OPTIONS[activeEvent.parameter] ? activeEvent.parameter : 'generic';
  const quizOptions = EVENT_QUIZ_OPTIONS[optionsKey];
  const [selectedOption, setSelectedOption] = useState('');

  if (qmsRoleDetailLoading || !qmsRoleDetail) {
    return (
      <div className="operator-panel">
        <QMSPanelHeader icon="sme" title="SME / Quality Reviewer" onBack={closeQmsRole} />
        <p className="operator-loading">Loading…</p>
      </div>
    );
  }

  if (qmsRoleDetail.status === 'locked') {
    return (
      <div className="operator-panel">
        <QMSPanelHeader icon="sme" title="SME / Quality Reviewer" onBack={closeQmsRole} />
        <div className="operator-locked">
          <span className="operator-locked-icon">🔒</span>
          <h3>This role is locked</h3>
          <p>{qmsRoleDetail.note || 'Waiting on the QMS Monitor to triage the event.'}</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (significant === null) {
      setFormError('Select whether this event is quality-significant before submitting.');
      return;
    }
    if (!selectedOption) {
      setFormError('Select one of the assessment options before submitting.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const optObj = quizOptions.find(o => o.value === selectedOption);
      // Record the score
      recordQuizScore(activeEvent.id, selectedOption, optObj.score, 10);
      
      const fullNotes = `${optObj.text} | Assessment Notes: ${optObj.note}`;

      await submitImpactAssessment(
        activeEvent.id,
        batchState.batch.id,
        severity,
        productImpact,
        significant,
        fullNotes
      );
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const alreadyAssessed = deviation && (deviation.significant === 0 || deviation.significant === 1);
  const recordedScore = activeEvent ? qmsScores[activeEvent.id] : null;

  return (
    <div className="operator-panel">
      <QMSPanelHeader icon="sme" title="SME / Quality Reviewer" onBack={closeQmsRole} />
      <p className="operator-summary">
        Examine the current batch, machine readings and history, then determine whether this
        event is quality-significant.
      </p>

      {activeEvent && (
        <div className="qms-event-card">
          <div className="qms-event-header">
            <span className="qms-event-icon">🔬</span>
            <div>
              <h3>Event #{activeEvent.id}</h3>
              <span className="alarm-stage" style={{ color: 'var(--danger-light)', fontWeight: 'bold' }}>
                Component/Stage: {activeEvent.stage_name}
              </span>
            </div>
          </div>
          <div className="qms-event-message">{activeEvent.message}</div>
          <div className="qms-event-details">
            <div className="qms-info-item"><span>Component</span><strong>{activeEvent.stage_name}</strong></div>
            <div className="qms-info-item"><span>Parameter</span><strong>{activeEvent.parameter}</strong></div>
            <div className="qms-info-item"><span>Expected</span><strong>{activeEvent.expected}</strong></div>
            <div className="qms-info-item"><span>Actual</span><strong className="alarm-actual">{activeEvent.actual}</strong></div>
          </div>
        </div>
      )}

      {!alreadyAssessed ? (
        <form className="qms-form-card" onSubmit={handleSubmit}>
          <h3>Impact Assessment & Quiz</h3>

          <div className="qms-form-group">
            <label htmlFor="severity">Severity</label>
            <select id="severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="qms-form-group">
            <label htmlFor="productImpact">Potential Product Impact</label>
            <select id="productImpact" value={productImpact} onChange={(e) => setProductImpact(e.target.value)}>
              <option value="no_impact">No Impact</option>
              <option value="potential_impact">Potential Impact</option>
              <option value="confirmed_impact">Confirmed Impact</option>
            </select>
          </div>

          <div className="qms-form-group">
            <label>Select Corrective Action (Option Quiz)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {quizOptions.map((opt) => {
                const isSelected = selectedOption === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      setSelectedOption(opt.value);
                      if (opt.value === 'A') {
                        setSignificant(true);
                      } else {
                        setSignificant(false);
                      }
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'var(--bg-input)',
                      border: `1px solid ${isSelected ? 'var(--teal)' : 'var(--glass-border-subtle)'}`,
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="radio"
                        checked={isSelected}
                        readOnly
                        style={{ accentColor: 'var(--teal)' }}
                      />
                      <strong style={{ fontSize: 12, color: isSelected ? 'var(--teal-light)' : 'var(--text-primary)' }}>
                        {opt.text}
                      </strong>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 22 }}>
                      {opt.note}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="qms-form-group" style={{ marginTop: 10 }}>
            <label>Is this event quality-significant?</label>
            <div className="operator-checklist-toggle">
              <button
                type="button"
                className={significant === true ? 'toggle-pass active' : 'toggle-pass'}
                onClick={() => setSignificant(true)}
              >
                SIGNIFICANT
              </button>
              <button
                type="button"
                className={significant === false ? 'toggle-fail active' : 'toggle-fail'}
                onClick={() => setSignificant(false)}
              >
                NOT SIGNIFICANT
              </button>
            </div>
          </div>

          {formError && <div className="operator-step-error">{formError}</div>}

          <button type="submit" className="qms-primary-button" disabled={submitting}>
            {submitting ? 'SUBMITTING…' : 'SUBMIT ASSESSMENT & QUIZ'}
          </button>
        </form>
      ) : (
        <div className="qms-workflow-card">
          <h3>Impact Assessment Complete</h3>
          {recordedScore && (
            <div className="status-badge status-badge--info" style={{ display: 'inline-flex', marginBottom: 12, padding: '6px 12px', fontSize: 11 }}>
              🎯 Quiz Score: {recordedScore.score} / {recordedScore.maxScore} points ({recordedScore.selectedOptionValue === 'A' ? 'Correct' : 'Incorrect'})
            </div>
          )}
          <div className="qms-info-item"><span>Severity</span><strong>{deviation.severity}</strong></div>
          <div className="qms-info-item"><span>Product Impact</span><strong>{deviation.product_impact}</strong></div>
          <div className="qms-info-item">
            <span>Significance</span>
            <strong className={deviation.significant ? 'alarm-actual' : ''}>
              {deviation.significant ? 'SIGNIFICANT — Deviation raised' : 'NOT SIGNIFICANT — closed'}
            </strong>
          </div>
          <div className="qms-info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <span>Assessment & Answers Log</span>
            <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 6, width: '100%' }}>
              {deviation.notes}
            </p>
          </div>
          {!!deviation.significant && (
            <p className="qms-next-action">
              The batch is now on QUALITY HOLD. Investigation Officer role has unlocked.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
