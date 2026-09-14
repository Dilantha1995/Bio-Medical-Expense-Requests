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

-- Running sequence per company + engineer initials + year + document type (ADV / BM).
-- Each company (PSMS / PPM) gets its own independent numbering sequence.
CREATE TABLE IF NOT EXISTS ref_counters (
  doc_type TEXT NOT NULL,      -- 'ADV' (advance request) or 'BM' (bill summary)
  initials TEXT NOT NULL,
  year TEXT NOT NULL,          -- 'YY' e.g. '26'
  company TEXT NOT NULL DEFAULT 'PSMS',
  last_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (doc_type, initials, year, company)
);

-- Migration for databases created before per-company numbering existed.
ALTER TABLE ref_counters ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT 'PSMS';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ref_counters_pkey_v2') THEN
    ALTER TABLE ref_counters DROP CONSTRAINT IF EXISTS ref_counters_pkey;
    ALTER TABLE ref_counters ADD CONSTRAINT ref_counters_pkey_v2 PRIMARY KEY (doc_type, initials, year, company);
  END IF;
END $$;

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

-- When a supervisor/approver confirms the engineer is back in the office,
-- the 3-working-day bill submission deadline starts counting from this date.
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS returned_at DATE;
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS returned_marked_by INTEGER REFERENCES users(id);
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS returned_marked_at TIMESTAMPTZ;

-- Which company letterhead/logo the document should be issued under.
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT 'PSMS';
ALTER TABLE bill_summaries ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT 'PSMS';

-- Soft delete: admin can remove an entry, but its reference number is never
-- reused and it still shows in its original sequence position, marked as
-- deleted, with who deleted it and why (audit trail).
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id);
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
ALTER TABLE bill_summaries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE bill_summaries ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id);
ALTER TABLE bill_summaries ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Payment processing workflow, run by the accounts team after approval:
-- null -> 'processing' -> 'processed' (with a scanned payment slip attached).
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS payment_slip_data TEXT;
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS payment_processed_by INTEGER REFERENCES users(id);
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS payment_processed_at TIMESTAMPTZ;
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT;
ALTER TABLE bill_summaries ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE bill_summaries ADD COLUMN IF NOT EXISTS payment_slip_data TEXT;
ALTER TABLE bill_summaries ADD COLUMN IF NOT EXISTS payment_processed_by INTEGER REFERENCES users(id);
ALTER TABLE bill_summaries ADD COLUMN IF NOT EXISTS payment_processed_at TIMESTAMPTZ;
ALTER TABLE bill_summaries ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT;

-- Permission for the accounts/finance team to process payments, in
-- addition to admins who always can.
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_process_payments BOOLEAN NOT NULL DEFAULT false;

