const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const engine = require('./batchEngine');
const roles = require('./roles');
const qmsRoles = require('./qmsRoles');
const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*'
  }
});


// =====================================================
// SOCKET.IO
// =====================================================

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});


// =====================================================
// SHARED BATCH STATE
// =====================================================

// Both VM and QMS panels receive the same batch state.
function broadcastState(batchId) {
  const state = engine.getBatchState(batchId);

  io.emit('batch:update', state);

  return state;
}

// Broadcasts the 5-role QMS grid's lock/status state, so the QMS role
// grid updates live for every connected client the moment any QMS (or
// VM alarm) action changes which roles are locked/active/completed —
// this is the VM<->QMS "proper communication" channel: neither side
// has to poll or refresh to see the other side's progress.
function broadcastQmsRoles(batchId) {
  const qmsRolesState = engine.listQmsRoles(batchId);
  io.emit('qms:roles', { batchId, qmsRoles: qmsRolesState });
  return qmsRolesState;
}


// =====================================================
// DAY 1 — SIMULATION & BATCH ROUTES
// =====================================================


// Get available simulations
app.get('/api/simulations', (req, res) => {
  try {
    res.json(engine.listSimulations());
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// Create a new batch
app.post('/api/batches', (req, res) => {
  try {
    const { simulationId } = req.body;

    const state = engine.createBatch(simulationId);

    io.emit('batch:update', state);

    res.status(201).json(state);
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
});


// Get complete batch state
app.get('/api/batches/:id', (req, res) => {
  try {
    const batchId = Number(req.params.id);

    res.json(
      engine.getBatchState(batchId)
    );
  } catch (err) {
    res.status(404).json({
      error: err.message
    });
  }
});


// Start a manufacturing stage
app.post('/api/batches/:id/stages/:stageId/start', (req, res) => {
  try {
    const batchId = Number(req.params.id);
    const stageId = Number(req.params.stageId);

    const result = engine.startStage(
      batchId,
      stageId
    );

    // If a defect was triggered, notify the frontend
    if (result.eventId) {
      const event = engine.getActiveEvent(batchId);

      if (event) {
        io.emit('batch:alarm', {
          batchId,
          event
        });
        broadcastQmsRoles(batchId);
      }
    }

    const state = broadcastState(batchId);

    res.json(state);

  } catch (err) {

    res.status(400).json({
      error: err.message
    });

  }
});


// Complete a manufacturing stage
app.post('/api/batches/:id/stages/:stageId/complete', (req, res) => {
  try {
    const batchId = Number(req.params.id);
    const stageId = Number(req.params.stageId);

    engine.completeStage(batchId, stageId);

    res.json(
      broadcastState(batchId)
    );
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
});


// =====================================================
// DAY 2 — VM ALARM RESPONSE
// =====================================================


// VM operator responds to an active alarm
//
// Possible actions:
// acknowledge
// adjust
// pause
// stop
// resume
// report

app.post('/api/batches/:id/actions', (req, res) => {
  try {
    const batchId = Number(req.params.id);

    const {
      eventId,
      action,
      detail
    } = req.body;

    const state = engine.operatorAction(
      batchId,
      eventId,
      action,
      detail || ''
    );

    io.emit('batch:update', state);

    res.json(state);

  } catch (err) {

    res.status(400).json({
      error: err.message
    });

  }
});


// =====================================================
// DAY 2 — QMS EVENT
// =====================================================


// Get active/unresolved event for a batch

app.get('/api/batches/:id/events/active', (req, res) => {
  try {

    const batchId = Number(req.params.id);

    const event = engine.getActiveEvent(batchId);

    res.json(event || null);

  } catch (err) {

    res.status(400).json({
      error: err.message
    });

  }
});


// =====================================================
// DAY 2 — QMS IMPACT ASSESSMENT
// =====================================================


// Create/update deviation from alarm event

app.post('/api/deviations/impact-assessment', (req, res) => {

  try {

    const {
      eventId,
      batchId,
      severity,
      productImpact,
      significant,
      notes
    } = req.body;

    const deviation =
      engine.submitImpactAssessment(
        eventId,
        batchId,
        severity,
        productImpact,
        significant,
        notes
      );

    broadcastState(batchId);
    broadcastQmsRoles(batchId);

    res.json(deviation);

  } catch (err) {

    res.status(400).json({
      error: err.message
    });

  }

});


// =====================================================
// DAY 2 — QMS INVESTIGATION
// =====================================================


// Submit investigation
// This also places the batch ON HOLD.

app.post('/api/deviations/investigation', (req, res) => {

  try {

    const {
      deviationId,
      batchId,
      whatHappened,
      possibleCauses,
      evidence,
      rootCause,
      immediateAction,
      proposedCorrective,
      proposedPreventive
    } = req.body;

    const result =
      engine.submitInvestigation(
        deviationId,
        batchId,
        {
          whatHappened,
          possibleCauses,
          evidence,
          rootCause,
          immediateAction,
          proposedCorrective,
          proposedPreventive
        }
      );

    broadcastState(batchId);
    broadcastQmsRoles(batchId);

    res.json(result);

  } catch (err) {

    res.status(400).json({
      error: err.message
    });

  }

});


// =====================================================
// DAY 2 — CAPA
// =====================================================


// Create CAPA

app.post('/api/capas', (req, res) => {

  try {

    const {
      deviationId,
      batchId,
      correctiveAction,
      preventiveAction,
      actionItems
    } = req.body;

    const capa =
      engine.createCAPA(
        deviationId,
        batchId,
        correctiveAction,
        preventiveAction,
        actionItems
      );

    broadcastState(batchId);
    broadcastQmsRoles(batchId);

    res.json(capa);

  } catch (err) {

    res.status(400).json({
      error: err.message
    });

  }

});


// =====================================================
// DAY 3 — CAPA FIX
// =====================================================


// VM submits corrected process reading

app.post('/api/capas/:id/fix', (req, res) => {

  try {

    const capaId = Number(req.params.id);

    const {
      batchId,
      parameter,
      beforeValue,
      afterValue
    } = req.body;

    const result =
      engine.submitCapaFix(
        capaId,
        batchId,
        parameter,
        beforeValue,
        afterValue
      );

    broadcastState(batchId);
    broadcastQmsRoles(batchId);
    io.emit('qms:update', { batchId, roleKey: 'capa_coordinator' });

    res.json(result);

  } catch (err) {

    res.status(400).json({
      error: err.message
    });

  }

});


// =====================================================
// DAY 3 — CAPA VERIFICATION
// =====================================================


// QMS verifies whether the corrective action worked

app.post('/api/capas/:id/verify', (req, res) => {

  try {

    const capaId = Number(req.params.id);

    const {
      batchId,
      parameter,
      expected,
      beforeValue,
      afterValue,
      tolerance
    } = req.body;

    const result =
      engine.verifyCapa(
        capaId,
        batchId,
        parameter,
        expected,
        beforeValue,
        afterValue,
        tolerance
      );

    broadcastState(batchId);
    broadcastQmsRoles(batchId);

    res.json(result);

  } catch (err) {

    res.status(400).json({
      error: err.message
    });

  }

});


// =====================================================
// DAY 3 — BATCH RELEASE
// =====================================================


// Release batch after CAPA verification

app.post('/api/batches/:id/release', (req, res) => {

  try {

    const batchId = Number(req.params.id);

    const {
      capaId
    } = req.body;

    const batch =
      engine.releaseBatch(
        batchId,
        capaId
      );

    broadcastState(batchId);
    broadcastQmsRoles(batchId);

    res.json(batch);

  } catch (err) {

    res.status(400).json({
      error: err.message
    });

  }

});


// =====================================================
// VM ROLE PANELS — 10-role technical step flow
// =====================================================

// Static list of all 10 VM role definitions (labels/icons/step lists).
// Used by the frontend to know what a role looks like before any batch
// exists.
app.get('/api/roles', (req, res) => {
  try {
    res.json(roles.getAllRoles());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// The 10-role grid for a specific batch: progress/lock state per role,
// rendered inside the VM panel.
app.get('/api/batches/:id/roles', (req, res) => {
  try {
    const batchId = Number(req.params.id);
    res.json(engine.listBatchRoles(batchId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all evaluation step scores for a batch
app.get('/api/batches/:id/scores', (req, res) => {
  try {
    const batchId = Number(req.params.id);
    const scores = db.prepare('SELECT * FROM step_scores WHERE batch_id = ? ORDER BY id ASC').all(batchId);
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full detail needed to render one role's dedicated operator panel
// (its stage, accumulated operation data, step log, and any active
// alarm for that stage).
app.get('/api/batches/:id/roles/:roleKey', (req, res) => {
  try {
    const batchId = Number(req.params.id);
    const { roleKey } = req.params;
    res.json(engine.getRoleStageDetail(batchId, roleKey));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Operator submits one technical step of their role's workflow
// (identify material, set a parameter, confirm a reading, complete...).
app.post('/api/batches/:id/roles/:roleKey/steps', (req, res) => {
  try {
    const batchId = Number(req.params.id);
    const { roleKey } = req.params;
    const { stepKey, value } = req.body;

    const result = engine.submitStep(batchId, roleKey, stepKey, value);

    if (result.eventId) {
      io.emit('batch:alarm', {
        batchId,
        event: engine.getActiveEvent(batchId),
      });
      broadcastQmsRoles(batchId);
    }

    io.emit('batch:update', result.fullState);
    io.emit('role:update', { batchId, roleKey, detail: result.detail });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// =====================================================
// QMS ROLE PANELS — 5-role step flow
// =====================================================
// Same "dedicated panel INSIDE the same panel" pattern as the VM's
// 10-role grid: the frontend swaps between the QMS role grid and one
// role's dedicated panel, all inside the single QMS top-level panel.

// Static list of all 5 QMS role definitions (labels/icons/responsibilities).
app.get('/api/qms-roles', (req, res) => {
  try {
    res.json(qmsRoles.getAllQmsRoles());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// The 5-role grid for a specific batch: lock/active/completed state,
// derived from the current event's deviation/CAPA/QA-review progress.
app.get('/api/batches/:id/qms-roles', (req, res) => {
  try {
    const batchId = Number(req.params.id);
    res.json(engine.listQmsRoles(batchId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Full detail needed to render one QMS role's dedicated panel.
app.get('/api/batches/:id/qms-roles/:roleKey', (req, res) => {
  try {
    const batchId = Number(req.params.id);
    const { roleKey } = req.params;
    res.json(engine.getQmsRoleDetail(batchId, roleKey));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---- QMS Role 11 — QMS Monitor: triage + assign the event to SME ----
app.post('/api/batches/:id/qms/monitor/review', (req, res) => {
  try {
    const batchId = Number(req.params.id);
    const { eventId, note } = req.body;

    const overview = engine.qmsMonitorReviewEvent(batchId, eventId, note);

    broadcastState(batchId);
    const qmsRolesState = broadcastQmsRoles(batchId);
    io.emit('qms:update', { batchId, roleKey: 'qms_monitor' });
    io.emit('qms:update', { batchId, roleKey: 'sme' }); // SME just unlocked

    res.json({ overview, qmsRoles: qmsRolesState });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---- QMS Role 14 — CAPA Coordinator: track / evidence / send ----
app.post('/api/capas/:id/actions/:index/toggle', (req, res) => {
  try {
    const capaId = Number(req.params.id);
    const itemIndex = Number(req.params.index);
    const { batchId } = req.body;

    const capa = engine.capaToggleAction(capaId, batchId, itemIndex);

    broadcastState(batchId);
    io.emit('qms:update', { batchId, roleKey: 'capa_coordinator' });

    res.json(capa);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/capas/:id/evidence', (req, res) => {
  try {
    const capaId = Number(req.params.id);
    const { batchId, evidence } = req.body;

    const capa = engine.capaAddEvidence(capaId, batchId, evidence);

    broadcastState(batchId);
    io.emit('qms:update', { batchId, roleKey: 'capa_coordinator' });

    res.json(capa);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/capas/:id/send-for-review', (req, res) => {
  try {
    const capaId = Number(req.params.id);
    const { batchId } = req.body;

    const capa = engine.capaSendForReview(capaId, batchId);

    broadcastState(batchId);
    io.emit('qms:update', { batchId, roleKey: 'capa_coordinator' });
    // The VM's "Submit Corrected Reading" card is gated on this — tell
    // the VM panel directly so it lights up without a manual refresh.
    io.emit('vm:capa_ready', { batchId, capa });

    res.json(capa);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---- QMS Role 15 — QA Reviewer: approve / return ----
app.post('/api/qa-review', (req, res) => {
  try {
    const { batchId, capaId, decision, comments } = req.body;

    const result = engine.qaReview(batchId, capaId, decision, comments);

    broadcastState(batchId);
    const qmsRolesState = broadcastQmsRoles(batchId);
    io.emit('qms:update', { batchId, roleKey: 'qa_reviewer' });
    if (decision === 'returned') {
      io.emit('qms:update', { batchId, roleKey: 'capa_coordinator' });
    }

    res.json({ ...result, qmsRoles: qmsRolesState });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// =====================================================
// VM ROLE 10 — Machine Monitor / Support
// =====================================================

app.get('/api/batches/:id/monitor', (req, res) => {
  try {
    const batchId = Number(req.params.id);
    res.json(engine.getMonitorOverview(batchId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/batches/:id/monitor/notes', (req, res) => {
  try {
    const batchId = Number(req.params.id);
    const { eventId, note, type } = req.body;
    const overview = engine.addMonitorNote(batchId, eventId, note, type);
    io.emit('monitor:update', { batchId, overview });
    res.json(overview);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// =====================================================
// DEMO SKIP — Skip a VM role to completion instantly
// =====================================================

app.post('/api/batches/:id/roles/:roleKey/skip', (req, res) => {
  try {
    const batchId = Number(req.params.id);
    const { roleKey } = req.params;

    const result = engine.skipVmRole(batchId, roleKey);

    io.emit('batch:update', result.fullState);
    io.emit('role:update', { batchId, roleKey, detail: result.detail });
    broadcastQmsRoles(batchId);

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// =====================================================
// DEMO SKIP — Skip the entire QMS workflow
// =====================================================

app.post('/api/batches/:id/qms/skip', (req, res) => {
  try {
    const batchId = Number(req.params.id);

    const result = engine.skipQmsAll(batchId);

    broadcastState(batchId);
    broadcastQmsRoles(batchId);

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// =====================================================
// DEMO SKIP — Skip everything (VM stages + QMS alarms)
// =====================================================

app.post('/api/batches/:id/skip-all', (req, res) => {
  try {
    const batchId = Number(req.params.id);

    const result = engine.skipAll(batchId);

    broadcastState(batchId);
    broadcastQmsRoles(batchId);

    res.json(result);
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
});


// =====================================================
// SERVER
// =====================================================

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {

  console.log(
    `JSS Pharma Sim server running on http://localhost:${PORT}`
  );

});