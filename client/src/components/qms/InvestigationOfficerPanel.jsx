import { useState } from 'react';
import { useSimStore } from '../../store';
import QMSPanelHeader from './QMSPanelHeader';
import { AlertCircle, HelpCircle } from 'lucide-react';

const INVESTIGATION_QUIZ_OPTIONS = {
  actualQty: [
    {
      value: "A",
      text: "Option A: Material spill during bag transfer to scale (Correct - 10/10)",
      score: 10,
      note: "GMP Correct: Material spill during manual container discharge causes physical weight deficiency.",
      fields: {
        whatHappened: "Weighed quantity of API was 9.50 kg against a target of 10.00 kg.",
        possibleCauses: "Spill during container transfer, scale balance drift, or tare weight miscalculation.",
        evidence: "Physical powder residue found on the dispensing booth floor near the balance.",
        rootCause: "Material spill during bag transfer to the scale hopper.",
        immediateAction: "Dispensing operation halted, spilled material isolated.",
        proposedCorrective: "Re-weigh active lot using secondary calibrated container, adjust yield records.",
        proposedPreventive: "Introduce double-lined transfer bags to eliminate leakage risks during material movement."
      }
    },
    {
      value: "B",
      text: "Option B: Scale load cell software calibration mismatch (4/10)",
      score: 4,
      note: "Incorrect: Load cell drift is possible but would show erratic readings, not a stable low weight.",
      fields: {
        whatHappened: "Weighed quantity of API was 9.50 kg.",
        possibleCauses: "Scale software error.",
        evidence: "EBR log files.",
        rootCause: "Scale software calibration error.",
        immediateAction: "Restart scale.",
        proposedCorrective: "Run auto-calibration routine.",
        proposedPreventive: "Upgrade scale control software."
      }
    },
    {
      value: "C",
      text: "Option C: Supplier API container arrived short of weight (2/10)",
      score: 2,
      note: "Incorrect: Incoming raw materials are certified at warehouse receipt, making this highly unlikely.",
      fields: {
        whatHappened: "API weight shortage.",
        possibleCauses: "Supplier under-filled container.",
        evidence: "CoA package weight check.",
        rootCause: "Supplier packaging line error.",
        immediateAction: "Log supplier complaint.",
        proposedCorrective: "Request replacement container.",
        proposedPreventive: "Audit supplier manufacturing plant."
      }
    },
    {
      value: "D",
      text: "Option D: Operator intentionally shorted the batch weight (0/10)",
      score: 0,
      note: "Critical Error: Alleging malicious intent without verification is not standard GMP methodology.",
      fields: {
        whatHappened: "API weight short of target.",
        possibleCauses: "Intentional operator misconduct.",
        evidence: "None.",
        rootCause: "Operator compliance violation.",
        immediateAction: "Suspend operator from line.",
        proposedCorrective: "Re-train operator on ethics.",
        proposedPreventive: "Implement strict surveillance cameras in dispensing booths."
      }
    }
  ],
  temperature: [
    {
      value: "A",
      text: "Option A: Cooling water pipe clog causing heat accumulation (Correct - 10/10)",
      score: 10,
      note: "GMP Correct: A cooling jacket blockage prevents heat dissipation during rotor shear, causing temperature drift.",
      fields: {
        whatHappened: "Milling chamber temperature rose above 25°C, peaking at 32°C (limit 25°C ± 2°C).",
        possibleCauses: "Cooling jacket flow blockage, screen mesh friction, or impeller shaft seizure.",
        evidence: "Cooling jacket exhaust line felt cold, indicating zero hot-water heat exchange circulation.",
        rootCause: "Blockage in the water-cooling jacket inlet pipe due to particulate accumulation.",
        immediateAction: "Milling machine paused, batch placed on quality hold.",
        proposedCorrective: "Flush cooling line, replace inlet filter valve, verify cooling water flow rate.",
        proposedPreventive: "Incorporate bi-weekly back-flushing of the cooling lines into the PM schedule."
      }
    },
    {
      value: "B",
      text: "Option B: Impeller rotor RPM set too high by operator (3/10)",
      score: 3,
      note: "Incorrect: The RPM was locked at 1500 RPM, which is the validated target speed.",
      fields: {
        whatHappened: "Temperature drift during milling.",
        possibleCauses: "Operator ran mill at high RPM.",
        evidence: "PLC event log.",
        rootCause: "Incorrect processing speed.",
        immediateAction: "Instruct operator to reduce speed.",
        proposedCorrective: "Manually lower RPM speed.",
        proposedPreventive: "Add password-protection locks to RPM speed controls."
      }
    },
    {
      value: "C",
      text: "Option C: Atmospheric room humidity too high (2/10)",
      score: 2,
      note: "Incorrect: Room humidity impacts moisture and powder stickiness, but does not drive sudden stator heat surges.",
      fields: {
        whatHappened: "Mill temperature rise.",
        possibleCauses: "HVAC room environment failure.",
        evidence: "Room sensor readouts.",
        rootCause: "Room air condition failure.",
        immediateAction: "Open room door to increase ventilation.",
        proposedCorrective: "Adjust HVAC target parameters.",
        proposedPreventive: "Install auxiliary cooling fans in milling cubicles."
      }
    },
    {
      value: "D",
      text: "Option D: Operator ran the mill without inserting screen (1/10)",
      score: 1,
      note: "Incorrect: Running screenless would actually lower friction heat, though it would ruin granule sizing.",
      fields: {
        whatHappened: "Milling thermal alarm.",
        possibleCauses: "Missing screen sieve.",
        evidence: "Physical check.",
        rootCause: "Operator forgot to install mill screen.",
        immediateAction: "Stop mill immediately.",
        proposedCorrective: "Install mesh screen sieve.",
        proposedPreventive: "Configure electronic interlocks that prevent start if screen sensor is disengaged."
      }
    }
  ],
  actualWeight: [
    {
      value: "A",
      text: "Option A: Feed frame scraper blade misalignment causing inconsistent die fill (Correct - 10/10)",
      score: 10,
      note: "GMP Correct: A loose or misaligned scraper blade lets fill levels drift, resulting in core tablet weight variations.",
      fields: {
        whatHappened: "Tablet average core weight fell below 490 mg specification limit.",
        possibleCauses: "Feed frame scraper misalignment, powder hopper bridging, or punch length deviation.",
        evidence: "Physical inspection of the feed frame showed the scraper blade clearance was out of spec (0.8mm vs target 0.2mm).",
        rootCause: "Mechanical scraper blade misalignment causing irregular scrape-off and inconsistent die cavity fills.",
        immediateAction: "Tablet press paused, core tablets isolated for weight inspection.",
        proposedCorrective: "Re-align scraper blade to spec, run weight tests, document feed frame integrity.",
        proposedPreventive: "Add a weekly maintenance task to inspect and verify scraper blade clearances and locknut torques."
      }
    },
    {
      value: "B",
      text: "Option B: Punch binder lubrication rate was too low (4/10)",
      score: 4,
      note: "Incorrect: Poor punch lubrication causes binding, friction, or sticking/capping, but does not drive steady weight drops.",
      fields: {
        whatHappened: "Tablet weight drift.",
        possibleCauses: "Inadequate lubrication flow.",
        evidence: "Friction alarm logs.",
        rootCause: "Inadequate punch lubrication.",
        immediateAction: "Increase lubrication flow rate.",
        proposedCorrective: "Manually apply grease to punches.",
        proposedPreventive: "Add auto-lube level sensors."
      }
    },
    {
      value: "C",
      text: "Option C: Sticking/picking of powder on the punch face (2/10)",
      score: 2,
      note: "Incorrect: Powder sticking creates cosmetic tablet surface defects, but does not reduce core tablet weight dynamically.",
      fields: {
        whatHappened: "Weight below spec.",
        possibleCauses: "Powder sticking to punches.",
        evidence: "Physical visual inspect of punches.",
        rootCause: "Moisture content in blend too high.",
        immediateAction: "Increase compression pressure.",
        proposedCorrective: "Clean punch cup faces.",
        proposedPreventive: "Upgrade fluid bed dryer dehumidifier cycles."
      }
    }
  ],
  defectRate: [
    {
      value: "A",
      text: "Option A: Coating pan spray rate nozzle clogging causing tablet surface peeling (Correct - 10/10)",
      score: 10,
      note: "GMP Correct: Clogged spray nozzles distribute coating solution unevenly, leading to tablet friction, peeling, and visual rejections.",
      fields: {
        whatHappened: "Tablet visual defect rate peaked at 40% (limit 1.0%).",
        possibleCauses: "Coating spray nozzle block, pan rotational speed drift, or low hardness of core tablets.",
        evidence: "Physical check of coater gun showed nozzle #3 nozzle tip had a build-up of dried film polymer block.",
        rootCause: "Polymer build-up on spray gun nozzle #3 causing droplet size drift and localized tablet surface peeling.",
        immediateAction: "Inspection hold active, batch isolated, packaging transfer blocked.",
        proposedCorrective: "Clean/clear coater spray nozzles, verify spray atomization air pressure, sort and discard defectives.",
        proposedPreventive: "Implement mid-run nozzle flush protocols for runs exceeding 4 hours to prevent polymer crystallization."
      }
    },
    {
      value: "B",
      text: "Option B: Visual inspectors applied incorrect AQL criteria (3/10)",
      score: 3,
      note: "Incorrect: Inspector audits show they applied standard AQL procedures. Clogging is a physical tablet defect.",
      fields: {
        whatHappened: "Defect rate alarm triggered.",
        possibleCauses: "Inspector error.",
        evidence: "AQL sampling sheet review.",
        rootCause: "Improper visual inspector training.",
        immediateAction: "Re-train inspectors.",
        proposedCorrective: "Run secondary inspection.",
        proposedPreventive: "Automate inspection with optical sorting cameras."
      }
    },
    {
      value: "C",
      text: "Option C: Core tablet hardness was set too low (2/10)",
      score: 2,
      note: "Incorrect: Low hardness causes friability/breakage, but the observed defects are surface peeling (coating issue).",
      fields: {
        whatHappened: "Visual defect breach.",
        possibleCauses: "Friable core tablets.",
        evidence: "Hardness test logs.",
        rootCause: "Low compression press pressure.",
        immediateAction: "Manually adjust coater parameters.",
        proposedCorrective: "Scrap peeling tablets.",
        proposedPreventive: "Configure press auto-rejection gate for low force."
      }
    }
  ],
  generic: [
    {
      value: "A",
      text: "Option A: Mechanical component wear causing parameter drift (Correct - 10/10)",
      score: 10,
      note: "GMP Correct: General mechanical degradation is the standard cause of sudden telemetry alarms.",
      fields: {
        whatHappened: "Process parameter drifted outside validation limit.",
        possibleCauses: "Equipment mechanical wear, sensor drift, or material inconsistency.",
        evidence: "Telemetry logs showing gradual deviation trends over time.",
        rootCause: "Mechanical wear and tear of active component.",
        immediateAction: "Pause process, notify maintenance engineering.",
        proposedCorrective: "Calibrate sensors, replace worn parts, verify operation.",
        proposedPreventive: "Review PM frequencies and update life cycle replacement limits."
      }
    },
    {
      value: "B",
      text: "Option B: Operator error during setup (3/10)",
      score: 3,
      note: "Incorrect: Bashing operator performance is poor quality assurance methodology without database audit proof.",
      fields: {
        whatHappened: "Parameter alarm triggered.",
        possibleCauses: "Operator mistake.",
        evidence: "None.",
        rootCause: "Operator failed to follow training.",
        immediateAction: "Reprimand operator.",
        proposedCorrective: "Conduct training review.",
        proposedPreventive: "Conduct annual operator re-qualification exams."
      }
    },
    {
      value: "C",
      text: "Option C: Electrical voltage surge in the facility (1/10)",
      score: 1,
      note: "Incorrect: Electrical surges trip breaker switches, they do not cause steady process parameter drift.",
      fields: {
        whatHappened: "Telemetry alert.",
        possibleCauses: "Grid power instability.",
        evidence: "Facility log checks.",
        rootCause: "External electrical surge.",
        immediateAction: "Engage UPS battery backup.",
        proposedCorrective: "Check breaker lines.",
        proposedPreventive: "Install power conditioners on all computer PLCs."
      }
    },
    {
      value: "D",
      text: "Option D: Software database sync delay (0/10)",
      score: 0,
      note: "Incorrect: Database latency does not affect real-time process controller telemetry loops.",
      fields: {
        whatHappened: "Telemetry alarm delay.",
        possibleCauses: "Database sync lag.",
        evidence: "Network ping stats.",
        rootCause: "Network router failure.",
        immediateAction: "Reboot router.",
        proposedCorrective: "Optimize SQL index queries.",
        proposedPreventive: "Implement local caching nodes."
      }
    }
  ]
};

