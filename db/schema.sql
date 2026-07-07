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