-- In-app notifications: submitters are notified of status changes on their
-- own documents, and approvers/checkers are notified when something needs
-- their action.
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- Admin-configurable list of job designations (shown when adding/editing users).
CREATE TABLE IF NOT EXISTS designation_options (
  id SERIAL PRIMARY KEY,
  label TEXT UNIQUE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Self-service profile: photo and signature are stored as small base64 data
-- URLs (resized client-side before upload) so no separate file storage is
-- needed. Signatures are stamped onto documents automatically wherever
-- that person appears as Prepared/Checked/Approved by.
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_data TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_data TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Bank details for advance payment / reimbursement transfers.
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

-- When true, the user is forced to change their password before they can
-- use the rest of the app. Set on new-user creation and on admin password
-- resets; cleared automatically once the user sets their own password.
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Admin-configurable "Nature of Payment" options for Bill Summary line items.
CREATE TABLE IF NOT EXISTS nature_of_payment_options (
  id SERIAL PRIMARY KEY,
  label TEXT UNIQUE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- App-wide settings, e.g. display timezone. Single row per key.
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

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

-- Type of travel advance (Preventive Maintenance / Installation / Training),
-- an expected completion date that drives the day-before reminder, and the
-- ability to request an extension that stays on the same document (needs
-- re-approval, so it goes back to 'submitted' with a snapshot to roll back
-- to if the extension itself is rejected).
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS request_type TEXT;
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS expected_end_date DATE;
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS task_completed_at TIMESTAMPTZ;
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS task_completed_by INTEGER REFERENCES users(id);
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS last_reminder_sent_on DATE;
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS is_extension_pending BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS extension_history JSONB NOT NULL DEFAULT '[]';
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS pre_extension_snapshot JSONB;

-- Generic admin-configurable option lists, keyed by list_key, used for
-- everything from the Travel Advance "type" dropdown to Machine
-- Name/Model/Category/Facility pickers to Shipping Expense types. One
-- table instead of one bespoke table per list.
CREATE TABLE IF NOT EXISTS option_lists (
  id SERIAL PRIMARY KEY,
  list_key TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(list_key, label)
);
CREATE INDEX IF NOT EXISTS idx_option_lists_key ON option_lists(list_key, sort_order);

INSERT INTO option_lists (list_key, label, sort_order) VALUES
  ('travel_advance_type','Preventive Maintenance',0),
  ('travel_advance_type','Installation',1),
  ('travel_advance_type','Training',2),
  ('machine_category','Chemistry Analyzer',0),
  ('machine_category','Hematology Analyzer',1),
  ('machine_category','Immunoassay Analyzer',2),
  ('machine_category','Coagulation Analyzer',3),
  ('machine_category','Blood Gas Analyzer',4),
  ('shipping_expense_type','Boat Charge',0),
  ('shipping_expense_type','Taxi Fee',1),
  ('shipping_expense_type','Delivery Charge',2),
  ('shipping_expense_type','Crane Charge',3),
  ('shipping_expense_type','Food Expenses',4),
  ('shipping_expense_type','Other',5)
ON CONFLICT (list_key, label) DO NOTHING;

-- Shipping Expense Requests: same prepared/checked/approved workflow and
-- per-company reference numbering (doc type 'SHP') as advance requests
-- and bill summaries, with its own line item shape.
CREATE TABLE IF NOT EXISTS shipping_expense_requests (
  id SERIAL PRIMARY KEY,
  ref_number TEXT UNIQUE NOT NULL,
  engineer_id INTEGER NOT NULL REFERENCES users(id),
  request_date DATE NOT NULL,
  notes TEXT,
  line_items JSONB NOT NULL DEFAULT '[]', -- [{date, description, dnNumber, refNo, location, expenseType, amount, currency}]
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  company TEXT NOT NULL DEFAULT 'PSMS',
  status TEXT NOT NULL DEFAULT 'submitted',
  prepared_by INTEGER REFERENCES users(id),
  prepared_at TIMESTAMPTZ,
  checked_by INTEGER REFERENCES users(id),
  checked_at TIMESTAMPTZ,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  payment_status TEXT,
  payment_slip_data TEXT,
  payment_processed_by INTEGER REFERENCES users(id),
  payment_processed_at TIMESTAMPTZ,
  payment_rejection_reason TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by INTEGER REFERENCES users(id),
  deletion_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shipping_engineer ON shipping_expense_requests(engineer_id);

-- Admin-defined conditional formatting rules for the PM schedule grid.
-- Evaluated in priority order (lowest first); the first matching rule
-- for a cell (or row, if apply_to='row') wins.
-- Configurable roles: each role is a named bundle of permissions, so an
-- admin can create roles beyond the original engineer/approver/admin
-- three (e.g. "Accountant") without any code change. users.role stores
-- the role's key (soft reference, no FK — matches the style of other
-- free-text enum-like columns in this schema, e.g. advance_requests.company).
-- The engineer/approver/admin system roles are seeded to reproduce
-- exactly what the hardcoded 3-tier system did before this table existed.
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  can_check BOOLEAN NOT NULL DEFAULT FALSE,
  can_final_approve BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_machines BOOLEAN NOT NULL DEFAULT FALSE,
  can_access_pm_dashboard BOOLEAN NOT NULL DEFAULT FALSE,
  can_process_payments BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_users BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_config BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete_records BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_all_records BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO roles
  (key, label, is_system, can_check, can_final_approve, can_manage_machines, can_access_pm_dashboard,
   can_process_payments, can_manage_users, can_manage_config, can_delete_records, can_view_all_records, sort_order)
VALUES
  ('engineer', 'Engineer', true, false, false, false, false, false, false, false, false, false, 0),
  ('approver', 'Approver', true, true,  false, false, false, false, false, false, false, true,  1),
  ('admin',    'Admin',    true, true,  true,  true,  true,  true,  true,  true,  true,  true,  2)
ON CONFLICT (key) DO NOTHING;

-- Split a few of the broader permissions above along tab boundaries, so
-- e.g. PM Schedule's "Columns" editor can be granted without also handing
-- out all of Configure, or someone can see the Reports tab without seeing
-- Engineer Performance.
ALTER TABLE roles ADD COLUMN IF NOT EXISTS can_manage_pm_columns BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS can_manage_pm_rules BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS can_view_reports BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS can_view_activity_log BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS can_view_engineer_performance BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS can_manage_roles BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill the built-in roles so the new, narrower permissions reproduce
-- what the old broader ones already granted them. Custom roles keep the
-- column defaults (false) and can be granted these individually from the
-- Roles page, same as any newly-added permission.
UPDATE roles SET can_manage_pm_columns=true, can_manage_pm_rules=true, can_view_reports=true, can_manage_roles=true WHERE key='admin';
UPDATE roles SET can_view_reports=true, can_view_activity_log=true, can_view_engineer_performance=true WHERE key='approver';

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
