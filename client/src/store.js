import { create } from 'zustand';
import { SIMULATIONS, ROLES, QMS_ROLES } from './localData';

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
  // ALARM / QMS STATE
  // =====================================================
  activeEvent: null,
  alarmActive: false,
  deviation: null,
  investigation: null,
  capa: null,
  capaFix: null,
  verification: null,

  // =====================================================
  // VM ROLE PANELS
  // =====================================================
  roleDefinitions: [],
  batchRoles: [],
  selectedRoleKey: null,
  roleDetail: null,
  roleDetailLoading: false,
  monitorData: null,

  // =====================================================
  // QMS ROLE PANELS
  // =====================================================
  qmsRoleDefinitions: [],
  qmsBatchRoles: [],
  selectedQmsRoleKey: null,
  qmsRoleDetail: null,
  qmsRoleDetailLoading: false,

  // =====================================================
  // INITIALIZE LOCAL STORE
  // =====================================================
  init: async () => {
    set({
      simulations: SIMULATIONS,
      roleDefinitions: ROLES,
      qmsRoleDefinitions: QMS_ROLES,
      error: null
    });
  },

  // =====================================================
  // ALARM SOUND
  // =====================================================
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
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur - 0.02);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur);
      };

      // Two-tone siren
      beep(0.0, 880, 0.25);
      beep(0.25, 660, 0.25);
      beep(0.5, 880, 0.25);
      beep(0.75, 660, 0.25);
    } catch (e) {
      console.warn('AudioContext beep failed:', e);
    }
  },

  // =====================================================
  // HELPER STATE GETTERS
  // =====================================================
  getLocalBatchState: () => {
    return get().batchState;
  },

  refreshBatchRoles: () => {
    const state = get().batchState;
    if (!state) return;
    const batch = state.batch;

    const updatedBatchRoles = ROLES.map((role) => {
      if (role.key === 'monitor') {
        return {
          key: role.key,
          order: role.order,
          title: role.title,
          icon: role.icon,
          summary: role.summary,
          type: 'monitor',
          status: 'available',
        };
      }

      const stage = state.stages.find((s) => s.stage_order === role.order);
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

    set({ batchRoles: updatedBatchRoles });
  },

  refreshQmsRoles: () => {
    const state = get().batchState;
    if (!state) return;
    
    const activeEvent = get().activeEvent;
    const deviation = get().deviation;
    const capa = get().capa;
    const verification = get().verification;

    const updatedQmsBatchRoles = QMS_ROLES.map((def) => {
      let status = 'locked';
      let note = '';

      if (def.key === 'qms_monitor') {
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
          note = 'Waiting on the Investigation Officer’s root cause';
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
        } else if (!state.qaReviews || state.qaReviews.length === 0 || state.qaReviews[0].decision === 'returned') {
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

    set({ qmsBatchRoles: updatedQmsBatchRoles });
  },

  // =====================================================
  // BATCH CONTROL & TRANSITIONS
  // =====================================================
  startNewBatch: async (simulationId) => {
    const config = SIMULATIONS.find((s) => s.id === simulationId) || SIMULATIONS[0];
    const initialStages = config.stages.map((stage) => ({
      id: stage.order,
      batch_id: 1,
      name: stage.name,
      stage_order: stage.order,
      status: stage.order === 1 ? 'active' : 'pending',
      started_at: stage.order === 1 ? new Date().toISOString() : null,
      completed_at: null,
      current_step: 0,
      operation_data: '{}',
    }));

    const newState = {
      batch: {
        id: 1,
        simulation_id: config.id,
        status: 'in_process',
        current_stage_order: 1,
        created_at: new Date().toISOString(),
      },
      stages: initialStages,
      machine: { status: 'running' },
      events: [],
      activityLog: [],
      stepScores: [],
      simulationConfig: config,
    };

    set({
      batchState: newState,
      activeEvent: null,
      alarmActive: false,
      deviation: null,
      investigation: null,
      capa: null,
      capaFix: null,
      verification: null,
      selectedRoleKey: null,
      selectedQmsRoleKey: null,
      qmsScores: {}
    });

    get().refreshBatchRoles();
    get().refreshQmsRoles();
  },

  startStage: async (stageId) => {
    const state = get().batchState;
    if (!state) return;

    const updatedStages = state.stages.map((s) => {
      if (s.id === stageId && s.status === 'pending') {
        return { ...s, status: 'active', started_at: new Date().toISOString() };
      }
      return s;
    });

    set({
      batchState: {
        ...state,
        stages: updatedStages,
        machine: { status: 'running' }
      }
    });

    get().refreshBatchRoles();
    get().refreshRoleDetail();
  },

  completeStage: async (stageId) => {
    const state = get().batchState;
    if (!state) return;

    const activeStage = state.stages.find((s) => s.id === stageId);
    if (!activeStage) return;

    const updatedStages = state.stages.map((s) => {
      if (s.id === stageId) {
        return { ...s, status: 'completed', completed_at: new Date().toISOString() };
      }
      // Unlock next stage automatically
      if (s.stage_order === activeStage.stage_order + 1) {
        return { ...s, status: 'active', started_at: new Date().toISOString() };
      }
      return s;
    });

    const nextOrder = activeStage.stage_order + 1;

    set({
      batchState: {
        ...state,
        batch: { ...state.batch, current_stage_order: nextOrder },
        stages: updatedStages,
        machine: { status: 'stopped' }
      }
    });

    get().refreshBatchRoles();
    get().refreshRoleDetail();
  },

  // =====================================================
  // VM OPERATOR ACTIONS
  // =====================================================
  operatorAction: async (batchId, eventId, action, detail = '') => {
    const state = get().batchState;
    if (!state) return;

    let score = 0;
    let passed = 0;
    if (['pause', 'stop', 'report'].includes(action)) {
      score = 10;
      passed = 1;
    }

    const updatedEvents = state.events.map((evt) => {
      if (evt.id === eventId) {
        return { ...evt, acknowledged: 1 };
      }
      return evt;
    });

    const updatedStepScores = [...state.stepScores];
    const scoreIdx = updatedStepScores.findIndex((s) => s.field === 'alarmResponse');
    const checkpointDesc = 'Halt machine (Pause/Stop) or Report to QMS during critical alarm.';
    
    if (scoreIdx > -1) {
      updatedStepScores[scoreIdx] = {
        ...updatedStepScores[scoreIdx],
        actual: action,
        passed,
        marks_awarded: score
      };
    } else {
      updatedStepScores.push({
        batch_id: batchId,
        stage: 'Milling',
        field: 'alarmResponse',
        expected: checkpointDesc,
        actual: action,
        passed,
        marks_awarded: score,
        marks_max: 10
      });
    }

    set({
      batchState: {
        ...state,
        events: updatedEvents,
        stepScores: updatedStepScores,
        machine: { status: action === 'pause' ? 'paused' : action === 'stop' ? 'stopped' : 'running' }
      },
      alarmActive: false,
      activeEvent: get().activeEvent ? { ...get().activeEvent, acknowledged: 1 } : null
    });

    get().refreshRoleDetail();
    get().refreshQmsRoles();
    get().refreshQmsRoleDetail();
  },

  submitRoleStep: async (stepKey, value) => {
    const state = get().batchState;
    const roleKey = get().selectedRoleKey;
    if (!state || !roleKey) return null;

    const role = ROLES.find((r) => r.key === roleKey);
    const stage = state.stages.find((s) => s.stage_order === role.order);
    if (!stage || stage.status === 'completed') return null;

    const stepIndex = role.steps.findIndex((s) => s.key === stepKey);
    const step = role.steps[stepIndex];
    
    let opData = {};
    try { opData = JSON.parse(stage.operation_data || '{}'); } catch { opData = {}; }

    // Map input values
    const dataKey = step.field || step.key;
    if (step.type === 'totals') {
      opData[step.key] = value;
    } else if (step.type === 'checklist') {
      opData[step.key] = value;
    } else {
      opData[dataKey] = value;
    }

    // Precondition / Validation
    const config = state.simulationConfig;
    let passed = 0;
    let marksAwarded = 0;
    
    if (config.evaluationRubric && config.evaluationRubric.vmCheckpoints) {
      const checkpoint = config.evaluationRubric.vmCheckpoints.find(
        (cp) => cp.stage === role.stageName && cp.field === dataKey
      );
      if (checkpoint) {
        let evalVal = value;
        if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
          evalVal = Number(value);
        }
        
        const pass = new Function('value', 'return ' + checkpoint.precondition)(evalVal);
        if (pass) {
          passed = 1;
          marksAwarded = checkpoint.marks;
        } else {
          if (['set', 'select'].includes(step.type)) {
            throw new Error(`Recipe Validation Error: "${value}" does not match target. ${checkpoint.expectedBehavior}`);
          }
        }

        const updatedScores = state.stepScores.filter(s => !(s.stage === role.stageName && s.field === dataKey));
        updatedScores.push({
          batch_id: state.batch.id,
          stage: role.stageName,
          field: dataKey,
          expected: checkpoint.expectedBehavior || String(checkpoint.precondition),
          actual: String(value),
          passed,
          marks_awarded: marksAwarded,
          marks_max: checkpoint.marks
        });
        state.stepScores = updatedScores;
      }
    }

    // Defect Triggers
    let triggeredEvent = null;
    let newAlarmActive = false;
    
    if (step.type === 'start') {
      state.machine.status = 'running';
      if (config.defect && config.defect.triggerStage === role.stageName) {
        triggeredEvent = {
          id: Date.now(),
          batch_id: state.batch.id,
          stage_name: role.stageName,
          type: 'alarm',
          parameter: config.defect.parameter,
          expected: config.defect.normal,
          actual: config.defect.drift,
          message: config.defect.message,
          acknowledged: 0,
          created_at: new Date().toISOString()
        };
        state.events = [triggeredEvent, ...state.events];
        newAlarmActive = true;
        get().playAlarmSound();
      }
    }

    // Limit check for IPC confirmations
    if (step.type === 'confirm' && step.compareTo) {
      const target = Number(opData[step.compareTo] ?? step.target);
      const actual = Number(value);
      if (Number.isFinite(target) && Number.isFinite(actual) && target !== 0) {
        const pctOff = (Math.abs(actual - target) / target) * 100;
        if (pctOff > (step.tolerancePct ?? 5)) {
          triggeredEvent = {
            id: Date.now(),
            batch_id: state.batch.id,
            stage_name: role.stageName,
            type: 'alarm',
            parameter: step.field,
            expected: target,
            actual: actual,
            message: `${role.title}: ${step.label} outside tolerance — target ${target}${step.unit || ''}, actual ${actual}${step.unit || ''} (±${step.tolerancePct ?? 5}% limit).`,
            acknowledged: 0,
            created_at: new Date().toISOString()
          };
          state.events = [triggeredEvent, ...state.events];
          newAlarmActive = true;
          get().playAlarmSound();
        }
      }
    }

    // Step type checks (completes stage, check flags)
    if (step.type === 'complete') {
      const unresolvedAlarm = state.events.find(e => e.stage_name === role.stageName && e.acknowledged === 0);
      if (unresolvedAlarm) {
        throw new Error('An unacknowledged alarm is open for this stage. Acknowledge/respond to it before completing.');
      }
      const activeDeviation = get().deviation;
      if (activeDeviation && activeDeviation.significant === 1 && activeDeviation.status !== 'closed' && activeEvent?.stage_name === role.stageName) {
        throw new Error('This stage is locked on Quality Hold. QMS must complete the investigation, verify CAPA, and release the batch before you can transfer material.');
      }
    }

    // Save local stage progress
    const updatedStages = state.stages.map((s) => {
      if (s.id === stage.id) {
        const isComplete = step.type === 'complete';
        return {
          ...s,
          current_step: isComplete ? stepIndex + 1 : stepIndex + 1,
          status: isComplete ? 'completed' : 'active',
          completed_at: isComplete ? new Date().toISOString() : null,
          operation_data: JSON.stringify(opData)
        };
      }
      // Unlock next stage on completion
      if (step.type === 'complete' && s.stage_order === role.order + 1) {
        return { ...s, status: 'active', started_at: new Date().toISOString() };
      }
      return s;
    });

    const updatedBatch = {
      ...state.batch,
      current_stage_order: step.type === 'complete' ? role.order + 1 : state.batch.current_stage_order
    };

    const nextState = {
      ...state,
      batch: updatedBatch,
      stages: updatedStages,
      machine: { status: step.type === 'complete' ? 'stopped' : state.machine.status }
    };

    set({
      batchState: nextState,
      activeEvent: triggeredEvent || get().activeEvent,
      alarmActive: newAlarmActive || get().alarmActive
    });

    get().refreshBatchRoles();
    get().refreshQmsRoles();
    get().refreshRoleDetail();
    
    return {
      detail: get().roleDetail,
      eventId: triggeredEvent ? triggeredEvent.id : null,
      flagged: newAlarmActive
    };
  },

  // =====================================================
  // VM ROLE SELECTION & COMPLETED LOGS
  // =====================================================
  openRole: async (roleKey) => {
    set({ selectedRoleKey: roleKey, roleDetailLoading: true, error: null });
    get().refreshRoleDetail();
  },

  closeRole: () => {
    set({ selectedRoleKey: null, roleDetail: null, monitorData: null });
  },

  refreshRoleDetail: () => {
    const state = get().batchState;
    const roleKey = get().selectedRoleKey;
    if (!state || !roleKey) return;

    if (roleKey === 'monitor') {
      const stageRoles = state.stages.map((stage) => {
        const r = ROLES.find((rl) => rl.stageName === stage.name);
        return {
          stageId: stage.id,
          roleKey: r ? r.key : null,
          roleTitle: r ? r.title : stage.name,
          stageName: stage.name,
          status: stage.status,
          currentStep: stage.current_step,
          totalSteps: r ? r.steps.length : null,
        };
      });
      set({
        monitorData: { stageRoles, events: state.events, notes: state.events.filter(e => e.message) },
        roleDetailLoading: false
      });
      return;
    }

    const role = ROLES.find((r) => r.key === roleKey);
    const stage = state.stages.find((s) => s.stage_order === role.order);
    const stepLog = state.events.filter((e) => e.stage_name === role.stageName);

    set({
      roleDetail: {
        role,
        stage,
        operationData: JSON.parse(stage.operation_data || '{}'),
        stepLog,
        locked: role.order > state.batch.current_stage_order && stage.status !== 'completed',
        activeEvent: get().activeEvent && get().activeEvent.stage_name === role.stageName ? get().activeEvent : null,
        batch: state.batch,
      },
      roleDetailLoading: false
    });
  },

  // =====================================================
  // QMS WORKFLOW ACTIONS (MONITOR, SME, IO, CAPA, QA)
  // =====================================================
  openQmsRole: async (roleKey) => {
    set({ selectedQmsRoleKey: roleKey, qmsRoleDetailLoading: true, error: null });
    get().refreshQmsRoleDetail();
  },

  closeQmsRole: () => {
    set({ selectedQmsRoleKey: null, qmsRoleDetail: null });
  },

  refreshQmsRoleDetail: () => {
    const state = get().batchState;
    const roleKey = get().selectedQmsRoleKey;
    if (!state || !roleKey) return;

    const def = QMS_ROLES.find((r) => r.key === roleKey);
    const activeEvent = get().activeEvent;
    const deviation = get().deviation;
    const capa = get().capa;

    const rolesList = get().qmsBatchRoles;
    const roleStatus = rolesList.find((r) => r.key === roleKey);

    set({
      qmsRoleDetail: {
        role: def,
        status: roleStatus?.status || 'locked',
        note: roleStatus?.note || '',
        batch: state.batch,
        activeEvent,
        deviation,
        capa,
        qaReview: state.qaReviews ? state.qaReviews[0] : null,
        monitorOverview: roleKey === 'qms_monitor' ? { activeAlarms: activeEvent ? [activeEvent] : [] } : null,
      },
      qmsRoleDetailLoading: false
    });
  },

  qmsMonitorReview: async (eventId, note) => {
    const activeEvent = get().activeEvent;
    if (activeEvent) {
      set({
        activeEvent: { ...activeEvent, reviewed_by_monitor: 1 }
      });
    }
    get().refreshQmsRoles();
    get().refreshQmsRoleDetail();
  },

  submitImpactAssessment: async (eventId, batchId, severity, productImpact, significant, notes) => {
    const deviation = {
      id: Date.now(),
      event_id: eventId,
      severity,
      product_impact: productImpact,
      significant: significant ? 1 : 0,
      status: 'open'
    };

    set({ deviation });
    get().refreshQmsRoles();
    get().refreshQmsRoleDetail();
    return deviation;
  },

  submitInvestigation: async (deviationId, batchId, fields) => {
    const deviation = get().deviation;
    const updatedDeviation = {
      ...deviation,
      root_cause: fields.rootCause,
      evidence: fields.evidence,
      proposed_corrective: fields.proposedCorrective,
      proposed_preventive: fields.proposedPreventive,
      description: fields.whatHappened,
      possible_causes: fields.possibleCauses,
      immediate_action: fields.immediateAction
    };

    const state = get().batchState;
    set({
      deviation: updatedDeviation,
      batchState: {
        ...state,
        batch: { ...state.batch, status: 'on_hold' }
      }
    });

    get().refreshQmsRoles();
    get().refreshQmsRoleDetail();

    return {
      deviation: updatedDeviation,
      batch: get().batchState.batch
    };
  },

  createCAPA: async (deviationId, batchId, correctiveAction, preventiveAction, actionItems = []) => {
    const items = (actionItems || []).map(text => ({ text, done: false }));
    const capa = {
      id: Date.now(),
      deviation_id: deviationId,
      corrective_action: correctiveAction,
      preventive_action: preventiveAction,
      actionItems: items,
      status: 'open'
    };

    set({ capa });
    get().refreshQmsRoles();
    get().refreshQmsRoleDetail();
    return capa;
  },

  capaToggleAction: async (capaId, itemIndex) => {
    const capa = get().capa;
    const updatedItems = capa.actionItems.map((item, idx) => {
      if (idx === itemIndex) {
        return { ...item, done: !item.done };
      }
      return item;
    });

    set({
      capa: { ...capa, actionItems: updatedItems }
    });
    get().refreshQmsRoleDetail();
  },

  capaAddEvidence: async (capaId, evidence) => {
    const capa = get().capa;
    set({
      capa: { ...capa, evidence }
    });
    get().refreshQmsRoleDetail();
  },

  capaSendForReview: async (capaId) => {
    const capa = get().capa;
    set({
      capa: { ...capa, sent_for_review: 1 }
    });
    get().refreshQmsRoles();
    get().refreshQmsRoleDetail();
  },

  submitCapaFix: async (capaId, batchId, parameter, beforeValue, afterValue) => {
    const capa = get().capa;
    set({
      capa: { ...capa, fix_parameter: parameter, fix_before: beforeValue, fix_after: afterValue },
      capaFix: { parameter, beforeValue, afterValue }
    });
    get().refreshQmsRoleDetail();
  },

  verifyCapa: async (capaId, batchId, parameter, expected, beforeValue, afterValue, tolerance) => {
    const diff = Math.abs(afterValue - expected);
    const passed = diff <= (tolerance || 0.1);

    const verification = {
      passed,
      expected,
      before_value: beforeValue,
      after_value: afterValue,
      tolerance
    };

    const capa = get().capa;
    const updatedCapa = {
      ...capa,
      status: passed ? 'verified' : 'failed'
    };

    set({
      verification,
      capa: updatedCapa
    });

    get().refreshQmsRoles();
    get().refreshQmsRoleDetail();
    return verification;
  },

  submitQaReview: async (capaId, decision, comments) => {
    const state = get().batchState;
    const qaReview = {
      id: Date.now(),
      batch_id: state.batch.id,
      capa_id: capaId,
      decision,
      comments
    };

    const updatedState = {
      ...state,
      qaReviews: [qaReview]
    };

    if (decision === 'approved') {
      set({
        batchState: {
          ...updatedState,
          batch: { ...state.batch, status: 'released' }
        },
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
      const capa = get().capa;
      set({
        batchState: updatedState,
        capa: { ...capa, status: 'failed' }
      });
      get().refreshQmsRoleDetail();
    }

    get().refreshQmsRoles();
    return {
      qmsRoles: get().qmsBatchRoles,
      capa: get().capa
    };
  },

  // =====================================================
  // AUTO-RUNS & DEMO UTILITIES
  // =====================================================
  skipVmRole: async (roleKey) => {
    const state = get().batchState;
    if (!state) return null;

    const role = ROLES.find((r) => r.key === roleKey);
    const stage = state.stages.find((s) => s.stage_order === role.order);
    if (!stage || stage.status === 'completed') return null;

    let opData = {};
    try { opData = JSON.parse(stage.operation_data || '{}'); } catch { opData = {}; }

    // Hydrate targets into stage data
    role.steps.forEach((step) => {
      const targetVal = step.target || (step.options ? step.options[0].value : null);
      if (step.field) {
        opData[step.field] = targetVal;
      } else if (step.key) {
        opData[step.key] = targetVal;
      }
    });

    const config = state.simulationConfig;
    const updatedScores = [...state.stepScores];

    if (config.evaluationRubric && config.evaluationRubric.vmCheckpoints) {
      config.evaluationRubric.vmCheckpoints.forEach((checkpoint) => {
        if (checkpoint.stage === role.stageName) {
          const checkExists = updatedScores.find(s => s.stage === role.stageName && s.field === checkpoint.field);
          if (!checkExists) {
            updatedScores.push({
              batch_id: state.batch.id,
              stage: role.stageName,
              field: checkpoint.field,
              expected: checkpoint.expectedBehavior || String(checkpoint.precondition),
              actual: String(checkpoint.field === 'actualQty' ? 10.0 : checkpoint.field === 'actualWeight' ? 500.0 : 'validated'),
              passed: 1,
              marks_awarded: checkpoint.marks,
              marks_max: checkpoint.marks
            });
          }
        }
      });
    }

    const updatedStages = state.stages.map((s) => {
      if (s.id === stage.id) {
        return {
          ...s,
          current_step: role.steps.length,
          status: 'completed',
          completed_at: new Date().toISOString(),
          operation_data: JSON.stringify(opData)
        };
      }
      // Auto unlock next stage
      if (s.stage_order === role.order + 1) {
        return { ...s, status: 'active', started_at: new Date().toISOString() };
      }
      return s;
    });

    const nextState = {
      ...state,
      batch: { ...state.batch, current_stage_order: role.order + 1 },
      stages: updatedStages,
      stepScores: updatedScores,
      machine: { status: 'stopped' }
    };

    set({ batchState: nextState });

    get().refreshBatchRoles();
    get().refreshRoleDetail();

    return {
      detail: get().roleDetail,
      eventId: null,
      flagged: false
    };
  },

  skipQmsAll: async () => {
    const state = get().batchState;
    if (!state) return null;

    const event = get().activeEvent;
    if (!event) return null;

    // Simulate perfect QMS sequence
    const updatedQmsScores = { ...get().qmsScores };
    updatedQmsScores[event.id] = { selectedOptionValue: 'A', score: 10, maxScore: 10 };
    updatedQmsScores['investigation_' + event.id] = { selectedOptionValue: 'A', score: 10, maxScore: 10 };

    set({
      qmsScores: updatedQmsScores,
      activeEvent: null,
      alarmActive: false,
      deviation: null,
      investigation: null,
      capa: null,
      capaFix: null,
      verification: null,
      selectedQmsRoleKey: null,
      qmsRoleDetail: null,
      batchState: {
        ...state,
        batch: { ...state.batch, status: 'released' }
      }
    });

    get().refreshQmsRoles();
    return {
      qmsRoles: get().qmsBatchRoles
    };
  },

  skipAll: async () => {
    const state = get().batchState;
    if (!state) return null;

    // Skip every VM stage
    for (const r of ROLES) {
      if (r.key !== 'monitor') {
        const stage = state.stages.find(s => s.stage_order === r.order);
        if (stage && stage.status !== 'completed') {
          await get().skipVmRole(r.key);
        }
      }
    }

    // Re-triage and release batch
    set((stateStore) => ({
      batchState: {
        ...stateStore.batchState,
        batch: { ...stateStore.batchState.batch, status: 'released' }
      },
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
    }));

    get().refreshBatchRoles();
    get().refreshQmsRoles();

    return {
      fullState: get().batchState
    };
  },
}));