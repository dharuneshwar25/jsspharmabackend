// =====================================================================
// QMS ROLE DEFINITIONS
// =====================================================================
// Single source of truth for the 5 QMS roles (roles 11-15 in the
// technical-flow document's 15-role pool). Unlike the 9 VM process
// roles, these are NOT tied to a fixed generic step engine — each
// role's work is a different shape (triage, assessment, investigation
// write-up, CAPA tracking, final review) — so the frontend gets one
// dedicated component per role instead of a shared step-flow renderer.
// This file only carries the metadata used to render the QMS role
// selection grid (title/icon/summary/responsibilities), matching the
// pattern roles.js uses for the VM Machine Monitor role.
// =====================================================================

const QMS_ROLES = [
  {
    key: 'qms_monitor',
    order: 11,
    title: 'QMS Monitor',
    icon: 'monitor',
    summary: 'First point of contact for every quality event. Watches all batches, triages new alarms and assigns the SME.',
    responsibilities: [
      'Watch batch progress, machine/process data, quality limits and alarms',
      'Receive every new quality event the moment it fires',
      'Review basic event information',
      'Determine the appropriate quality role',
      'Assign the event to an SME / Quality Reviewer',
    ],
  },
  {
    key: 'sme',
    order: 12,
    title: 'SME / Quality Reviewer',
    icon: 'sme',
    summary: 'Investigates the quality impact of an assigned event and produces the Impact Assessment.',
    responsibilities: [
      'Examine current batch, machine readings, historical data, operator actions',
      'Ask: what happened, when, what part of the batch could be affected',
      'Determine whether the issue is potentially significant',
      'Create the Impact Assessment and recommend Deviation + Quality Hold if significant',
    ],
  },
  {
    key: 'investigation_officer',
    order: 13,
    title: 'Investigation Officer',
    icon: 'investigation',
    summary: 'Takes over once a Deviation is raised. Determines root cause from machine/batch/operator history.',
    responsibilities: [
      'Access machine history, batch history, operator actions, alarm history',
      'Request information from the VM operator where needed',
      'Determine possible causes, evidence and root cause',
      'Propose immediate, corrective and preventive actions',
    ],
  },
  {
    key: 'capa_coordinator',
    order: 14,
    title: 'CAPA Coordinator',
    icon: 'capa',
    summary: 'Owns the corrective/preventive action plan end-to-end: create, assign, track, evidence, verify.',
    responsibilities: [
      'Create the CAPA from the Investigation Officer\u2019s proposed actions',
      'Assign actions and track completion',
      'Collect evidence and send the corrective action to VM for implementation',
      'Verify effectiveness once VM submits the corrected reading',
    ],
  },
  {
    key: 'qa_reviewer',
    order: 15,
    title: 'QA Reviewer',
    icon: 'qa',
    summary: 'Final quality oversight. Reviews the full chain and approves or returns it.',
    responsibilities: [
      'Review Event \u2192 Impact Assessment \u2192 Deviation \u2192 Investigation \u2192 Root Cause \u2192 CAPA \u2192 Verification',
      'Determine whether the quality workflow is satisfactory',
      'APPROVED \u2192 batch is released / can continue',
      'RETURN \u2192 sends the case back for further investigation/CAPA',
    ],
  },
];

function getAllQmsRoles() {
  return QMS_ROLES;
}

function getQmsRoleByKey(key) {
  return QMS_ROLES.find((r) => r.key === key) || null;
}

module.exports = {
  QMS_ROLES,
  getAllQmsRoles,
  getQmsRoleByKey,
};
