const db = require('./db');
const roles = require('./roles');
const qmsRoles = require('./qmsRoles');

function getSimulationConfig(simulationId) {
  let targetId = simulationId;
  // Fallback mappings to resolve ID mismatches between client and database
  if (targetId === 'sim-001') targetId = 'paracetamol-500';
  
  let row = db.prepare('SELECT * FROM simulations WHERE id = ?').get(targetId);
  if (!row && targetId === 'paracetamol-500') {
    // Try original sim-001 ID if paracetamol-500 was not seeded yet
    row = db.prepare('SELECT * FROM simulations WHERE id = ?').get('sim-001');
  }
  
  if (!row) throw new Error(`Simulation ${simulationId} not found`);
  return JSON.parse(row.config_json);
}

function logActivity(batchId, actor, action, details = '') {
  db.prepare(
    `INSERT INTO activity_log (batch_id, actor, action, details) VALUES (?, ?, ?, ?)`
  ).run(batchId, actor, action, details);
}

// Create a new batch from a simulation config: builds the 9 stage rows and a machine row.
function createBatch(simulationId) {
  const config = getSimulationConfig(simulationId);

  const insertBatch = db.prepare(
    `INSERT INTO batches (simulation_id, status, current_stage_order) VALUES (?, 'in_process', 1)`
  );
  const { lastInsertRowid: batchId } = insertBatch.run(simulationId);

  const insertStage = db.prepare(
    `INSERT INTO stages (batch_id, name, stage_order, status) VALUES (?, ?, ?, ?)`
  );
  for (const stage of config.stages) {
    insertStage.run(batchId, stage.name, stage.order, stage.order === 1 ? 'pending' : 'pending');
  }

  db.prepare(`INSERT INTO machines (batch_id, status) VALUES (?, 'stopped')`).run(batchId);

  logActivity(batchId, 'VM', 'batch_created', `Batch created from ${config.name}`);

  return getBatchState(batchId);
}

// Start a stage: marks it active, sets machine to running.
function startStage(batchId, stageId) {
  const stage = db
    .prepare('SELECT * FROM stages WHERE id = ? AND batch_id = ?')
    .get(stageId, batchId);

  if (!stage) throw new Error('Stage not found for this batch');

  if (stage.status === 'completed') {
    throw new Error('Stage already completed');
  }

  db.prepare(
    `UPDATE stages
     SET status = 'active',
         started_at = datetime('now')
     WHERE id = ?`
  ).run(stageId);

  db.prepare(
    `UPDATE machines
     SET status = 'running'
     WHERE batch_id = ?`
  ).run(batchId);

  logActivity(
    batchId,
    'VM',
    'stage_started',
    stage.name
  );

  const config =
    getSimulationConfig(
      getBatch(batchId).simulation_id
    );

  const eventId =
    maybeTriggerDefect(
      batchId,
      stage.name,
      config
    );

  return {
    state: getBatchState(batchId),
    eventId
  };
}
// Complete the active stage, advance current_stage_order, stop machine between stages.
function completeStage(batchId, stageId) {
  const stage = db.prepare('SELECT * FROM stages WHERE id = ? AND batch_id = ?').get(stageId, batchId);
  if (!stage) throw new Error('Stage not found for this batch');
  if (stage.status !== 'active') throw new Error('Stage is not active');

  db.prepare(`UPDATE stages SET status = 'completed', completed_at = datetime('now') WHERE id = ?`).run(stageId);
  db.prepare(`UPDATE machines SET status = 'stopped' WHERE batch_id = ?`).run(batchId);

  const nextOrder = stage.stage_order + 1;
  db.prepare(`UPDATE batches SET current_stage_order = ? WHERE id = ?`).run(nextOrder, batchId);

  logActivity(batchId, 'VM', 'stage_completed', stage.name);

  return getBatchState(batchId);
}

// Checks the simulation's scripted defect and fires an alarm event if this stage is the trigger.
function maybeTriggerDefect(batchId, stageName, config) {
  const defect = config.defect;
  if (!defect || defect.triggerStage !== stageName) return null;

  const alreadyFired = db
    .prepare(`SELECT id FROM events WHERE batch_id = ? AND parameter = ?`)
    .get(batchId, defect.parameter);
  if (alreadyFired) return null;

  const { lastInsertRowid: eventId } = db
    .prepare(
      `INSERT INTO events (batch_id, stage_name, type, parameter, expected, actual, message)
       VALUES (?, ?, 'alarm', ?, ?, ?, ?)`
    )
    .run(batchId, stageName, defect.parameter, defect.normal, defect.drift, defect.message);

  logActivity(batchId, 'VM', 'alarm_triggered', defect.message);

  return eventId;
}

function getBatch(batchId) {
  return db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
}

