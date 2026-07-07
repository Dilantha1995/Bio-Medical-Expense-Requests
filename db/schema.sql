-- PSMS Travel Advance & Bill Summary schema
-- Run this once against your Neon Postgres database.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  initials TEXT NOT NULL,             -- e.g. 'AH' for Ali Hyder - used in reference numbers
  designation TEXT,                   -- e.g. 'Biomedical Engineer'
  role TEXT NOT NULL DEFAULT 'engineer', -- 'engineer' | 'approver' | 'admin'
  can_final_approve BOOLEAN NOT NULL DEFAULT FALSE, -- approvers who can give final approval (BD/MD)
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Running sequence per engineer initials + year + document type (ADV / BM)
CREATE TABLE IF NOT EXISTS ref_counters (
  doc_type TEXT NOT NULL,      -- 'ADV' (advance request) or 'BM' (bill summary)
  initials TEXT NOT NULL,
  year TEXT NOT NULL,          -- 'YY' e.g. '26'
  last_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (doc_type, initials, year)
);

-- Travel Advance Requests (one row per trip; line items for multiple team members stored as JSON)
CREATE TABLE IF NOT EXISTS advance_requests (
  id SERIAL PRIMARY KEY,
  ref_number TEXT UNIQUE NOT NULL,
  engineer_id INTEGER NOT NULL REFERENCES users(id),
  request_date DATE NOT NULL,
  destination_label TEXT,             -- e.g. "LH, Naifaru Island"
  purpose_of_travel TEXT,
  notes TEXT,
  line_items JSONB NOT NULL DEFAULT '[]', -- [{name, designation, fromLocation, fromDate, toLocation, toDate, mode, days, food, accommodation, airfare, taxiFerry, seaTransport, landTransport, others, total}]
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted -> checked -> approved -> rejected
  prepared_by INTEGER REFERENCES users(id),
  prepared_at TIMESTAMPTZ,
  checked_by INTEGER REFERENCES users(id),
  checked_at TIMESTAMPTZ,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bill Summaries (submitted after the trip, referencing the advance request if applicable)
CREATE TABLE IF NOT EXISTS bill_summaries (
  id SERIAL PRIMARY KEY,
  ref_number TEXT UNIQUE NOT NULL,
  engineer_id INTEGER NOT NULL REFERENCES users(id),
  advance_request_id INTEGER REFERENCES advance_requests(id),
  summary_date DATE NOT NULL,
  destination_label TEXT,
  purpose_of_travel TEXT,
  notes TEXT,
  line_items JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_received NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0, -- positive = engineer owes company, negative = company owes engineer
  status TEXT NOT NULL DEFAULT 'submitted',
  prepared_by INTEGER REFERENCES users(id),
  prepared_at TIMESTAMPTZ,
  checked_by INTEGER REFERENCES users(id),
  checked_at TIMESTAMPTZ,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advance_engineer ON advance_requests(engineer_id);
CREATE INDEX IF NOT EXISTS idx_bill_engineer ON bill_summaries(engineer_id);

-- Permission for non-admin users who are allowed to add/edit machines
-- (e.g. senior engineers), in addition to admins who always can.
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_machines BOOLEAN NOT NULL DEFAULT FALSE;

-- Installed / serviced equipment, identified by a unique serial number.
CREATE TABLE IF NOT EXISTS machines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,                 -- e.g. "Vitros 350"
  model TEXT,
  serial_number TEXT UNIQUE NOT NULL, -- e.g. "PSMS-PM-0001"
  category TEXT,                      -- e.g. "Chemistry Analyzer"
  facility_name TEXT,                 -- e.g. "Naifaru Regional Hospital"
  location_label TEXT,                -- island/atoll, e.g. "Naifaru, Lh"
  install_date DATE,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machines_serial ON machines(serial_number);

-- Running sequence for auto-generated serial numbers, keyed by prefix
-- (e.g. "PSMS-PM-" or "PPM-PM-").
CREATE TABLE IF NOT EXISTS machine_serial_counters (
  prefix TEXT PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);

-- Permission for staff who should see the PM/Installation schedule
-- dashboard, granted individually by an admin.
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_access_pm_dashboard BOOLEAN NOT NULL DEFAULT FALSE;

-- Admin-defined columns for the PM schedule grid. Everything about a
-- schedule entry (status, next PM date, assigned engineer, whatever else
-- is needed) is one of these, so the grid's shape is fully configurable
-- without a code change.
CREATE TABLE IF NOT EXISTS pm_schedule_fields (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,           -- stable slug, e.g. "next_pm_date"
  label TEXT NOT NULL,                -- display label, e.g. "Next PM Date"
  field_type TEXT NOT NULL,           -- 'text' | 'number' | 'date' | 'select' | 'user'
  options JSONB,                      -- array of strings, only used for 'select'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per machine's PM/Installation schedule entry. field_values holds
-- {field_key: value} for whatever fields exist in pm_schedule_fields.
CREATE TABLE IF NOT EXISTS pm_schedule_entries (
  id SERIAL PRIMARY KEY,
  machine_id INTEGER NOT NULL REFERENCES machines(id),
  field_values JSONB NOT NULL DEFAULT '{}',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_entries_machine ON pm_schedule_entries(machine_id);

-- Admin-defined conditional formatting rules for the PM schedule grid.
-- Evaluated in priority order (lowest first); the first matching rule
-- for a cell (or row, if apply_to='row') wins.
CREATE TABLE IF NOT EXISTS pm_conditional_rules (
  id SERIAL PRIMARY KEY,
  field_key TEXT NOT NULL,
  operator TEXT NOT NULL,             -- see lib/pmRules.js OPERATORS for the full list
  compare_value TEXT,
  color TEXT NOT NULL DEFAULT '#fee2e2',
  text_color TEXT,
  label TEXT,
  apply_to TEXT NOT NULL DEFAULT 'cell', -- 'cell' | 'row'
  priority INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
