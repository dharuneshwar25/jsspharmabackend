import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const client = axios.create({ baseURL: `${API_BASE_URL}/api` });

// The server sends a helpful { error: "..." } body on every 4xx/5xx (e.g.
// "An unacknowledged alarm is open for this stage..."). Axios's default
// error.message is just "Request failed with status code 400" and hides
// that — this interceptor unwraps the real message so the UI (and any
// catch block's err.message) shows the actual reason.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const serverMessage = error.response?.data?.error;
    if (serverMessage) {
      return Promise.reject(new Error(serverMessage));
    }
    return Promise.reject(error);
  }
);

export const fetchSimulations = () => client.get('/simulations').then((r) => r.data);

export const createBatch = (simulationId) =>
  client.post('/batches', { simulationId }).then((r) => r.data);

export const startStage = (batchId, stageId) =>
  client.post(`/batches/${batchId}/stages/${stageId}/start`).then((r) => r.data);

export const completeStage = (batchId, stageId) =>
  client.post(`/batches/${batchId}/stages/${stageId}/complete`).then((r) => r.data);

// =====================================================
// VM ROLE PANELS — 10-role technical step flow
// =====================================================

export const fetchAllRoleDefinitions = () =>
  client.get('/roles').then((r) => r.data);

export const fetchBatchRoles = (batchId) =>
  client.get(`/batches/${batchId}/roles`).then((r) => r.data);

export const fetchRoleDetail = (batchId, roleKey) =>
  client.get(`/batches/${batchId}/roles/${roleKey}`).then((r) => r.data);

export const submitRoleStep = (batchId, roleKey, stepKey, value) =>
  client
    .post(`/batches/${batchId}/roles/${roleKey}/steps`, { stepKey, value })
    .then((r) => r.data);

// =====================================================
// VM ROLE 10 — Machine Monitor / Support
// =====================================================

export const fetchMonitorOverview = (batchId) =>
  client.get(`/batches/${batchId}/monitor`).then((r) => r.data);

export const postMonitorNote = (batchId, eventId, note, type = 'support') =>
  client
    .post(`/batches/${batchId}/monitor/notes`, { eventId, note, type })
    .then((r) => r.data);

// =====================================================
// QMS ROLE PANELS — 5-role step flow
// =====================================================

export const fetchAllQmsRoleDefinitions = () =>
  client.get('/qms-roles').then((r) => r.data);

export const fetchQmsRoles = (batchId) =>
  client.get(`/batches/${batchId}/qms-roles`).then((r) => r.data);

export const fetchQmsRoleDetail = (batchId, roleKey) =>
  client.get(`/batches/${batchId}/qms-roles/${roleKey}`).then((r) => r.data);

// QMS Role 11 — QMS Monitor
export const qmsMonitorReview = (batchId, eventId, note) =>
  client
    .post(`/batches/${batchId}/qms/monitor/review`, { eventId, note })
    .then((r) => r.data);

// QMS Role 14 — CAPA Coordinator
export const capaToggleAction = (capaId, batchId, itemIndex) =>
  client
    .post(`/capas/${capaId}/actions/${itemIndex}/toggle`, { batchId })
    .then((r) => r.data);

export const capaAddEvidence = (capaId, batchId, evidence) =>
  client
    .post(`/capas/${capaId}/evidence`, { batchId, evidence })
    .then((r) => r.data);

export const capaSendForReview = (capaId, batchId) =>
  client
    .post(`/capas/${capaId}/send-for-review`, { batchId })
    .then((r) => r.data);

// QMS Role 15 — QA Reviewer
export const submitQaReview = (batchId, capaId, decision, comments) =>
  client
    .post('/qa-review', { batchId, capaId, decision, comments })
    .then((r) => r.data);

// =====================================================
// DEMO SKIP — bypass all remaining steps quickly
// =====================================================

export const skipVmRole = (batchId, roleKey) =>
  client
    .post(`/batches/${batchId}/roles/${roleKey}/skip`)
    .then((r) => r.data);

export const skipQmsAll = (batchId) =>
  client
    .post(`/batches/${batchId}/qms/skip`)
    .then((r) => r.data);

export const skipAll = (batchId) =>
  client
    .post(`/batches/${batchId}/skip-all`)
    .then((r) => r.data);