// Full joined state: batch + stages + machine + events + activity log. This is what both
// the VM and QMS panels render from — one source of truth, per the shared-store design.
function getBatchState(batchId) {
  const batch = getBatch(batchId);
  if (!batch) throw new Error('Batch not found');

  const stages = db
    .prepare('SELECT * FROM stages WHERE batch_id = ? ORDER BY stage_order ASC')
    .all(batchId);
  const machine = db.prepare('SELECT * FROM machines WHERE batch_id = ?').get(batchId);
  const events = db
    .prepare('SELECT * FROM events WHERE batch_id = ? ORDER BY created_at DESC')
    .all(batchId);
  const activityLog = db
    .prepare('SELECT * FROM activity_log WHERE batch_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(batchId);

  const config = getSimulationConfig(batch.simulation_id);

  return { batch, stages, machine, events, activityLog, simulationConfig: config };
}

function listSimulations() {
  const rows = db.prepare('SELECT * FROM simulations').all();
  return rows.map((r) => JSON.parse(r.config_json));
}

// =====================================================================
// DAY 2 — Alarm response, investigation, deviation, CAPA, release
// =====================================================================

// The most recent alarm event for a batch that hasn't been resolved by a release yet.
// (Simplified: one scripted defect per batch, so "latest event" is always the active one
// as long as the batch hasn't already been released.)
function getActiveEvent(batchId) {
  const batch = getBatch(batchId);
  if (!batch) return null;

  const latestEvent = db
    .prepare(`SELECT * FROM events WHERE batch_id = ? ORDER BY id DESC LIMIT 1`)
    .get(batchId);

  if (!latestEvent) return null;
  if (latestEvent.type !== 'alarm') return null;

  const deviation = db
    .prepare(`SELECT * FROM deviations WHERE event_id = ?`)
    .get(latestEvent.id);

  if (!deviation) {
    return latestEvent;
  }

  if (deviation.significant === 1 && deviation.status !== 'closed') {
    return latestEvent;
  }

  return null;
}


// VM operator response to an alarm: acknowledge / adjust / pause / stop / resume / report.
function operatorAction(batchId, eventId, action, details = '') {
  const validActions = ['acknowledge', 'adjust', 'pause', 'stop', 'resume', 'report'];
  if (!validActions.includes(action)) throw new Error(`Invalid operator action: ${action}`);

  const event = eventId ? db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) : null;

  if (eventId && ['acknowledge', 'pause', 'stop', 'report'].includes(action)) {
    db.prepare(`UPDATE events SET acknowledged = 1 WHERE id = ?`).run(eventId);

    if (event) {
      // Evaluate operator decision
      let score = 0;
      let status = 'FAIL';
      if (['pause', 'stop', 'report'].includes(action)) {
        score = 10;
        status = 'PASS';
      }

      // Record score in step_scores using correct schema column names
      const existingScore = db.prepare(
        'SELECT id FROM step_scores WHERE batch_id = ? AND stage = ? AND field = ?'
      ).get(batchId, event.stage_name, 'alarmResponse');

      const expectedDesc = 'Halt machine (Pause/Stop) or Report to QMS during critical alarm.';
      const passedVal = ['pause', 'stop', 'report'].includes(action) ? 1 : 0;

      if (existingScore) {
        db.prepare(
          'UPDATE step_scores SET actual = ?, passed = ?, marks_awarded = ? WHERE id = ?'
        ).run(action, passedVal, score, existingScore.id);
      } else {
        db.prepare(
          `INSERT INTO step_scores (batch_id, stage, field, expected, actual, passed, marks_awarded, marks_max)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(batchId, event.stage_name, 'alarmResponse', expectedDesc, action, passedVal, score, 10);
      }
    }
  }

  const machineStatusMap = { pause: 'paused', stop: 'stopped', resume: 'running' };
  if (machineStatusMap[action]) {
    db.prepare(`UPDATE machines SET status = ? WHERE batch_id = ?`)
      .run(machineStatusMap[action], batchId);
  }

  logActivity(batchId, 'VM', `operator_${action}`, details);

  return getBatchState(batchId);
}

function getDeviationByEvent(eventId) {
  return db.prepare('SELECT * FROM deviations WHERE event_id = ?').get(eventId);
}

function getDeviation(deviationId) {
  return db.prepare('SELECT * FROM deviations WHERE id = ?').get(deviationId);
}

// QMS Role 12 (SME): Impact Assessment — creates the deviation on first
// submission, updates it if resubmitted. `significant` is the SME's
// explicit significance decision (per doc section 15, "If significant ->
// Deviation") and is what gates the Investigation Officer's panel.
// If the SME decides NOT significant, the event is closed out here —
// there is nothing for Investigation/CAPA/QA to do, and the SME role
// panel shows the case as resolved.
function submitImpactAssessment(eventId, batchId, severity, productImpact, significant, notes) {
  const existing = getDeviationByEvent(eventId);
  const sigFlag = significant ? 1 : 0;

  if (existing) {
    db.prepare(
      `UPDATE deviations SET severity = ?, product_impact = ?, significant = ? WHERE id = ?`
    ).run(severity, productImpact, sigFlag, existing.id);
  } else {
    db.prepare(
      `INSERT INTO deviations (event_id, severity, product_impact, significant) VALUES (?, ?, ?, ?)`
    ).run(eventId, severity, productImpact, sigFlag);
  }

  if (!significant) {
    // Not quality-significant: close the loop right here. Acknowledge the
    // event so the VM stage isn't blocked, and no batch hold is applied.
    db.prepare(`UPDATE events SET acknowledged = 1 WHERE id = ?`).run(eventId);
  }

  logActivity(
    batchId,
    'QMS',
    'impact_assessment',
    `${severity} / ${significant ? 'SIGNIFICANT' : 'not significant'}: ${notes || ''}`
  );

  return getDeviationByEvent(eventId);
}

// QMS Role 13 (Investigation Officer) — fills in the full structured
// investigation entry from the document (what happened / possible causes
// / evidence / root cause / immediate action / proposed corrective &
// preventive action) and puts the batch ON HOLD.
// Note: batch.status (on_hold) is independent of machines.status — the
// machine may already be stopped/paused from the VM's operatorAction,
// this is a separate QMS-owned status.
function submitInvestigation(deviationId, batchId, fields) {
  const {
    whatHappened,
    possibleCauses,
    evidence,
    rootCause,
    immediateAction,
    proposedCorrective,
    proposedPreventive,
  } = fields;

  db.prepare(
    `UPDATE deviations
     SET description = ?, possible_causes = ?, evidence = ?, root_cause = ?,
         immediate_action = ?, proposed_corrective = ?, proposed_preventive = ?
     WHERE id = ?`
  ).run(
    whatHappened,
    possibleCauses,
    evidence,
    rootCause,
    immediateAction,
    proposedCorrective,
    proposedPreventive,
    deviationId
  );

  db.prepare(`UPDATE batches SET status = 'on_hold' WHERE id = ?`).run(batchId);

  logActivity(batchId, 'QMS', 'investigation_submitted', rootCause);

  return {
    deviation: getDeviation(deviationId),
    batch: getBatch(batchId),
  };
}

function getCapa(capaId) {
  return db.prepare('SELECT * FROM capas WHERE id = ?').get(capaId);
}

function getCapaByDeviation(deviationId) {
  return db.prepare('SELECT * FROM capas WHERE deviation_id = ? ORDER BY id DESC LIMIT 1').get(deviationId);
}

// QMS Role 14 (CAPA Coordinator) — create the CAPA off the Investigation
// Officer's proposed corrective/preventive actions. actionItems is an
// array of short text strings the Coordinator wants tracked to
// completion (per doc: "Assign actions -> Track completion").
function createCAPA(deviationId, batchId, correctiveAction, preventiveAction, actionItems = []) {
  const items = (actionItems || [])
    .filter((t) => t && t.trim())
    .map((text) => ({ text: text.trim(), done: false }));

  const { lastInsertRowid: capaId } = db
    .prepare(
      `INSERT INTO capas (deviation_id, corrective_action, preventive_action, status, action_items)
       VALUES (?, ?, ?, 'open', ?)`
    )
    .run(deviationId, correctiveAction, preventiveAction, JSON.stringify(items));

  logActivity(batchId, 'QMS', 'capa_created', correctiveAction);

  return getCapa(capaId);
}

// CAPA Coordinator: toggle one tracked action item done/not-done.
function capaToggleAction(capaId, batchId, itemIndex) {
  const capa = getCapa(capaId);
  if (!capa) throw new Error('CAPA not found');

  let items = [];
  try { items = JSON.parse(capa.action_items || '[]'); } catch { items = []; }
  if (!items[itemIndex]) throw new Error('Action item not found');

  items[itemIndex].done = !items[itemIndex].done;

  db.prepare(`UPDATE capas SET action_items = ? WHERE id = ?`).run(JSON.stringify(items), capaId);

  logActivity(batchId, 'QMS', 'capa_action_toggled', `${items[itemIndex].text}: ${items[itemIndex].done ? 'done' : 'pending'}`);

  return getCapa(capaId);
}

// CAPA Coordinator: collect evidence text supporting the CAPA.
function capaAddEvidence(capaId, batchId, evidenceText) {
  db.prepare(`UPDATE capas SET evidence = ? WHERE id = ?`).run(evidenceText, capaId);
  logActivity(batchId, 'QMS', 'capa_evidence_added', evidenceText);
  return getCapa(capaId);
}

// CAPA Coordinator: sends the CAPA to VM for corrective-action
// implementation (this is what un-gates the VM "Submit Corrected
// Reading" card — VM cannot act on a CAPA the Coordinator hasn't
// finished preparing and sent).
function capaSendForReview(capaId, batchId) {
  db.prepare(`UPDATE capas SET sent_for_review = 1 WHERE id = ?`).run(capaId);
  logActivity(batchId, 'QMS', 'capa_sent_to_vm', `CAPA #${capaId} sent to VM for corrective action`);
  return getCapa(capaId);
}

// VM: submits the corrected reading after applying the fix. Moves CAPA to pending_verification.
// Persists the reading on the CAPA row so the CAPA Coordinator's Verify
// panel can read it regardless of which browser/session submitted it.
function submitCapaFix(capaId, batchId, parameter, beforeValue, afterValue) {
  db.prepare(
    `UPDATE capas SET status = 'pending_verification', fix_parameter = ?, fix_before = ?, fix_after = ? WHERE id = ?`
  ).run(parameter, beforeValue, afterValue, capaId);

  logActivity(
    batchId,
    'VM',
    'capa_fix_submitted',
    `${parameter}: ${beforeValue} -> ${afterValue}`
  );

  return getCapa(capaId);
}

// QMS: verify the fix against expected value ± tolerance. Writes the verification_results row
// and flips the CAPA to verified/failed accordingly.
function verifyCapa(capaId, batchId, parameter, expected, beforeValue, afterValue, tolerance) {
  const passed = Math.abs(afterValue - expected) <= tolerance ? 1 : 0;

  db.prepare(
    `INSERT INTO verification_results
       (capa_id, parameter, expected, before_value, after_value, tolerance, passed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(capaId, parameter, expected, beforeValue, afterValue, tolerance, passed);

  db.prepare(`UPDATE capas SET status = ? WHERE id = ?`)
    .run(passed ? 'verified' : 'failed', capaId);

  logActivity(batchId, 'QMS', 'capa_verified', passed ? 'pass' : 'fail');

  return { passed: !!passed, expected, afterValue, tolerance };
}

// QMS: release — only allowed once the CAPA is verified. Closes the deviation.
function releaseBatch(batchId, capaId) {
  const capa = getCapa(capaId);
  if (!capa || capa.status !== 'verified') {
    throw new Error('Cannot release: CAPA not verified');
  }

  db.prepare(`UPDATE batches SET status = 'released' WHERE id = ?`).run(batchId);
  db.prepare(`UPDATE deviations SET status = 'closed' WHERE id = ?`).run(capa.deviation_id);

  // The deviation/CAPA/verification cycle is QMS's way of formally resolving
  // the underlying alarm event. Once QMS releases the batch, that event is
  // fully closed out — mark it acknowledged so the VM step engine's
  // "unacknowledged alarm blocks stage completion" gate doesn't keep the
  // operator stuck on an alarm QMS has already resolved.
  const deviation = getDeviation(capa.deviation_id);
  if (deviation) {
    db.prepare(`UPDATE events SET acknowledged = 1 WHERE id = ?`).run(deviation.event_id);
  }

  logActivity(batchId, 'QMS', 'batch_released', `CAPA #${capaId} verified`);

  return getBatch(batchId);
}

// =====================================================================
// QMS ROLE PANELS — the 5-role step flow (QMS Monitor / SME /
// Investigation Officer / CAPA Coordinator / QA Reviewer)
// =====================================================================
//
// Each of the 5 roles gets its own dedicated panel on the frontend
// (mirroring the VM's 10-role grid pattern) but their underlying work
// is heterogeneous, so — unlike the VM process roles — there isn't one
// generic step engine. Instead this section derives each role's
// lock/active/completed status from the shared deviation/CAPA/QA state
// machine, and getQmsRoleDetail() assembles exactly what each role's
// dedicated panel needs to render.

// QMS Role 11 (QMS Monitor): triage a new event and assign it to the
// SME. This is what unlocks the SME's panel — the SME cannot start
// working an event the Monitor hasn't reviewed yet.
function qmsMonitorReviewEvent(batchId, eventId, note) {
  db.prepare(`UPDATE events SET reviewed_by_monitor = 1, assigned_role = 'SME / Quality Reviewer' WHERE id = ?`)
    .run(eventId);

  logActivity(batchId, 'QMS-Monitor', 'event_reviewed_assigned', note || 'Assigned to SME / Quality Reviewer');

  return getQmsMonitorOverview(batchId);
}

// QMS Monitor's wide-view dashboard: every batch/event/deviation/CAPA
// status at a glance, plus what other QMS students should be doing
// while a specific event is being worked (per doc section 15/8 — the
// QMS team is never idle).
function getQmsMonitorOverview(batchId) {
  const state = getBatchState(batchId);
  const activeEvent = getActiveEvent(batchId);
  const deviation = activeEvent ? getDeviationByEvent(activeEvent.id) : null;
  const capa = deviation ? getCapaByDeviation(deviation.id) : null;

  const events = db
    .prepare('SELECT * FROM events WHERE batch_id = ? ORDER BY created_at DESC')
    .all(batchId);

  return {
    batch: state.batch,
    machine: state.machine,
    activeEvent,
    deviation,
    capa,
    events,
    unreviewed: events.filter((e) => !e.reviewed_by_monitor && !e.acknowledged),
    // "Other QMS students" prep checklist — informational, matches the
    // document's "QMS team is not idle" section.
    standingDuties: [
      'Review historical batch data and previous deviations',
      'Check predefined quality limits/rules for the current batch',
      'Prepare quality checklists for the next stage',
      'Observe active machine operations on the VM floor',
    ],
  };
}

// QMS Role 15 (QA Reviewer): approve (-> release the batch) or return
// (-> send the case back to CAPA/Investigation for rework) the fully
// verified quality chain.
function qaReview(batchId, capaId, decision, comments) {
  const capa = getCapa(capaId);
  if (!capa) throw new Error('CAPA not found');
  if (capa.status !== 'verified') {
    throw new Error('CAPA effectiveness must be verified before QA review.');
  }

  const deviation = getDeviation(capa.deviation_id);

  db.prepare(
    `INSERT INTO qa_reviews (batch_id, capa_id, deviation_id, decision, comments) VALUES (?, ?, ?, ?, ?)`
  ).run(batchId, capaId, capa.deviation_id, decision, comments || '');

  if (decision === 'approved') {
    releaseBatch(batchId, capaId);
    logActivity(batchId, 'QA', 'qa_review_approved', comments || '');
  } else if (decision === 'returned') {
    // Send back for rework: CAPA re-opens (Coordinator must re-track /
    // re-send), and VM's corrected reading is no longer accepted as
    // final until re-verified.
    db.prepare(`UPDATE capas SET status = 'open', sent_for_review = 0 WHERE id = ?`).run(capaId);
    logActivity(batchId, 'QA', 'qa_review_returned', comments || '');
  } else {
    throw new Error('Invalid QA decision: must be "approved" or "returned"');
  }

  return {
    batch: getBatch(batchId),
    capa: getCapa(capaId),
    deviation,
  };
}

function getQaReviewByCapa(capaId) {
  return db.prepare('SELECT * FROM qa_reviews WHERE capa_id = ? ORDER BY id DESC LIMIT 1').get(capaId);
}

// Status/lock state for the 5-role QMS grid, derived from the shared
// deviation/CAPA/QA state machine tied to the batch's current alarm
// event. Unlike the VM roles, QMS roles aren't unlocked in a strict
// numeric order tied to stages — they unlock as the current event
// progresses through triage -> assessment -> investigation -> CAPA -> review.
function listQmsRoles(batchId) {
  const batch = getBatch(batchId);
  if (!batch) throw new Error('Batch not found');

  const activeEvent = getActiveEvent(batchId);
  const deviation = activeEvent ? getDeviationByEvent(activeEvent.id) : null;
  const capa = deviation ? getCapaByDeviation(deviation.id) : null;
  const qaReviewRow = capa ? getQaReviewByCapa(capa.id) : null;

  const allDefs = qmsRoles.getAllQmsRoles();

  return allDefs.map((def) => {
    let status = 'locked';
    let note = '';

    if (def.key === 'qms_monitor') {
      // Always available — the Monitor's dashboard is a permanent
      // wide-view, same as the VM's Machine Monitor.
      status = activeEvent && !activeEvent.reviewed_by_monitor ? 'active' : 'available';
      note = activeEvent && !activeEvent.reviewed_by_monitor ? 'New event needs triage' : '';
    } else if (def.key === 'sme') {
      if (!activeEvent || !activeEvent.reviewed_by_monitor) {
        status = 'locked';
        note = 'Waiting on QMS Monitor to triage the event';
      } else if (!deviation || deviation.significant === null || deviation.significant === undefined) {
        status = 'active';
        note = 'Impact Assessment required';
      } else {
        status = 'completed';
        note = deviation.significant ? 'Marked significant' : 'Marked not significant — closed';
      }
    } else if (def.key === 'investigation_officer') {
      if (!deviation || !deviation.significant) {
        status = 'locked';
        note = 'Waiting on a significant Impact Assessment';
      } else if (!deviation.root_cause) {
        status = 'active';
        note = 'Root cause investigation required';
      } else {
        status = 'completed';
        note = 'Root cause established';
      }
    } else if (def.key === 'capa_coordinator') {
      if (!deviation || !deviation.root_cause) {
        status = 'locked';
        note = 'Waiting on the Investigation Officer\u2019s root cause';
      } else if (!capa) {
        status = 'active';
        note = 'CAPA not yet created';
      } else if (capa.status === 'verified') {
        status = 'completed';
        note = 'Effectiveness verified';
      } else {
        status = 'active';
        note = capa.status === 'failed' ? 'Verification failed — rework' : 'In progress';
      }
    } else if (def.key === 'qa_reviewer') {
      if (!capa || capa.status !== 'verified') {
        status = 'locked';
        note = 'Waiting on CAPA effectiveness verification';
      } else if (!qaReviewRow || qaReviewRow.decision === 'returned') {
        status = 'active';
        note = 'Final review required';
      } else {
        status = 'completed';
        note = 'Approved — batch released';
      }
    }

    return {
      key: def.key,
      order: def.order,
      title: def.title,
      icon: def.icon,
      summary: def.summary,
      responsibilities: def.responsibilities,
      status,
      note,
    };
  });
}

// Full detail needed to render one QMS role's dedicated panel.
function getQmsRoleDetail(batchId, roleKey) {
  const batch = getBatch(batchId);
  if (!batch) throw new Error('Batch not found');

  const def = qmsRoles.getQmsRoleByKey(roleKey);
  if (!def) throw new Error('Unknown QMS role');

  const activeEvent = getActiveEvent(batchId);
  const deviation = activeEvent ? getDeviationByEvent(activeEvent.id) : null;
  const capa = deviation ? getCapaByDeviation(deviation.id) : null;
  const qaReviewRow = capa ? getQaReviewByCapa(capa.id) : null;

  const rolesList = listQmsRoles(batchId);
  const roleStatus = rolesList.find((r) => r.key === roleKey);

  let capaWithItems = null;
  if (capa) {
    let items = [];
    try { items = JSON.parse(capa.action_items || '[]'); } catch { items = []; }
    capaWithItems = { ...capa, actionItems: items };
  }

  return {
    role: def,
    status: roleStatus?.status || 'locked',
    note: roleStatus?.note || '',
    batch,
    activeEvent,
    deviation,
    capa: capaWithItems,
    qaReview: qaReviewRow,
    monitorOverview: roleKey === 'qms_monitor' ? getQmsMonitorOverview(batchId) : null,
  };
}

// =====================================================================
// VM ROLE PANELS — 10-role technical step flow
// =====================================================================
//
// Each of the 9 process roles (dispensing..packaging) is permanently
// bound to one stage (stage_order 1-9). The operator works through
// that role's fixed list of technical steps (see roles.js). Every step
// is logged to stage_step_log, and the accumulated values for the
// stage are kept in stages.operation_data so the UI can be rebuilt on
// refresh/reconnect.
//
// Role 10 (Machine Monitor) is cross-cutting and is served by
// getMonitorOverview()/addMonitorNote() below instead of the step flow.

function getStage(batchId, stageId) {
  return db.prepare('SELECT * FROM stages WHERE id = ? AND batch_id = ?').get(stageId, batchId);
}

function getStageByOrder(batchId, order) {
  return db.prepare('SELECT * FROM stages WHERE batch_id = ? AND stage_order = ?').get(batchId, order);
}

function parseOperationData(stage) {
  try {
    return JSON.parse(stage.operation_data || '{}');
  } catch {
    return {};
  }
}

// Every VM role for this batch, with progress/lock state, so the frontend
// can render the 10-role selection grid inside the VM panel.
function listBatchRoles(batchId) {
  const batch = getBatch(batchId);
  if (!batch) throw new Error('Batch not found');

  const allRoles = roles.getAllRoles();

  return allRoles.map((role) => {
    if (role.key === 'monitor') {
      return {
        key: role.key,
        order: role.order,
        title: role.title,
        icon: role.icon,
        summary: role.summary,
        type: 'monitor',
        status: 'available', // Machine Monitor is always available
      };
    }

    const stage = getStageByOrder(batchId, role.order);
    let status = 'locked';
    if (stage) {
      if (stage.status === 'completed') status = 'completed';
      else if (role.order === batch.current_stage_order) status = 'active';
      else if (role.order < batch.current_stage_order) status = 'completed';
      else status = 'locked';
    }

    return {
      key: role.key,
      order: role.order,
      title: role.title,
      icon: role.icon,
      summary: role.summary,
      type: 'process',
      status,
      stageId: stage ? stage.id : null,
      totalSteps: role.steps.length,
      currentStep: stage ? stage.current_step : 0,
    };
  });
}

// Full detail needed to render one role's dedicated operator panel.
function getRoleStageDetail(batchId, roleKey) {
  const batch = getBatch(batchId);
  if (!batch) throw new Error('Batch not found');

  const role = roles.getRoleByKey(roleKey);
  if (!role || role.key === 'monitor') throw new Error('Unknown process role');

  const stage = getStageByOrder(batchId, role.order);
  if (!stage) throw new Error('Stage not found for this role');

  const stepLog = db
    .prepare('SELECT * FROM stage_step_log WHERE stage_id = ? ORDER BY id ASC')
    .all(stage.id);

  const activeEvent = getActiveEvent(batchId);

  return {
    role,
    stage,
    operationData: parseOperationData(stage),
    stepLog,
    locked: role.order > batch.current_stage_order && stage.status !== 'completed',
    activeEvent:
      activeEvent && activeEvent.stage_name === role.stageName ? activeEvent : null,
    batch,
  };
}

// Operator submits one technical step (identify material, set a
// parameter, confirm a reading, etc). This is the generic engine that
// drives all 9 process-role step flows.
function submitStep(batchId, roleKey, stepKey, value) {
  const role = roles.getRoleByKey(roleKey);
  if (!role || role.key === 'monitor') throw new Error('Unknown process role');

  const batch = getBatch(batchId);
  if (!batch) throw new Error('Batch not found');

  if (role.order > batch.current_stage_order) {
    throw new Error('This role is locked until earlier stages are completed.');
  }

  const stage = getStageByOrder(batchId, role.order);
  if (!stage) throw new Error('Stage not found for this role');
  if (stage.status === 'completed') throw new Error('This stage is already completed');

  const stepIndex = role.steps.findIndex((s) => s.key === stepKey);
  if (stepIndex === -1) throw new Error(`Unknown step: ${stepKey}`);
  if (stepIndex !== stage.current_step) {
    throw new Error('This step is out of order. Complete the current step first.');
  }

  const step = role.steps[stepIndex];
  const data = parseOperationData(stage);

  // First step of a role marks the stage/machine active.
  if (stage.status === 'pending') {
    db.prepare(`UPDATE stages SET status = 'active', started_at = datetime('now') WHERE id = ?`).run(stage.id);
    db.prepare(`UPDATE machines SET status = 'running' WHERE batch_id = ?`).run(batchId);
  }

  let flagged = 0;
  let eventId = null;

  // Persist the submitted value onto the stage's operation_data under
  // the field this step writes to (falls back to the step key itself).
  const dataKey = step.field || step.key;
  if (step.type === 'totals' && step.fields) {
    data[step.key] = value; // value is an object { fieldKey: number, ... }
  } else if (step.type === 'checklist') {
    data[step.key] = value; // value is an object { itemKey: boolean, ... }
  } else {
    data[dataKey] = value;
  }

  // Evaluate operator inputs against formulation preconditions and write to step_scores
  const config = getSimulationConfig(batch.simulation_id);
  if (config.evaluationRubric && config.evaluationRubric.vmCheckpoints) {
    const checkpoint = config.evaluationRubric.vmCheckpoints.find(
      (cp) => cp.stage === role.stageName && cp.field === dataKey
    );
    if (checkpoint) {
      let passed = 0;
      let marksAwarded = 0;
      try {
        const fn = new Function('value', 'return ' + checkpoint.precondition);
        
        let evalVal = value;
        if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
          evalVal = Number(value);
        }
        
        const pass = fn(evalVal);
        if (pass) {
          passed = 1;
          marksAwarded = checkpoint.marks;
        } else {
          // If setup parameter fails precondition, block with a validation exception
          if (['set', 'select'].includes(step.type)) {
            throw new Error(`Recipe Validation Error: "${value}" does not match target. ${checkpoint.expectedBehavior}`);
          }
        }
      } catch (err) {
        console.error('Error evaluating precondition:', err);
        throw err;
      }

      db.prepare(`DELETE FROM step_scores WHERE batch_id = ? AND stage = ? AND field = ?`)
        .run(batchId, role.stageName, dataKey);

      db.prepare(`
        INSERT INTO step_scores (batch_id, stage, field, expected, actual, passed, marks_awarded, marks_max)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        batchId,
        role.stageName,
        dataKey,
        checkpoint.expectedBehavior || String(checkpoint.precondition),
        String(value),
        passed,
        marksAwarded,
        checkpoint.marks
      );
    }
  }

  // ---- Type-specific side effects -----------------------------------

  if (step.type === 'start') {
    db.prepare(`UPDATE machines SET status = 'running' WHERE batch_id = ?`).run(batchId);

    const config = getSimulationConfig(batch.simulation_id);
    eventId = maybeTriggerDefect(batchId, role.stageName, config);
    if (eventId) {
      db.prepare(`UPDATE events SET source = 'scripted' WHERE id = ?`).run(eventId);
    }
  }

  if (step.type === 'confirm' && step.compareTo) {
    const target = Number(data[step.compareTo] ?? step.target);
    const actual = Number(value);
    if (Number.isFinite(target) && Number.isFinite(actual) && target !== 0) {
      const pctOff = (Math.abs(actual - target) / target) * 100;
      if (pctOff > (step.tolerancePct ?? 5)) {
        flagged = 1;
        const { lastInsertRowid } = db
          .prepare(
            `INSERT INTO events (batch_id, stage_name, type, parameter, expected, actual, message, source)
             VALUES (?, ?, 'alarm', ?, ?, ?, ?, 'operator_reading')`
          )
          .run(
            batchId,
            role.stageName,
            step.field,
            target,
            actual,
            `${role.title}: ${step.label} outside tolerance — target ${target}${step.unit || ''}, actual ${actual}${step.unit || ''} (±${step.tolerancePct ?? 5}% limit).`
          );
        eventId = lastInsertRowid;
        logActivity(batchId, 'VM', 'alarm_triggered', `Operator reading breach: ${step.field}`);
      }
    }
  }

  if (step.type === 'totals' && step.derivedField && step.alarmAbovePct != null) {
    const total = Number(value[step.fields[0].key]) || 0;
    const rejected = Number(value[step.fields[1].key]) || 0;
    const rate = total > 0 ? (rejected / total) * 100 : 0;
    data[step.derivedField] = Number(rate.toFixed(2));
    if (rate > step.alarmAbovePct) {
      flagged = 1;
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO events (batch_id, stage_name, type, parameter, expected, actual, message, source)
           VALUES (?, ?, 'alarm', ?, ?, ?, ?, 'operator_reading')`
        )
        .run(
          batchId,
          role.stageName,
          step.derivedField,
          step.alarmAbovePct,
          data[step.derivedField],
          `${role.title}: defect rate ${data[step.derivedField]}% exceeds the ${step.alarmAbovePct}% limit.`
        );
      eventId = lastInsertRowid;
      logActivity(batchId, 'VM', 'alarm_triggered', 'Inspection defect rate breach');
    }
  }

  // A 'complete' step can't go through while there's an active unresolved quality event or deviation.
  if (step.type === 'complete') {
    // 1. Check if there are any unacknowledged alarms in the active stage
    const unresolvedAlarm = db
      .prepare(
        `SELECT * FROM events WHERE batch_id = ? AND stage_name = ? AND acknowledged = 0 ORDER BY id DESC LIMIT 1`
      )
      .get(batchId, role.stageName);
    if (unresolvedAlarm) {
      throw new Error('An unacknowledged alarm is open for this stage. Acknowledge/respond to it before completing.');
    }

    // 2. Check if there is an active quality deviation for this stage that hasn't been closed by QA release yet
    const activeDeviation = db
      .prepare(
        `SELECT d.* FROM deviations d 
         JOIN events e ON d.event_id = e.id
         WHERE e.batch_id = ? AND e.stage_name = ? AND d.significant = 1 AND d.status != 'closed'`
      )
      .get(batchId, role.stageName);
    if (activeDeviation) {
      throw new Error('This stage is locked on Quality Hold. QMS must complete the investigation, verify CAPA, and release the batch before you can transfer material.');
    }

    // 3. Also check if the event is reported but QMS triage hasn't decided significance yet
    const pendingTriage = db
      .prepare(
        `SELECT * FROM events WHERE batch_id = ? AND stage_name = ? AND type = 'alarm'
         AND id NOT IN (SELECT event_id FROM deviations) ORDER BY id DESC LIMIT 1`
      )
      .get(batchId, role.stageName);
    if (pendingTriage) {
      throw new Error('A quality deviation has been reported. Waiting for QMS SME to perform the Impact Assessment and determine quality significance.');
    }
  }

  db.prepare(`UPDATE stages SET operation_data = ? WHERE id = ?`).run(JSON.stringify(data), stage.id);

  db.prepare(
    `INSERT INTO stage_step_log (batch_id, stage_id, role_key, step_key, label, value_json, flagged)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(batchId, stage.id, role.key, step.key, step.label, JSON.stringify(value), flagged);

  logActivity(batchId, 'VM', `${role.key}_${step.key}`, typeof value === 'object' ? JSON.stringify(value) : String(value));

  // Advance or finish.
  if (step.type === 'complete') {
    db.prepare(`UPDATE stages SET status = 'completed', completed_at = datetime('now'), current_step = ? WHERE id = ?`)
      .run(stepIndex + 1, stage.id);
    db.prepare(`UPDATE machines SET status = 'stopped' WHERE batch_id = ?`).run(batchId);
    db.prepare(`UPDATE batches SET current_stage_order = ? WHERE id = ?`).run(role.order + 1, batchId);
    logActivity(batchId, 'VM', 'stage_completed', role.stageName);
  } else {
    db.prepare(`UPDATE stages SET current_step = ? WHERE id = ?`).run(stepIndex + 1, stage.id);
  }

  return {
    detail: getRoleStageDetail(batchId, role.key),
    eventId,
    flagged: !!flagged,
    fullState: getBatchState(batchId),
  };
}

// =====================================================================
// VM ROLE 10 — Machine Monitor / Support (wide-view dashboard)
// =====================================================================

// Everything the Machine Monitor needs: every stage's status/step
// progress, machine status, and every open/closed alarm, so it has the
// same wide view described in the document ("if the milling operator
// gets Temperature HIGH, the Machine Monitor also sees it").
function getMonitorOverview(batchId) {
  const state = getBatchState(batchId);

  const stageRoles = state.stages.map((stage) => {
    const role = roles.getRoleByStageName(stage.name);
    return {
      stageId: stage.id,
      roleKey: role ? role.key : null,
      roleTitle: role ? role.title : stage.name,
      stageName: stage.name,
      status: stage.status,
      currentStep: stage.current_step,
      totalSteps: role ? role.steps.length : null,
    };
  });

  const events = db
    .prepare('SELECT * FROM events WHERE batch_id = ? ORDER BY created_at DESC')
    .all(batchId);

  const notes = db
    .prepare('SELECT * FROM monitor_notes WHERE batch_id = ? ORDER BY created_at DESC')
    .all(batchId);

  return {
    batch: state.batch,
    machine: state.machine,
    stageRoles,
    events,
    unacknowledged: events.filter((e) => !e.acknowledged),
    notes,
  };
}

// Machine Monitor adds a support note, or escalates a specific alarm
// event (e.g. the assigned operator hasn't responded).
function addMonitorNote(batchId, eventId, note, type = 'support') {
  db.prepare(
    `INSERT INTO monitor_notes (batch_id, event_id, note, type) VALUES (?, ?, ?, ?)`
  ).run(batchId, eventId || null, note, type);

  if (type === 'escalation' && eventId) {
    db.prepare(`UPDATE events SET escalated = 1 WHERE id = ?`).run(eventId);
  }

  logActivity(batchId, 'VM-Monitor', type === 'escalation' ? 'monitor_escalation' : 'monitor_note', note);

  return getMonitorOverview(batchId);
}

module.exports = {
  createBatch,
  startStage,
  completeStage,
  getBatchState,
  listSimulations,
  logActivity,
  // Day 2
  getActiveEvent,
  operatorAction,
  getDeviationByEvent,
  getDeviation,
  submitImpactAssessment,
  submitInvestigation,
  getCapa,
  getCapaByDeviation,
  createCAPA,
  submitCapaFix,
  verifyCapa,
  releaseBatch,
  // VM 10-role panels
  listBatchRoles,
  getRoleStageDetail,
  submitStep,
  getMonitorOverview,
  addMonitorNote,
  // QMS 5-role panels
  listQmsRoles,
  getQmsRoleDetail,
  qmsMonitorReviewEvent,
  getQmsMonitorOverview,
  capaToggleAction,
  capaAddEvidence,
  capaSendForReview,
  qaReview,
  getQaReviewByCapa,
  // Demo skip shortcuts
  skipVmRole,
  skipQmsAll,
  skipAll,
};

// =====================================================================
// DEMO SKIP — Fast-forward through all remaining steps of a VM role
// bypassing the unacknowledged-alarm gate so demos aren't blocked.
// =====================================================================
function skipVmRole(batchId, roleKey) {
  const role = roles.getRoleByKey(roleKey);
  if (!role || role.key === 'monitor') throw new Error('Unknown process role');

  const batch = getBatch(batchId);
  if (!batch) throw new Error('Batch not found');

  const config = getSimulationConfig(batch.simulation_id);

  if (role.order > batch.current_stage_order) {
    throw new Error('This role is locked until earlier stages are completed.');
  }

  const stage = getStageByOrder(batchId, role.order);
  if (!stage) throw new Error('Stage not found for this role');
  if (stage.status === 'completed') throw new Error('This stage is already completed');

  // Auto-acknowledge any blocking alarms so the complete step succeeds
  db.prepare(
    `UPDATE events SET acknowledged = 1 WHERE batch_id = ? AND stage_name = ? AND acknowledged = 0`
  ).run(batchId, role.stageName);

  // Also close any open significant deviations for this stage so the 'complete' gate opens
  db.prepare(
    `UPDATE deviations SET status = 'closed' WHERE event_id IN (
       SELECT id FROM events WHERE batch_id = ? AND stage_name = ?
     ) AND status != 'closed'`
  ).run(batchId, role.stageName);

  let currentStepIndex = stage.current_step;
  let data = parseOperationData(stage);

  // Mark stage active if still pending
  if (stage.status === 'pending') {
    db.prepare(`UPDATE stages SET status = 'active', started_at = datetime('now') WHERE id = ?`).run(stage.id);
    db.prepare(`UPDATE machines SET status = 'running' WHERE batch_id = ?`).run(batchId);
  }

  // Walk through every remaining step and supply a sane default value
  while (currentStepIndex < role.steps.length) {
    const step = role.steps[currentStepIndex];
    let value;

    switch (step.type) {
      case 'info':
      case 'load':
      case 'start':
      case 'record':
        value = true;
        break;
      case 'select':
        value = step.options?.[0]?.value ?? true;
        break;
      case 'set': {
        const t = step.target ?? (step.fromSelectTarget ? null : 0);
        value = t != null ? t : 0;
        break;
      }
      case 'monitor':
      case 'confirm': {
        // Use the compareTo target so we don't trigger another alarm
        const refTarget = data[step.compareTo] ?? step.target ?? 0;
        value = Number(refTarget);
        break;
      }
      case 'totals':
        value = {};
        (step.fields || []).forEach((f) => {
          value[f.key] = f.target ?? 0;
        });
        break;
      case 'checklist':
        value = {};
        (step.items || []).forEach((item) => {
          value[item.key] = true;
        });
        break;
      case 'complete':
        value = true;
        break;
      default:
        value = true;
    }

    // Persist value
    const dataKey = step.field || step.key;
    if (step.type === 'totals' && step.fields) {
      data[step.key] = value;
    } else if (step.type === 'checklist') {
      data[step.key] = value;
    } else {
      data[dataKey] = value;
    }

    // Evaluate operator inputs against formulation preconditions and write to step_scores
    if (config.evaluationRubric && config.evaluationRubric.vmCheckpoints) {
      const checkpoint = config.evaluationRubric.vmCheckpoints.find(
        (cp) => cp.stage === role.stageName && cp.field === dataKey
      );
      if (checkpoint) {
        let passed = 0;
        let marksAwarded = 0;
        try {
          const fn = new Function('value', 'return ' + checkpoint.precondition);
          let evalVal = value;
          if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
            evalVal = Number(value);
          }
          const pass = fn(evalVal);
          if (pass) {
            passed = 1;
            marksAwarded = checkpoint.marks;
          }
        } catch (err) {
          console.error('Error evaluating precondition in skip:', err);
        }

        db.prepare(`DELETE FROM step_scores WHERE batch_id = ? AND stage = ? AND field = ?`)
          .run(batchId, role.stageName, dataKey);

        db.prepare(`
          INSERT INTO step_scores (batch_id, stage, field, expected, actual, passed, marks_awarded, marks_max)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          batchId,
          role.stageName,
          dataKey,
          checkpoint.expectedBehavior || String(checkpoint.precondition),
          String(value),
          passed,
          marksAwarded,
          checkpoint.marks
        );
      }
    }

    db.prepare(`UPDATE stages SET operation_data = ? WHERE id = ?`).run(JSON.stringify(data), stage.id);

    db.prepare(
      `INSERT INTO stage_step_log (batch_id, stage_id, role_key, step_key, label, value_json, flagged)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    ).run(batchId, stage.id, role.key, step.key, step.label, JSON.stringify(value));

    logActivity(batchId, 'VM-SKIP', `${role.key}_${step.key}`, '[demo skip]');

    if (step.type === 'complete') {
      db.prepare(`UPDATE stages SET status = 'completed', completed_at = datetime('now'), current_step = ? WHERE id = ?`)
        .run(currentStepIndex + 1, stage.id);
      db.prepare(`UPDATE machines SET status = 'stopped' WHERE batch_id = ?`).run(batchId);
      db.prepare(`UPDATE batches SET current_stage_order = ? WHERE id = ?`).run(role.order + 1, batchId);
      logActivity(batchId, 'VM-SKIP', 'stage_completed', role.stageName);
      break;
    } else {
      db.prepare(`UPDATE stages SET current_step = ? WHERE id = ?`).run(currentStepIndex + 1, stage.id);
      currentStepIndex++;
    }
  }

  return {
    detail: getRoleStageDetail(batchId, role.key),
    fullState: getBatchState(batchId),
  };
}

// =====================================================================
// DEMO SKIP — Auto-complete the entire QMS workflow for the current
// active alarm event (triage → SME → Investigation → CAPA → QA release).
// =====================================================================
function skipQmsAll(batchId) {
  const batch = getBatch(batchId);
  if (!batch) throw new Error('Batch not found');

  // Ensure there's an active event to process
  let activeEvent = getActiveEvent(batchId);

  // If no active event but there's an unacknowledged alarm, pick it up
  if (!activeEvent) {
    activeEvent = db.prepare(
      `SELECT * FROM events WHERE batch_id = ? AND type = 'alarm' ORDER BY id DESC LIMIT 1`
    ).get(batchId);
  }

  if (!activeEvent) {
    return { message: 'No active alarm event to resolve.', qmsRoles: listQmsRoles(batchId) };
  }

  const eventId = activeEvent.id;

  // Step 1: QMS Monitor — review & assign
  if (!activeEvent.reviewed_by_monitor) {
    db.prepare(`UPDATE events SET reviewed_by_monitor = 1, assigned_role = 'SME / Quality Reviewer' WHERE id = ?`)
      .run(eventId);
    logActivity(batchId, 'QMS-SKIP', 'event_reviewed_assigned', '[demo skip]');
  }

  // Step 2: SME — impact assessment (mark significant)
  let deviation = getDeviationByEvent(eventId);
  if (!deviation) {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO deviations (event_id, severity, product_impact, significant) VALUES (?, 'major', 'potential_impact', 1)`
    ).run(eventId);
    deviation = getDeviation(lastInsertRowid);
    logActivity(batchId, 'QMS-SKIP', 'impact_assessment', '[demo skip] major / SIGNIFICANT');
  }

  // Step 3: Investigation Officer — root cause
  if (!deviation.root_cause) {
    db.prepare(
      `UPDATE deviations SET
         description = ?, possible_causes = ?, evidence = ?, root_cause = ?,
         immediate_action = ?, proposed_corrective = ?, proposed_preventive = ?
       WHERE id = ?`
    ).run(
      '[Demo] Process parameter deviated from validated range.',
      '[Demo] Equipment calibration drift or operator error.',
      '[Demo] EBR log data and sensor readings reviewed.',
      '[Demo] Equipment calibration drift — root cause identified.',
      '[Demo] Process paused; material quarantined.',
      '[Demo] Recalibrate equipment and re-verify parameter.',
      '[Demo] Add bi-weekly calibration checks to PM schedule.',
      deviation.id
    );
    db.prepare(`UPDATE batches SET status = 'on_hold' WHERE id = ?`).run(batchId);
    deviation = getDeviation(deviation.id);
    logActivity(batchId, 'QMS-SKIP', 'investigation_submitted', '[demo skip]');
  }

  // Step 4: CAPA Coordinator — create CAPA + send for review
  let capa = getCapaByDeviation(deviation.id);
  if (!capa) {
    const items = JSON.stringify([
      { text: '[Demo] Recalibrate equipment', done: true },
      { text: '[Demo] Update PM schedule', done: true },
    ]);
    const { lastInsertRowid: capaId } = db.prepare(
      `INSERT INTO capas (deviation_id, corrective_action, preventive_action, status, action_items, sent_for_review, evidence)
       VALUES (?, ?, ?, 'open', ?, 1, ?)`
    ).run(
      deviation.id,
      '[Demo] Recalibrate equipment and re-verify parameter.',
      '[Demo] Bi-weekly calibration added to PM schedule.',
      items,
      '[Demo] Calibration certificate and PM schedule update attached.'
    );
    capa = getCapa(capaId);
    logActivity(batchId, 'QMS-SKIP', 'capa_created', '[demo skip]');
  }

  // Step 5: VM submits CAPA fix (auto submit corrected reading)
  if (capa.status === 'open' || !capa.fix_parameter) {
    const param = activeEvent.parameter || 'parameter';
    const expected = activeEvent.expected ?? 0;
    db.prepare(
      `UPDATE capas SET status = 'pending_verification', fix_parameter = ?, fix_before = ?, fix_after = ? WHERE id = ?`
    ).run(param, activeEvent.actual ?? 0, expected, capa.id);
    capa = getCapa(capa.id);
    // Also acknowledge the event so VM isn't blocked
    db.prepare(`UPDATE events SET acknowledged = 1 WHERE id = ?`).run(eventId);
    logActivity(batchId, 'QMS-SKIP', 'capa_fix_submitted', '[demo skip]');
  }

  // Step 6: CAPA Coordinator — verify effectiveness
  if (capa.status === 'pending_verification') {
    const expected = Number(activeEvent.expected ?? 0);
    const afterVal = Number(capa.fix_after ?? expected);
    db.prepare(
      `INSERT INTO verification_results (capa_id, parameter, expected, before_value, after_value, tolerance, passed)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).run(capa.id, activeEvent.parameter, expected, activeEvent.actual, afterVal, expected * 0.05);
    db.prepare(`UPDATE capas SET status = 'verified' WHERE id = ?`).run(capa.id);
    capa = getCapa(capa.id);
    logActivity(batchId, 'QMS-SKIP', 'capa_verified', '[demo skip] pass');
  }

  // Step 7: QA Reviewer — approve & release
  const qaReviewRow = getQaReviewByCapa(capa.id);
  if (!qaReviewRow || qaReviewRow.decision !== 'approved') {
    db.prepare(
      `INSERT INTO qa_reviews (capa_id, decision, comments) VALUES (?, 'approved', '[Demo skip] Auto-approved for demo.')`
    ).run(capa.id);
    // Release: close deviation + acknowledge event
    db.prepare(`UPDATE deviations SET status = 'closed' WHERE id = ?`).run(deviation.id);
    db.prepare(`UPDATE events SET acknowledged = 1 WHERE id = ?`).run(eventId);
    db.prepare(`UPDATE batches SET status = 'released' WHERE id = ?`).run(batchId);
    logActivity(batchId, 'QMS-SKIP', 'batch_released', '[demo skip] QA auto-approved');
  }

  return {
    message: 'QMS workflow auto-completed for demo.',
    qmsRoles: listQmsRoles(batchId),
    fullState: getBatchState(batchId),
  };
}

// =====================================================================
// DEMO SKIP ALL — Skips all remaining VM stages and QMS alarms,
// fast forwarding the entire simulation to the end.
// =====================================================================
function skipAll(batchId) {
  const batch = getBatch(batchId);
  if (!batch) throw new Error('Batch not found');

  // 1. Resolve any currently active QMS issues first
  skipQmsAll(batchId);

  // 2. Loop through all 9 stages sequentially
  const allRoles = roles.getAllRoles();
  for (const role of allRoles) {
    if (role.key === 'monitor') continue;

    // Check the current state of the stage
    const stage = getStageByOrder(batchId, role.order);
    if (stage && stage.status !== 'completed') {
      // Skip this VM role
      skipVmRole(batchId, role.key);
      
      // If skipping the VM role triggered an alarm/defect, auto-resolve it immediately
      skipQmsAll(batchId);
    }
  }

  // 3. Return full state
  return {
    message: 'Simulation skipped to completion.',
    qmsRoles: listQmsRoles(batchId),
    fullState: getBatchState(batchId),
  };
}