export default function InvestigationOfficerPanel() {
  const { qmsRoleDetail, qmsRoleDetailLoading, closeQmsRole, submitInvestigation, batchState, recordQuizScore, qmsScores } =
    useSimStore();

  const [selectedOption, setSelectedOption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (qmsRoleDetailLoading || !qmsRoleDetail) {
    return (
      <div className="operator-panel">
        <QMSPanelHeader icon="investigation" title="Investigation Officer" onBack={closeQmsRole} />
        <p className="operator-loading">Loading…</p>
      </div>
    );
  }

  if (qmsRoleDetail.status === 'locked') {
    return (
      <div className="operator-panel">
        <QMSPanelHeader icon="investigation" title="Investigation Officer" onBack={closeQmsRole} />
        <div className="operator-locked">
          <span className="operator-locked-icon">🔒</span>
          <h3>This role is locked</h3>
          <p>{qmsRoleDetail.note || 'Waiting on a significant Impact Assessment from the SME.'}</p>
        </div>
      </div>
    );
  }

  const { deviation, activeEvent } = qmsRoleDetail;
  const optionsKey = activeEvent && INVESTIGATION_QUIZ_OPTIONS[activeEvent.parameter] ? activeEvent.parameter : 'generic';
  const quizOptions = INVESTIGATION_QUIZ_OPTIONS[optionsKey];

  const alreadyInvestigated = deviation && !!deviation.root_cause;
  const recordedScore = activeEvent ? qmsScores['investigation_' + activeEvent.id] : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOption) {
      setFormError('Select one of the investigation options before submitting.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const optObj = quizOptions.find((o) => o.value === selectedOption);
      
      // Record score into store
      recordQuizScore('investigation_' + activeEvent.id, selectedOption, optObj.score, 10);

      // Submit pre-populated form fields corresponding to correct option structure
      await submitInvestigation(deviation.id, batchState.batch.id, optObj.fields);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="operator-panel">
      <QMSPanelHeader icon="investigation" title="Investigation Officer" onBack={closeQmsRole} />
      <p className="operator-summary">
        Determine the root cause of this deviation and propose corrective/preventive action.
      </p>

      {activeEvent && (
        <div className="qms-event-card">
          <div className="qms-event-header">
            <span className="qms-event-icon">🕵️</span>
            <div>
              <h3>Deviation — Event #{activeEvent.id}</h3>
              <span className="alarm-stage">Component/Stage: {activeEvent.stage_name}</span>
            </div>
          </div>
          <div className="qms-event-message">{activeEvent.message}</div>
          <div className="qms-event-details">
            <div className="qms-info-item"><span>Severity</span><strong>{deviation.severity}</strong></div>
            <div className="qms-info-item"><span>Product Impact</span><strong>{deviation.product_impact}</strong></div>
          </div>
        </div>
      )}

      {!alreadyInvestigated ? (
        <form className="qms-form-card" onSubmit={handleSubmit}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HelpCircle size={16} /> Root Cause Investigation Quiz
          </h3>
          <p className="qms-quiz-desc" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Review the deviation facts. Select the most accurate Root Cause hypothesis and proposed CAPA measures below:
          </p>

          <div className="operator-select-options" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quizOptions.map((opt) => {
              const isSelected = selectedOption === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedOption(opt.value)}
                  className={`operator-select-option ${isSelected ? 'active' : ''}`}
                  style={{
                    textAlign: 'left',
                    padding: 12,
                    border: '1.5px solid',
                    borderColor: isSelected ? 'var(--neon-accent)' : 'var(--glass-border)',
                    background: isSelected ? 'rgba(14, 165, 233, 0.08)' : 'var(--bg-input)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    lineHeight: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}
                >
                  <strong>{opt.text}</strong>
                  <span style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>
                    Corrective: {opt.fields.proposedCorrective}
                  </span>
                </button>
              );
            })}
          </div>

          {formError && <div className="operator-step-error">{formError}</div>}

          <button type="submit" className="qms-primary-button" style={{ marginTop: 18 }} disabled={submitting}>
            {submitting ? 'SUBMITTING…' : 'SUBMIT ROOT CAUSE DIAGNOSIS'}
          </button>
        </form>
      ) : (
        <div className="qms-workflow-card">
          <div className="scorecard-badge-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3>Investigation Complete</h3>
            {recordedScore && (
              <span className="status-badge" style={{ background: 'var(--success-dim)', color: 'var(--success)', fontWeight: 'bold' }}>
                Score: {recordedScore.score}/10
              </span>
            )}
          </div>

          <div className="qms-info-item">
            <span>Root Cause</span>
            <strong>{deviation.root_cause}</strong>
          </div>
          <div className="qms-info-item">
            <span>Evidence</span>
            <strong>{deviation.evidence}</strong>
          </div>
          <div className="qms-info-item">
            <span>Proposed Corrective Action</span>
            <strong>{deviation.proposed_corrective}</strong>
          </div>
          <div className="qms-info-item">
            <span>Proposed Preventive Action</span>
            <strong>{deviation.proposed_preventive}</strong>
          </div>

          <p className="qms-next-action" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 10, marginTop: 10 }}>
            Investigation report locked. CAPA Coordinator has been assigned.
          </p>
        </div>
      )}
    </div>
  );
}
