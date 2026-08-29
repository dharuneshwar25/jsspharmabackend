import { useState } from 'react';
import { useSimStore } from '../../store';
import QMSPanelHeader from './QMSPanelHeader';

// =====================================================================
// QMS ROLE 15 — QA Reviewer
// =====================================================================
// Final quality oversight. Reviews the entire chain — Event, Impact
// Assessment, Deviation, Investigation, Root Cause, CAPA, Verification
// — and either APPROVES (releases the batch) or RETURNS (sends the
// case back for further investigation/CAPA).
// =====================================================================

export default function QAReviewerPanel() {
  const { qmsRoleDetail, qmsRoleDetailLoading, closeQmsRole, submitQaReview } = useSimStore();

  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (qmsRoleDetailLoading || !qmsRoleDetail) {
    return (
      <div className="operator-panel">
        <QMSPanelHeader icon="qa" title="QA Reviewer" onBack={closeQmsRole} />
        <p className="operator-loading">Loading…</p>
      </div>
    );
  }

  if (qmsRoleDetail.status === 'locked') {
    return (
      <div className="operator-panel">
        <QMSPanelHeader icon="qa" title="QA Reviewer" onBack={closeQmsRole} />
        <div className="operator-locked">
          <span className="operator-locked-icon">🔒</span>
          <h3>This role is locked</h3>
          <p>{qmsRoleDetail.note || 'Waiting on CAPA effectiveness verification.'}</p>
        </div>
      </div>
    );
  }

  const { activeEvent, deviation, capa, qaReview } = qmsRoleDetail;
  const decided = qaReview && qaReview.decision === 'approved';

  const handleDecision = async (decision) => {
    setSubmitting(true);
    setFormError('');
    try {
      await submitQaReview(capa.id, decision, comments);
      setComments('');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="operator-panel">
      <QMSPanelHeader icon="qa" title="QA Reviewer" onBack={closeQmsRole} />
      <p className="operator-summary">
        Review the full quality chain below and decide whether it is satisfactory.
      </p>

      <div className="qms-workflow">
        <ReviewStep title="Event" body={activeEvent?.message} />
        <ReviewStep
          title="Impact Assessment"
          body={`Severity: ${deviation?.severity} · Impact: ${deviation?.product_impact} · ${deviation?.significant ? 'SIGNIFICANT' : 'Not significant'}`}
        />
        <ReviewStep title="Deviation" body={deviation?.description} />
        <ReviewStep title="Investigation / Root Cause" body={deviation?.root_cause} />
        <ReviewStep
          title="CAPA"
          body={`Corrective: ${capa?.corrective_action} · Preventive: ${capa?.preventive_action}`}
        />
        <ReviewStep
          title="Verification"
          body={capa?.status === 'verified' ? `PASSED — ${capa.fix_parameter}: ${capa.fix_before} → ${capa.fix_after}` : capa?.status}
        />
      </div>

      {formError && <div className="operator-step-error">{formError}</div>}

      {!decided ? (
        <div className="qms-form-card">
          <div className="qms-form-group">
            <label htmlFor="qa-comments">Review Comments</label>
            <textarea
              id="qa-comments"
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Overall assessment of the chain — required if returning."
            />
          </div>
          <div className="alarm-actions">
            <button type="button" className="qms-primary-button" disabled={submitting} onClick={() => handleDecision('approved')}>
              {submitting ? '…' : '✓ APPROVE & RELEASE BATCH'}
            </button>
            <button type="button" disabled={submitting} onClick={() => handleDecision('returned')}>
              {submitting ? '…' : '↩ RETURN FOR REWORK'}
            </button>
          </div>
        </div>
      ) : (
        <div className="qms-release-card">
          <span className="qms-release-icon">✅</span>
          <h3>Batch Released</h3>
          <p>QA review approved. The batch continues in the pipeline.</p>
        </div>
      )}
    </div>
  );
}

function ReviewStep({ title, body }) {
  return (
    <div className="qms-workflow-card">
      <h3>{title}</h3>
      <p>{body || '—'}</p>
    </div>
  );
}
