import { useEffect, useState } from 'react';
import { useSimStore } from '../../store';
import QMSPanelHeader from './QMSPanelHeader';

// =====================================================================
// QMS ROLE 14 — CAPA Coordinator
// =====================================================================
// Owns the corrective/preventive action plan end-to-end: create it from
// the Investigation Officer's proposed actions, assign & track action
// items, collect evidence, send it to VM for implementation, then
// verify effectiveness once VM submits the corrected reading.
// =====================================================================

export default function CAPACoordinatorPanel() {
  const {
    qmsRoleDetail,
    qmsRoleDetailLoading,
    closeQmsRole,
    batchState,
    createCAPA,
    capaToggleAction,
    capaAddEvidence,
    capaSendForReview,
    verifyCapa,
  } = useSimStore();

  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [actionItemsDraft, setActionItemsDraft] = useState(['']);
  const [creating, setCreating] = useState(false);

  const [evidenceDraft, setEvidenceDraft] = useState('');
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [sending, setSending] = useState(false);

  const [expected, setExpected] = useState('');
  const [tolerance, setTolerance] = useState('1');
  const [verifying, setVerifying] = useState(false);

  const [formError, setFormError] = useState('');

  const deviation = qmsRoleDetail?.deviation;
  const activeEvent = qmsRoleDetail?.activeEvent;
  const capa = qmsRoleDetail?.capa;

  // Pre-fill the creation form from the Investigation Officer's
  // proposed actions the first time this panel opens with a deviation.
  useEffect(() => {
    if (deviation && !capa) {
      setCorrectiveAction(deviation.proposed_corrective || '');
      setPreventiveAction(deviation.proposed_preventive || '');
      setActionItemsDraft([
        deviation.proposed_corrective || '',
        deviation.proposed_preventive || '',
      ].filter(Boolean));
    }
    if (activeEvent) {
      setExpected(String(activeEvent.expected ?? ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviation?.id, capa?.id]);

  if (qmsRoleDetailLoading || !qmsRoleDetail) {
    return (
      <div className="operator-panel">
        <QMSPanelHeader icon="capa" title="CAPA Coordinator" onBack={closeQmsRole} />
        <p className="operator-loading">Loading…</p>
      </div>
    );
  }

  if (qmsRoleDetail.status === 'locked') {
    return (
      <div className="operator-panel">
        <QMSPanelHeader icon="capa" title="CAPA Coordinator" onBack={closeQmsRole} />
        <div className="operator-locked">
          <span className="operator-locked-icon">🔒</span>
          <h3>This role is locked</h3>
          <p>{qmsRoleDetail.note || 'Waiting on the Investigation Officer\u2019s root cause.'}</p>
        </div>
      </div>
    );
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setFormError('');
    try {
      await createCAPA(
        deviation.id,
        batchState.batch.id,
        correctiveAction,
        preventiveAction,
        actionItemsDraft
      );
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSendForReview = async () => {
    setSending(true);
    setFormError('');
    try {
      await capaSendForReview(capa.id);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleSaveEvidence = async () => {
    setSavingEvidence(true);
    setFormError('');
    try {
      await capaAddEvidence(capa.id, evidenceDraft || capa.evidence || '');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSavingEvidence(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setFormError('');
    try {
      await verifyCapa(
        capa.id,
        batchState.batch.id,
        capa.fix_parameter,
        Number(expected),
        capa.fix_before,
        capa.fix_after,
        Number(tolerance)
      );
    } catch (err) {
      setFormError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="operator-panel">
      <QMSPanelHeader icon="capa" title="CAPA Coordinator" onBack={closeQmsRole} />
      <p className="operator-summary">
        Create, track, and verify the corrective/preventive action plan for this deviation.
      </p>

      {formError && <div className="operator-step-error">{formError}</div>}

      {/* ---------------- Step 1: create CAPA ---------------- */}
      {!capa && (
        <form className="qms-form-card" onSubmit={handleCreate}>
          <h3>Create CAPA</h3>

          <div className="qms-form-group">
            <label htmlFor="corrective">Corrective Action</label>
            <textarea
              id="corrective"
              rows={2}
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              required
            />
          </div>

          <div className="qms-form-group">
            <label htmlFor="preventive">Preventive Action</label>
            <textarea
              id="preventive"
              rows={2}
              value={preventiveAction}
              onChange={(e) => setPreventiveAction(e.target.value)}
              required
            />
          </div>

          <div className="qms-form-group">
            <label>Action Items to Track</label>
            {actionItemsDraft.map((item, i) => (
              <input
                key={i}
                type="text"
                value={item}
                placeholder={`Action item ${i + 1}`}
                onChange={(e) => {
                  const next = [...actionItemsDraft];
                  next[i] = e.target.value;
                  setActionItemsDraft(next);
                }}
                style={{ marginBottom: '8px' }}
              />
            ))}
            <button
              type="button"
              className="operator-back-btn"
              onClick={() => setActionItemsDraft((d) => [...d, ''])}
            >
              + Add action item
            </button>
          </div>

          <button type="submit" className="qms-primary-button" disabled={creating}>
            {creating ? 'CREATING…' : 'CREATE CAPA'}
          </button>
        </form>
      )}

      {/* ---------------- Step 2: track / evidence / send ---------------- */}
      {capa && !capa.sent_for_review && (
        <div className="qms-workflow-card">
          <h3>CAPA #{capa.id} — Tracking</h3>
          <div className="qms-info-item"><span>Corrective Action</span><strong>{capa.corrective_action}</strong></div>
          <div className="qms-info-item"><span>Preventive Action</span><strong>{capa.preventive_action}</strong></div>

          <div className="qms-form-group">
            <label>Action Items</label>
            {capa.actionItems?.map((item, i) => (
              <div key={i} className="operator-checklist-row">
                <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                <button
                  type="button"
                  className={item.done ? 'toggle-pass active' : 'toggle-pass'}
                  onClick={() => capaToggleAction(capa.id, i)}
                >
                  {item.done ? 'DONE' : 'MARK DONE'}
                </button>
              </div>
            ))}
          </div>

          <div className="qms-form-group">
            <label htmlFor="evidence">Evidence</label>
            <textarea
              id="evidence"
              rows={3}
              value={evidenceDraft || capa.evidence || ''}
              onChange={(e) => setEvidenceDraft(e.target.value)}
              placeholder="Repairs made, checks performed, references to supporting records…"
            />
            <button type="button" className="operator-back-btn" disabled={savingEvidence} onClick={handleSaveEvidence}>
              {savingEvidence ? 'SAVING…' : 'SAVE EVIDENCE'}
            </button>
          </div>

          <button type="button" className="qms-primary-button" disabled={sending} onClick={handleSendForReview}>
            {sending ? 'SENDING…' : 'SEND TO VM FOR CORRECTIVE ACTION'}
          </button>
        </div>
      )}

      {/* ---------------- Step 3: waiting on VM ---------------- */}
      {capa && capa.sent_for_review && capa.status === 'open' && (
        <div className="vm-fix-waiting">
          ⏳ Sent to VM for corrective action. Waiting for the operator to apply the fix and submit
          a corrected reading.
        </div>
      )}

      {/* ---------------- Step 4: verify effectiveness ---------------- */}
      {capa && capa.status === 'pending_verification' && (
        <form className="qms-form-card" onSubmit={handleVerify}>
          <h3>Verify Effectiveness</h3>
          <div className="qms-verification-readings">
            <div><span>Parameter</span><strong>{capa.fix_parameter}</strong></div>
            <div><span>Before</span><strong>{capa.fix_before}</strong></div>
            <div><span>After (VM submitted)</span><strong>{capa.fix_after}</strong></div>
          </div>
          <div className="qms-form-group">
            <label htmlFor="expected">Expected Value</label>
            <input id="expected" type="number" step="0.1" value={expected} onChange={(e) => setExpected(e.target.value)} required />
          </div>
          <div className="qms-form-group">
            <label htmlFor="tolerance">Tolerance (±)</label>
            <input id="tolerance" type="number" step="0.1" value={tolerance} onChange={(e) => setTolerance(e.target.value)} required />
          </div>
          <button type="submit" className="qms-primary-button" disabled={verifying}>
            {verifying ? 'VERIFYING…' : 'VERIFY EFFECTIVENESS'}
          </button>
        </form>
      )}

      {capa && capa.status === 'failed' && (
        <div className="qms-status">
          <div className="qms-status-message alarm-actual">
            ❌ Verification FAILED — the corrected reading is still outside tolerance.
          </div>
          <button type="button" className="qms-primary-button" disabled={sending} onClick={handleSendForReview}>
            {sending ? 'NOTIFYING…' : 'NOTIFY VM TO RESUBMIT'}
          </button>
        </div>
      )}

      {capa && capa.status === 'verified' && (
        <div className="qms-workflow-card">
          <h3>✅ CAPA Verified</h3>
          <p>Effectiveness confirmed. QA Reviewer role has unlocked for final review.</p>
        </div>
      )}
    </div>
  );
}
