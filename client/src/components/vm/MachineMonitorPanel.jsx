import { useEffect, useState } from 'react';
import { useSimStore } from '../../store';

export default function MachineMonitorPanel() {
  const { monitorData, roleDetailLoading, refreshMonitor, addMonitorNote, closeRole, batchState } =
    useSimStore();

  const [noteDraft, setNoteDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => refreshMonitor(), 4000);
    return () => clearInterval(interval);
  }, [refreshMonitor]);

  if (roleDetailLoading || !monitorData) {
    return (
      <div className="operator-panel">
        <div className="operator-panel-header">
          <button type="button" className="operator-back-btn" onClick={closeRole}>
            ← All Roles
          </button>
          <span className="operator-panel-icon">📡</span>
          <h2>Machine Monitor / Support</h2>
        </div>
        <p className="operator-loading">Loading monitor dashboard…</p>
      </div>
    );
  }

  const { machine, stageRoles, events, unacknowledged, notes } = monitorData;

  const handleSupportNote = async (eventId, type) => {
    if (!noteDraft.trim()) return;
    setSubmitting(true);
    try {
      await addMonitorNote(eventId, noteDraft.trim(), type);
      setNoteDraft('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="operator-panel monitor-panel">
      <div className="operator-panel-header">
        <button type="button" className="operator-back-btn" onClick={closeRole}>
          ← All Roles
        </button>
        <span className="operator-panel-icon">📡</span>
        <h2>Machine Monitor / Support</h2>
      </div>

      <p className="operator-summary">
        Wide-view oversight of every VM machine, live parameters, alarms and operator responses.
        You do not control the machines directly — the assigned operator has primary control. You
        support, observe, and escalate.
      </p>

      <div className="monitor-machine-strip">
        <div className={`monitor-machine-badge machine-${machine?.status}`}>
          Machine: {machine?.status ?? 'idle'}
        </div>
        <div className="monitor-machine-badge">Batch #{batchState?.batch?.id}</div>
        <div className="monitor-machine-badge">
          Unacknowledged alarms: {unacknowledged?.length ?? 0}
        </div>
      </div>

      <h3 className="monitor-section-title">All 9 Process Roles</h3>
      <div className="monitor-role-list">
        {stageRoles.map((sr) => (
          <div key={sr.stageId} className={`monitor-role-row status-${sr.status}`}>
            <span className="monitor-role-name">{sr.roleTitle}</span>
            <span className={`monitor-role-status status-${sr.status}`}>{sr.status}</span>
            {sr.totalSteps != null && (
              <span className="monitor-role-progress">
                {sr.currentStep}/{sr.totalSteps} steps
              </span>
            )}
          </div>
        ))}
      </div>

      <h3 className="monitor-section-title">Alarms / Events</h3>
      {events.length === 0 && <p className="monitor-empty">No events yet for this batch.</p>}
      <div className="monitor-event-list">
        {events.map((ev) => (
          <div key={ev.id} className={`monitor-event-card ${!ev.acknowledged ? 'event-open' : 'event-ack'}`}>
            <div className="monitor-event-head">
              <span>{ev.acknowledged ? '✅' : '🚨'}</span>
              <div>
                <strong>{ev.stage_name} — {ev.parameter}</strong>
                <span className="monitor-event-sub">
                  Expected {ev.expected} · Actual {ev.actual} · Source: {ev.source}
                  {ev.escalated ? ' · ESCALATED' : ''}
                </span>
              </div>
            </div>
            <p className="monitor-event-message">{ev.message}</p>

            {!ev.acknowledged && (
              <div className="monitor-event-actions">
                <input
                  type="text"
                  placeholder="Support note (e.g. troubleshooting suggestion)..."
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                />
                <button
                  type="button"
                  disabled={submitting || !noteDraft.trim()}
                  onClick={() => handleSupportNote(ev.id, 'support')}
                >
                  ADD SUPPORT NOTE
                </button>
                <button
                  type="button"
                  className="escalate-btn"
                  disabled={submitting || !noteDraft.trim()}
                  onClick={() => handleSupportNote(ev.id, 'escalation')}
                >
                  ESCALATE
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {notes?.length > 0 && (
        <>
          <h3 className="monitor-section-title">Monitor Log</h3>
          <ul className="monitor-notes-list">
            {notes.map((n) => (
              <li key={n.id} className={n.type === 'escalation' ? 'note-escalation' : ''}>
                <span className="log-time">{n.created_at}</span>
                <span className={`note-type-badge ${n.type}`}>{n.type}</span>
                <span>{n.note}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
