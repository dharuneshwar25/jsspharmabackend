import { create } from 'zustand';
import { io } from 'socket.io-client';
import * as api from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const socket = io(API_BASE_URL);

export const useSimStore = create((set, get) => ({

  qmsScores: {},
  recordQuizScore: (eventId, selectedOptionValue, score, maxScore) => {
    set((state) => ({
      qmsScores: {
        ...state.qmsScores,
        [eventId]: { selectedOptionValue, score, maxScore }
      }
    }));
  },

  // =====================================================
  // CORE STATE
  // =====================================================

  simulations: [],
  batchState: null,

  activePanel: 'vm',

  loading: false,
  error: null,


  // =====================================================
  // DAY 2 — ALARM / QMS STATE
  // =====================================================

  activeEvent: null,
  alarmActive: false,

  deviation: null,
  investigation: null,
  capa: null,
  capaFix: null,
  verification: null,


  // =====================================================
  // VM ROLE PANELS — 10-role technical step flow
  // =====================================================

  // Static definitions (labels/icons/step lists) for all 10 roles.
  roleDefinitions: [],

  // Per-batch progress/lock state for the 10-role grid inside the VM panel.
  batchRoles: [],

  // Which role's dedicated panel is currently open inside the VM panel.
  // null = showing the role selection grid.
  selectedRoleKey: null,

  // Full detail (stage, operation_data, step log, active alarm) for the
  // currently open role panel.
  roleDetail: null,
  roleDetailLoading: false,

  // Role 10 — Machine Monitor dashboard data.
  monitorData: null,


  // =====================================================
  // QMS ROLE PANELS — 5-role step flow
  // =====================================================

  // Static definitions (labels/icons/responsibilities) for all 5 roles.
  qmsRoleDefinitions: [],

  // Per-batch lock/active/completed state for the 5-role grid inside
  // the QMS panel.
  qmsBatchRoles: [],

  // Which QMS role's dedicated panel is open inside the QMS panel.
  // null = showing the 5-role selection grid.
  selectedQmsRoleKey: null,

  // Full detail for the currently open QMS role panel.
  qmsRoleDetail: null,
  qmsRoleDetailLoading: false,


  // =====================================================
  // INITIALIZE SOCKET CONNECTION
  // =====================================================

  init: async () => {
    try {
      const [simulations, roleDefinitions, qmsRoleDefinitions] = await Promise.all([
        api.fetchSimulations(),
        api.fetchAllRoleDefinitions(),
        api.fetchAllQmsRoleDefinitions(),
      ]);
      set({ simulations, roleDefinitions, qmsRoleDefinitions });

      socket.off('batch:update');
      socket.off('batch:alarm');
      socket.off('role:update');
      socket.off('monitor:update');
      socket.off('qms:roles');
      socket.off('qms:update');
      socket.off('vm:capa_ready');

      socket.on('batch:update', (state) => {
        set({ batchState: state });
        // Batch-wide state changed (stage completed, batch released...) —
        // keep both the VM 10-role grid AND the QMS 5-role grid in sync.
        const batchId = state?.batch?.id;
        if (batchId) {
          api.fetchBatchRoles(batchId).then((batchRoles) => set({ batchRoles })).catch(() => {});
          api.fetchQmsRoles(batchId).then((qmsBatchRoles) => set({ qmsBatchRoles })).catch(() => {});
        }
      });

      socket.on('batch:alarm', ({ event }) => {
        console.log('🚨 ALARM RECEIVED:', event);
        set({ activeEvent: event, alarmActive: true });
        get().playAlarmSound();
        // Refresh QMS panels so the alarm is displayed live
        get().refreshQmsRoles();
        get().refreshQmsRoleDetail();
      });

      socket.on('role:update', ({ roleKey, detail }) => {
        // Live-refresh an open VM role panel if another client/session
        // acts on the same batch.
        if (get().selectedRoleKey === roleKey) {
          set({ roleDetail: detail });
        }
      });

      socket.on('monitor:update', ({ overview }) => {
        if (get().selectedRoleKey === 'monitor') {
          set({ monitorData: overview });
        }
      });

      // ---- QMS <-> VM live communication channel ----
      // The 5-role grid's lock/active/completed state changed (an alarm
      // fired, an assessment was submitted, a CAPA moved forward...).
      // Refresh the grid, and if the currently open QMS role panel is
      // affected, refresh its detail too so nobody has to hit refresh.
      socket.on('qms:roles', ({ qmsRoles }) => {
        set({ qmsBatchRoles: qmsRoles });
      });

      socket.on('qms:update', ({ roleKey }) => {
        const batchId = get().batchState?.batch?.id;
        if (!batchId) return;
        if (get().selectedQmsRoleKey === roleKey) {
          api.fetchQmsRoleDetail(batchId, roleKey).then((qmsRoleDetail) => set({ qmsRoleDetail })).catch(() => {});
        }
      });

      // CAPA Coordinator finished preparing the corrective action and
      // sent it to VM — the VM panel's "Submit Corrected Reading" card
      // reacts immediately, without the VM operator refreshing anything.
      socket.on('vm:capa_ready', ({ capa }) => {
        set({ capa });
      });
    } catch (err) {
      set({
        simulations: [
          { id: 'paracetamol-500', name: 'Paracetamol 500 mg' },
          { id: 'amoxicillin-250', name: 'Amoxicillin 250 mg' },
          { id: 'ibuprofen-400', name: 'Ibuprofen 400 mg' }
        ],
        error: null
      });
    }
  },


  // =====================================================
  // ALARM SOUND
  // =====================================================
  // Synthesized beep (Web Audio API — no external asset needed) so the
  // alarm is audible, not just visual, matching "the proper alarm must
  // work" requirement. Plays a short two-tone siren pattern.
  playAlarmSound: () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const beep = (start, freq, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.15, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      };

      // Two-tone siren, repeated 3 times.
      for (let i = 0; i < 3; i++) {
        beep(i * 0.5, 880, 0.22);
        beep(i * 0.5 + 0.25, 660, 0.22);
      }

      // AudioContext auto-closes stray connections once GC'd; explicitly
      // close it after the pattern finishes to avoid leaking contexts.
      setTimeout(() => ctx.close().catch(() => {}), 2200);
    } catch {
      // Audio not available (e.g. autoplay policy blocked it before any
      // user interaction) — the visual alarm banner still works.
    }
  },


  // =====================================================
  // CREATE NEW BATCH
  // =====================================================

  startNewBatch: async (simulationId) => {
    set({
      loading: true,
      error: null,

      // Clear previous alarm/QMS data
      activeEvent: null,
      alarmActive: false,
      deviation: null,
      investigation: null,
      capa: null,
      capaFix: null,
      verification: null,

      // Clear previous role-panel state so a new batch starts back at
      // the 10-role selection grid.
      selectedRoleKey: null,
      roleDetail: null,
      monitorData: null,
      batchRoles: [],

      // Clear previous QMS role-panel state.
      selectedQmsRoleKey: null,
      qmsRoleDetail: null,
      qmsBatchRoles: [],
    });

    try {
      const state = await api.createBatch(simulationId);
      const [batchRoles, qmsBatchRoles] = await Promise.all([
        api.fetchBatchRoles(state.batch.id),
        api.fetchQmsRoles(state.batch.id),
      ]);
      set({ batchState: state, batchRoles, qmsBatchRoles, loading: false });
    } catch (err) {
      const fallbackState = {
        batch: { id: 904, simulation_id: simulationId, status: 'in_process', current_stage_order: 3 },
        stages: [
          { id: 1, name: 'Dispensing', stage_order: 1, status: 'completed' },
          { id: 2, name: 'Milling', stage_order: 2, status: 'completed' },
          { id: 3, name: 'Granulation', stage_order: 3, status: 'active' },
          { id: 4, name: 'Drying', stage_order: 4, status: 'pending' },
          { id: 5, name: 'Blending', stage_order: 5, status: 'pending' },
          { id: 6, name: 'Compression', stage_order: 6, status: 'pending' },
          { id: 7, name: 'Coating', stage_order: 7, status: 'pending' },
          { id: 8, name: 'Inspection', stage_order: 8, status: 'pending' },
          { id: 9, name: 'Packaging', stage_order: 9, status: 'pending' }
        ],
        machine: { status: 'running' }
      };

      const fallbackBatchRoles = [
        { key: 'dispensing', title: 'Dispensing Chemist', status: 'completed' },
        { key: 'milling', title: 'Milling Technician', status: 'completed' },
        { key: 'granulation', title: 'Granulation Specialist', status: 'active' },
        { key: 'drying', title: 'Drying Technician', status: 'locked' },
        { key: 'blending', title: 'Blender Operator', status: 'locked' },
        { key: 'compression', title: 'Compression Specialist', status: 'locked' },
        { key: 'coating', title: 'Coating Specialist', status: 'locked' },
        { key: 'inspection', title: 'Quality Inspector', status: 'locked' },
        { key: 'packaging', title: 'Packaging Lead', status: 'locked' },
        { key: 'monitor', title: 'Machine Monitor', status: 'active' }
      ];

      const fallbackQmsRoles = [
        { key: 'qms_monitor', title: 'QMS Triage Monitor', status: 'active' },
        { key: 'sme', title: 'Subject Matter Expert', status: 'locked' },
        { key: 'investigation_officer', title: 'Investigation Officer', status: 'locked' },
        { key: 'capa_coordinator', title: 'CAPA Coordinator', status: 'locked' },
        { key: 'qa_reviewer', title: 'QA Release Manager', status: 'locked' }
      ];

      set({
        batchState: fallbackState,
        batchRoles: fallbackBatchRoles,
        qmsBatchRoles: fallbackQmsRoles,
        loading: false,
        error: null
      });
    }
  },


  // =====================================================
  // START / COMPLETE STAGE
  // =====================================================

  startStage: async (stageId) => {
    const batchId = get().batchState?.batch.id;
    if (!batchId) return;

    try {
      const state = await api.startStage(batchId, stageId);
      set({ batchState: state });
    } catch (err) {
      set({ error: err.message });
    }
  },

  completeStage: async (stageId) => {
    const batchId = get().batchState?.batch.id;
    if (!batchId) return;

    try {
      const state = await api.completeStage(batchId, stageId);
      set({ batchState: state });
    } catch (err) {
      set({ error: err.message });
    }
  },


  // =====================================================
  // DAY 2 — VM OPERATOR ACTION
  // =====================================================

  operatorAction: async (batchId, eventId, action, detail = '') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/batches/${batchId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, action, detail }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Operator action failed');
      }

      const state = await response.json();
      set({ batchState: state });

      if (['acknowledge', 'pause', 'stop', 'report'].includes(action)) {
        set({ alarmActive: false });
        if (get().activeEvent) {
          set({ activeEvent: { ...get().activeEvent, acknowledged: 1 } });
        }
      }

      // Automatically sync active operator panel workspace state
      const roleKey = get().selectedRoleKey;
      if (roleKey && roleKey !== 'monitor') {
        const roleDetail = await api.fetchRoleDetail(batchId, roleKey);
        set({ roleDetail });
      }
    } catch (err) {
      set({ error: err.message });
    }
  },


  // =====================================================
  // DAY 2 — QMS IMPACT ASSESSMENT
  // =====================================================

  submitImpactAssessment: async (eventId, batchId, severity, productImpact, significant, notes) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deviations/impact-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, batchId, severity, productImpact, significant, notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Impact assessment failed');
      }

      const deviation = await response.json();
      set({ deviation });
      await get().refreshQmsRoleDetail();
      return deviation;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },


  // =====================================================
  // DAY 2 — QMS INVESTIGATION
  // =====================================================

  submitInvestigation: async (deviationId, batchId, fields) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deviations/investigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviationId, batchId, ...fields }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Investigation submission failed');
      }

      const result = await response.json(); // { deviation, batch }
      set({
        investigation: result,
        deviation: result.deviation,
      });
      await get().refreshQmsRoleDetail();
      return result;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },


  // =====================================================
  // DAY 2 — CAPA CREATION
  // =====================================================

  createCAPA: async (deviationId, batchId, correctiveAction, preventiveAction, actionItems = []) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/capas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviationId, batchId, correctiveAction, preventiveAction, actionItems }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'CAPA creation failed');
      }

      const capa = await response.json();
      set({ capa, capaFix: null, verification: null });
      await get().refreshQmsRoleDetail();
      return capa;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },


  // =====================================================
  // VM CAPA FIX
  // =====================================================

  submitCapaFix: async (capaId, batchId, parameter, beforeValue, afterValue) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/capas/${capaId}/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, parameter, beforeValue, afterValue }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'CAPA fix submission failed');
      }

      const capa = await response.json();
      set({
        capa,
        capaFix: { parameter, beforeValue, afterValue },
        verification: null,
      });
      await get().refreshQmsRoleDetail();
      return capa;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },


  // =====================================================
  // QMS CAPA VERIFICATION
  // =====================================================

  verifyCapa: async (capaId, batchId, parameter, expected, beforeValue, afterValue, tolerance) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/capas/${capaId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, parameter, expected, beforeValue, afterValue, tolerance }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'CAPA verification failed');
      }

      const verification = await response.json(); // { passed, expected, afterValue, tolerance }

      set((state) => ({
        verification,
        capa: state.capa
          ? { ...state.capa, status: verification.passed ? 'verified' : 'failed' }
          : state.capa,
      }));

      await get().refreshQmsRoleDetail();

      return verification;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },


  // =====================================================
  // BATCH RELEASE
  // =====================================================

  releaseBatch: async (batchId, capaId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/batches/${batchId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capaId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Batch release failed');
      }

      const batch = await response.json();

      // Cycle complete — clear the event/QMS workflow so both panels return
      // to a clean state and the VM can continue the remaining stages.
      set({
        activeEvent: null,
        alarmActive: false,
        deviation: null,
        investigation: null,
        capa: null,
        capaFix: null,
        verification: null,
      });

      return batch;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },


  // =====================================================
  // PANEL SWITCHING
  // =====================================================

  setActivePanel: (panel) => {
    set({ activePanel: panel });
  },


  // =====================================================
  // VM ROLE PANELS — open/close a role's dedicated panel
  // =====================================================

  // Opens role's dedicated panel INSIDE the VM panel (does not touch
  // activePanel — this is a sub-view of the VM panel, never a
  // separate top-level panel).
  openRole: async (roleKey) => {
    set({ selectedRoleKey: roleKey, roleDetail: null, monitorData: null, roleDetailLoading: true, error: null });

    const batchId = get().batchState?.batch?.id;
    if (!batchId) {
      set({ roleDetailLoading: false });
      return;
    }

    try {
      if (roleKey === 'monitor') {
        const monitorData = await api.fetchMonitorOverview(batchId);
        set({ monitorData, roleDetailLoading: false });
      } else {
        const detail = await api.fetchRoleDetail(batchId, roleKey);
        set({ roleDetail: detail, roleDetailLoading: false });
      }
    } catch (err) {
      set({ error: err.message, roleDetailLoading: false });
    }
  },

  // Back to the 10-role selection grid.
  closeRole: () => {
    set({ selectedRoleKey: null, roleDetail: null, monitorData: null });
  },

  // Operator submits one technical step of the open role's workflow.
  submitRoleStep: async (stepKey, value) => {
    const batchId = get().batchState?.batch?.id;
    const roleKey = get().selectedRoleKey;
    if (!batchId || !roleKey) return null;

    try {
      const result = await api.submitRoleStep(batchId, roleKey, stepKey, value);
      set({ roleDetail: result.detail });

      const batchRoles = await api.fetchBatchRoles(batchId);
      set({ batchRoles });

      if (result.eventId && result.detail?.activeEvent) {
        set({ activeEvent: result.detail.activeEvent, alarmActive: true });
      }

      return result;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  refreshBatchRoles: async () => {
    const batchId = get().batchState?.batch?.id;
    if (!batchId) return;
    try {
      const batchRoles = await api.fetchBatchRoles(batchId);
      set({ batchRoles });
    } catch (err) {
      set({ error: err.message });
    }
  },


  // =====================================================
  // VM ROLE 10 — Machine Monitor / Support
  // =====================================================

  refreshMonitor: async () => {
    const batchId = get().batchState?.batch?.id;
    if (!batchId) return;
    try {
      const monitorData = await api.fetchMonitorOverview(batchId);
      set({ monitorData });
    } catch (err) {
      set({ error: err.message });
    }
  },

  addMonitorNote: async (eventId, note, type = 'support') => {
    const batchId = get().batchState?.batch?.id;
    if (!batchId) return;
    try {
      const monitorData = await api.postMonitorNote(batchId, eventId, note, type);
      set({ monitorData });
      return monitorData;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },


  // =====================================================
  // QMS ROLE PANELS — open/close a role's dedicated panel
  // =====================================================

  // Opens a QMS role's dedicated panel INSIDE the QMS panel — mirrors
  // openRole() for VM. Never touches activePanel: this is always a
  // sub-view of the QMS panel, never a separate top-level panel.
  openQmsRole: async (roleKey) => {
    set({ selectedQmsRoleKey: roleKey, qmsRoleDetail: null, qmsRoleDetailLoading: true, error: null });

    const batchId = get().batchState?.batch?.id;
    if (!batchId) {
      set({ qmsRoleDetailLoading: false });
      return;
    }

    try {
      const detail = await api.fetchQmsRoleDetail(batchId, roleKey);
      set({ qmsRoleDetail: detail, qmsRoleDetailLoading: false });
    } catch (err) {
      set({ error: err.message, qmsRoleDetailLoading: false });
    }
  },

  // Back to the 5-role selection grid.
  closeQmsRole: () => {
    set({ selectedQmsRoleKey: null, qmsRoleDetail: null });
  },

  refreshQmsRoles: async () => {
    const batchId = get().batchState?.batch?.id;
    if (!batchId) return;
    try {
      const qmsBatchRoles = await api.fetchQmsRoles(batchId);
      set({ qmsBatchRoles });
    } catch (err) {
      set({ error: err.message });
    }
  },

  refreshQmsRoleDetail: async () => {
    const batchId = get().batchState?.batch?.id;
    const roleKey = get().selectedQmsRoleKey;
    if (!batchId || !roleKey) return;
    try {
      const qmsRoleDetail = await api.fetchQmsRoleDetail(batchId, roleKey);
      set({ qmsRoleDetail });
    } catch (err) {
      set({ error: err.message });
    }
  },


  // =====================================================
  // QMS ROLE 11 — QMS Monitor: triage + assign
  // =====================================================

  qmsMonitorReview: async (eventId, note) => {
    const batchId = get().batchState?.batch?.id;
    if (!batchId) return;
    try {
      const result = await api.qmsMonitorReview(batchId, eventId, note);
      set({ qmsBatchRoles: result.qmsRoles });
      await get().refreshQmsRoleDetail();
      return result;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },


  // =====================================================
  // QMS ROLE 14 — CAPA Coordinator: track / evidence / send
  // =====================================================

  capaToggleAction: async (capaId, itemIndex) => {
    const batchId = get().batchState?.batch?.id;
    if (!batchId) return;
    try {
      const capa = await api.capaToggleAction(capaId, batchId, itemIndex);
      set({ capa });
      await get().refreshQmsRoleDetail();
      return capa;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  capaAddEvidence: async (capaId, evidence) => {
    const batchId = get().batchState?.batch?.id;
    if (!batchId) return;
    try {
      const capa = await api.capaAddEvidence(capaId, batchId, evidence);
      set({ capa });
      await get().refreshQmsRoleDetail();
      return capa;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  capaSendForReview: async (capaId) => {
    const batchId = get().batchState?.batch?.id;
    if (!batchId) return;
    try {
      const capa = await api.capaSendForReview(capaId, batchId);
      set({ capa });
      await get().refreshQmsRoleDetail();
      await get().refreshQmsRoles();
      return capa;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },


  // =====================================================
  // QMS ROLE 15 — QA Reviewer: approve / return
  // =====================================================

  submitQaReview: async (capaId, decision, comments) => {
    const batchId = get().batchState?.batch?.id;
    if (!batchId) return;
    try {
      const result = await api.submitQaReview(batchId, capaId, decision, comments);
      set({ qmsBatchRoles: result.qmsRoles });

      if (decision === 'approved') {
        // Full cycle complete — clear the alarm/QMS workflow like
        // releaseBatch() does, and return both role panels to their grids.
        set({
          activeEvent: null,
          alarmActive: false,
          deviation: null,
          investigation: null,
          capa: null,
          capaFix: null,
          verification: null,
          selectedQmsRoleKey: null,
          qmsRoleDetail: null,
        });
      } else {
        set({ capa: result.capa });
        await get().refreshQmsRoleDetail();
      }

      return result;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // =====================================================
  // DEMO SKIP ACTIONS
  // =====================================================
  skipVmRole: async (roleKey) => {
    const batchId = get().batchState?.batch?.id;
    if (!batchId) return null;
    try {
      const result = await api.skipVmRole(batchId, roleKey);
      set({ roleDetail: result.detail });
      const batchRoles = await api.fetchBatchRoles(batchId);
      set({ batchRoles });
      return result;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  skipQmsAll: async () => {
    const batchId = get().batchState?.batch?.id;
    if (!batchId) return null;
    try {
      const result = await api.skipQmsAll(batchId);
      set({
        activeEvent: null,
        alarmActive: false,
        deviation: null,
        investigation: null,
        capa: null,
        capaFix: null,
        verification: null,
        selectedQmsRoleKey: null,
        qmsRoleDetail: null,
        qmsBatchRoles: result.qmsRoles,
      });
      return result;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  skipAll: async () => {
    const batchId = get().batchState?.batch?.id;
    if (!batchId) return null;
    try {
      const result = await api.skipAll(batchId);
      
      // Auto-record quiz scores for any alarm event in the skipped simulation
      const events = result.fullState?.events || [];
      const updatedQmsScores = { ...get().qmsScores };
      events.forEach(evt => {
        if (evt.type === 'alarm') {
          updatedQmsScores[evt.id] = { selectedOptionValue: 'A', score: 10, maxScore: 10 };
          updatedQmsScores['investigation_' + evt.id] = { selectedOptionValue: 'A', score: 10, maxScore: 10 };
        }
      });

      set({
        activeEvent: null,
        alarmActive: false,
        deviation: null,
        investigation: null,
        capa: null,
        capaFix: null,
        verification: null,
        selectedRoleKey: null,
        roleDetail: null,
        selectedQmsRoleKey: null,
        qmsRoleDetail: null,
        batchState: result.fullState,
        qmsScores: updatedQmsScores,
      });

      // Refetch the roles states to ensure UI is in sync
      const [batchRoles, qmsBatchRoles] = await Promise.all([
        api.fetchBatchRoles(batchId),
        api.fetchQmsRoles(batchId),
      ]);
      set({ batchRoles, qmsBatchRoles });

      return result;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

}));