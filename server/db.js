const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, 'jss_pharma.db'));
db.pragma('journal_mode = WAL');

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS simulations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  config_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  simulation_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_process', -- in_process | on_hold | released | rejected
  current_stage_order INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (simulation_id) REFERENCES simulations(id)
);

CREATE TABLE IF NOT EXISTS stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | active | completed
  started_at TEXT,
  completed_at TEXT,
  current_step INTEGER NOT NULL DEFAULT 0,   -- index into that role's step list
  operation_data TEXT NOT NULL DEFAULT '{}', -- JSON blob of every value the operator has entered
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- One row per technical step an operator completes. This is the detailed
-- "how" behind each stage — the record that a stage's status alone
-- (pending/active/completed) cannot capture.
CREATE TABLE IF NOT EXISTS stage_step_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  stage_id INTEGER NOT NULL,
  role_key TEXT NOT NULL,
  step_key TEXT NOT NULL,
  label TEXT,
  value_json TEXT,
  flagged INTEGER NOT NULL DEFAULT 0, -- 1 if this step's entry breached tolerance
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (batch_id) REFERENCES batches(id),
  FOREIGN KEY (stage_id) REFERENCES stages(id)
);

-- Machine Monitor / Support (VM role 10) notes and escalations.
CREATE TABLE IF NOT EXISTS monitor_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  event_id INTEGER,
  note TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'support', -- support | escalation
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE TABLE IF NOT EXISTS machines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'stopped', -- running | stopped | paused
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- Day 2: added stage_name so an alarm records which stage it fired in
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  stage_name TEXT,
  type TEXT NOT NULL, -- alarm | info
  parameter TEXT,
  expected REAL,
  actual REAL,
  message TEXT,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- Day 2: added severity + product_impact (Impact Assessment).
-- description / root_cause double as your Investigation fields.
CREATE TABLE IF NOT EXISTS deviations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  severity TEXT, -- minor | major | critical
  product_impact TEXT,
  description TEXT,   -- "what happened"
  root_cause TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | closed
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE IF NOT EXISTS capas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deviation_id INTEGER NOT NULL,
  corrective_action TEXT,
  preventive_action TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | pending_verification | verified | failed
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (deviation_id) REFERENCES deviations(id)
);

-- Day 2: added expected + tolerance — without these "passed" can't be computed
CREATE TABLE IF NOT EXISTS verification_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  capa_id INTEGER NOT NULL,
  parameter TEXT,
  expected REAL,
  before_value REAL,
  after_value REAL,
  tolerance REAL,
  passed INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (capa_id) REFERENCES capas(id)
);

-- QMS Role 15 — QA Reviewer's final decision on the whole quality chain
-- (Event -> Impact Assessment -> Deviation -> Investigation -> Root
-- Cause -> CAPA -> Verification). APPROVED releases the batch;
-- RETURNED sends the CAPA back for rework.
CREATE TABLE IF NOT EXISTS qa_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  capa_id INTEGER NOT NULL,
  deviation_id INTEGER NOT NULL,
  decision TEXT NOT NULL, -- approved | returned
  comments TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (batch_id) REFERENCES batches(id),
  FOREIGN KEY (capa_id) REFERENCES capas(id)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  actor TEXT NOT NULL, -- VM | QMS | system
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE TABLE IF NOT EXISTS evaluation_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  score REAL NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE TABLE IF NOT EXISTS step_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  stage TEXT NOT NULL,
  field TEXT NOT NULL,
  expected TEXT,
  actual TEXT,
  passed INTEGER DEFAULT 0,
  marks_awarded INTEGER DEFAULT 0,
  marks_max INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);
`);

// ---------- Lightweight migration for existing DBs ----------
// If you already ran the app before today and jss_pharma.db exists on disk,
// CREATE TABLE IF NOT EXISTS won't add the new columns above to old tables.
// This adds them safely if missing, and no-ops if they're already there.
function addColumnIfMissing(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Migrated: added ${table}.${column}`);
  }
}

addColumnIfMissing('events', 'stage_name', 'TEXT');
addColumnIfMissing('deviations', 'severity', 'TEXT');
addColumnIfMissing('deviations', 'product_impact', 'TEXT');
addColumnIfMissing('verification_results', 'expected', 'REAL');
addColumnIfMissing('verification_results', 'tolerance', 'REAL');
addColumnIfMissing('stages', 'current_step', "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing('stages', 'operation_data', "TEXT NOT NULL DEFAULT '{}'");
addColumnIfMissing('events', 'source', "TEXT NOT NULL DEFAULT 'scripted'"); // scripted | operator_reading
addColumnIfMissing('events', 'escalated', 'INTEGER NOT NULL DEFAULT 0');

// ---------- QMS 5-role panel columns ----------

// QMS Role 11 — QMS Monitor: has this event been triaged/assigned yet?
// SME's dedicated panel stays locked until the Monitor does this, so the
// Monitor really is "the first point of contact for quality events".
addColumnIfMissing('events', 'reviewed_by_monitor', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('events', 'assigned_role', "TEXT"); // e.g. 'SME / Quality Reviewer'

// QMS Role 12 — SME / Quality Reviewer's Impact Assessment result.
// `significant` is the SME's explicit significance decision — this is
// what gates Investigation Officer, per "If significant -> Deviation".
addColumnIfMissing('deviations', 'significant', 'INTEGER');

// QMS Role 13 — Investigation Officer's structured entry fields.
addColumnIfMissing('deviations', 'possible_causes', 'TEXT');
addColumnIfMissing('deviations', 'evidence', 'TEXT');
addColumnIfMissing('deviations', 'immediate_action', 'TEXT');
addColumnIfMissing('deviations', 'proposed_corrective', 'TEXT');
addColumnIfMissing('deviations', 'proposed_preventive', 'TEXT');

// QMS Role 14 — CAPA Coordinator: assign actions / track completion /
// collect evidence / send for review, per the technical-flow document.
addColumnIfMissing('capas', 'action_items', "TEXT NOT NULL DEFAULT '[]'"); // JSON [{text, done}]
addColumnIfMissing('capas', 'evidence', 'TEXT');
addColumnIfMissing('capas', 'sent_for_review', 'INTEGER NOT NULL DEFAULT 0');
// Persist the VM's corrected reading on the CAPA row itself (not just
// in whichever browser tab submitted it) so the CAPA Coordinator's
// "Verify Effectiveness" panel can read it from anywhere.
addColumnIfMissing('capas', 'fix_parameter', 'TEXT');
addColumnIfMissing('capas', 'fix_before', 'REAL');
addColumnIfMissing('capas', 'fix_after', 'REAL');

// ---------- Seed simulations from /data JSON files ----------
function seedSimulations() {
  const dataDir = path.join(__dirname, 'data');
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  const upsert = db.prepare(
    `INSERT INTO simulations (id, name, config_json) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, config_json = excluded.config_json`
  );
  for (const file of files) {
    const config = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
    upsert.run(config.id, config.name, JSON.stringify(config));
  }
  console.log(`Seeded ${files.length} simulation(s) from /data`);
}

seedSimulations();

module.exports = db;