import { useEffect } from 'react';
import { useSimStore } from '../store';
import QMSRoleGrid from './qms/QMSRoleGrid';
import QMSMonitorPanel from './qms/QMSMonitorPanel';
import SMEPanel from './qms/SMEPanel';
import InvestigationOfficerPanel from './qms/InvestigationOfficerPanel';
import CAPACoordinatorPanel from './qms/CAPACoordinatorPanel';
import QAReviewerPanel from './qms/QAReviewerPanel';

// =====================================================================
// QMS PANEL — container for the 5-role QMS technical flow
// =====================================================================
// This is the ONLY QMS entry point. It never spawns a separate
// top-level panel: selecting a role swaps the content INSIDE this same
// panel between the 5-role grid and that role's dedicated panel —
// exactly mirroring how the VM panel handles its 10 roles.
// =====================================================================

const ROLE_PANELS = {
  qms_monitor: QMSMonitorPanel,
  sme: SMEPanel,
  investigation_officer: InvestigationOfficerPanel,
  capa_coordinator: CAPACoordinatorPanel,
  qa_reviewer: QAReviewerPanel,
};

export default function QMSPanel() {
  const {
    batchState,
    qmsBatchRoles,
    selectedQmsRoleKey,
    openQmsRole,
    refreshQmsRoles,
    qmsRoleDetail,
    closeQmsRole,
    error,
  } = useSimStore();

  // Keep the 5-role grid's lock/status state fresh whenever this panel
  // becomes the active view or the batch changes underneath it.
  useEffect(() => {
    if (batchState?.batch?.id) {
      refreshQmsRoles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchState?.batch?.id]);

  if (!batchState) {
    return (
      <div className="placeholder">
        <h2>QMS Panel</h2>
        <p>Start a simulation to begin quality event monitoring.</p>
      </div>
    );
  }

  const ActiveRolePanel = selectedQmsRoleKey ? ROLE_PANELS[selectedQmsRoleKey] : null;

  return (
    <div className="qms-panel-inner">
      {!selectedQmsRoleKey && <QMSRoleGrid qmsBatchRoles={qmsBatchRoles} onOpenRole={openQmsRole} />}
      
      {selectedQmsRoleKey && !qmsRoleDetail && error && (
        <div className="operator-panel animate-fade-in" style={{ padding: 18 }}>
          <div className="operator-panel-header" style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, marginBottom: 16 }}>
            <button type="button" className="operator-back-btn" onClick={closeQmsRole} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
              ← All QMS Roles
            </button>
            <h2 className="type-section" style={{ fontSize: 16, margin: 0 }}>Error Loading Station</h2>
          </div>
          <div className="operator-locked" style={{ padding: '24px 16px', textAlign: 'center' }}>
            <span className="operator-locked-icon" style={{ color: 'var(--danger-light)', fontSize: 32, display: 'block', marginBottom: 12 }}>⚠️</span>
            <h3>Failed to load quality station</h3>
            <p className="operator-step-error" style={{ margin: '12px auto', maxWidth: 400, color: 'var(--danger-light)', background: 'rgba(239,68,68,0.1)', padding: 10, borderRadius: 6, fontSize: 12 }}>
              {error}
            </p>
            <button type="button" className="pill-btn pill-btn-secondary" style={{ fontSize: 12, padding: '8px 20px' }} onClick={closeQmsRole}>
              Return to QMS Role Selection
            </button>
          </div>
        </div>
      )}

      {selectedQmsRoleKey && (qmsRoleDetail || !error) && ActiveRolePanel && <ActiveRolePanel />}
    </div>
  );
}
