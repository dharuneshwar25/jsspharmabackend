import { useState } from 'react';
import { useSimStore } from '../../store';
import QMSPanelHeader from './QMSPanelHeader';

// =====================================================================
// QMS ROLE 11 — QMS Monitor
// =====================================================================
// First point of contact for every quality event. Watches all active
// events and, when a new one fires, reviews it and assigns it to the
// SME — this is what unlocks the SME's dedicated panel.
// =====================================================================

export default function QMSMonitorPanel() {
  const { qmsRoleDetail, qmsRoleDetailLoading, closeQmsRole, qmsMonitorReview } = useSimStore();

  const [note, setNote] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [formError, setFormError] = useState('');

  if (qmsRoleDetailLoading || !qmsRoleDetail) {
    return (
      <div className="operator-panel">
        <QMSPanelHeader icon="monitor" title="QMS Monitor" onBack={closeQmsRole} />
        <p className="operator-loading">Loading…</p>
      </div>
    );
  }

  const overview = qmsRoleDetail.monitorOverview;
  const activeEvent = overview?.activeEvent;
  const needsTriage = activeEvent && !activeEvent.reviewed_by_monitor;

  const handleAssign = async () => {
    setAssigning(true);
    setFormError('');
    try {
      await qmsMonitorReview(activeEvent.id, note || 'Routine assignment to SME / Quality Reviewer');
      setNote('');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="operator-panel">
      <QMSPanelHeader icon="monitor" title="QMS Monitor" onBack={closeQmsRole} />
      <p className="operator-summary">
        First point of contact for every quality event — reviews new alarms and assigns the
        appropriate quality role.
      </p>

      {/* ---------------- New event needing triage ---------------- */}
      {needsTriage && (
        <div className="qms-event-card">
          <div className="qms-event-header">
            <span className="qms-event-icon">🚨</span>
            <div>
              <h3>NEW QUALITY EVENT</h3>
              <span className="alarm-stage">{activeEvent.stage_name || 'Unknown Stage'}</span>
            </div>
          </div>

          <div className="qms-event-message">{activeEvent.message}</div>

          <div className="qms-event-details">
            <div className="qms-info-item"><span>Batch</span><strong>#{overview.batch.id}</strong></div>
            <div className="qms-info-item"><span>Machine</span><strong>{activeEvent.stage_name}</strong></div>
            <div className="qms-info-item"><span>Parameter</span><strong>{activeEvent.parameter}</strong></div>
            <div className="qms-info-item"><span>Expected</span><strong>{activeEvent.expected}</strong></div>
            <div className="qms-info-item"><span>Actual</span><strong className="alarm-actual">{activeEvent.actual}</strong></div>
          </div>

          {formError && <div className="operator-step-error">{formError}</div>}

          <div className="qms-form-card">
            <div className="qms-form-group">
              <label htmlFor="assign-note">Assignment note (optional)</label>
              <textarea
                id="assign-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Milling temperature breach — route to SME for impact assessment."
              />
            </div>
            <button type="button" className="qms-primary-button" disabled={assigning} onClick={handleAssign}>
              {assigning ? 'ASSIGNING…' : 'REVIEW & ASSIGN TO SME'}
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Event already triaged ---------------- */}
      {activeEvent && !needsTriage && (
        <div className="qms-workflow-card">
          <h3>Event #{activeEvent.id} — Assigned</h3>
          <p>
            This event has been reviewed and routed to <strong>SME / Quality Reviewer</strong> for
            impact assessment. Track its progress on the QMS role grid.
          </p>
        </div>
      )}

      {!activeEvent && (
        <div className="qms-empty-state">
          <span className="qms-empty-icon">✅</span>
          <p>No active quality event. All batches are running within limits.</p>
        </div>
      )}

      {/* ---------------- Standing duties ---------------- */}
      <div className="qms-workflow-card">
        <h3>Standing Duties (while monitoring)</h3>
        <ul className="qms-duties-list">
          {overview.standingDuties.map((duty, i) => (
            <li key={i}>{duty}</li>
          ))}
        </ul>
      </div>

      {/* ---------------- Recent events log ---------------- */}
      {overview.events?.length > 0 && (
        <details className="operator-step-log">
          <summary>Event history ({overview.events.length})</summary>
          <ul>
            {overview.events.map((e) => (
              <li key={e.id} className={!e.acknowledged ? 'log-flagged' : ''}>
                <span className="log-time">{e.created_at}</span>
                <span className="log-label">{e.stage_name} — {e.parameter}</span>
                <span className="log-value">{e.actual} (expected {e.expected})</span>
                {!!e.reviewed_by_monitor && <span className="qms-status-badge status-completed">Triaged</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
