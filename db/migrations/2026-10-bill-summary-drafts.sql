-- Bill summary draft editing and explicit final submission.
-- Safe to run more than once; setup also applies this migration on deploy.
ALTER TABLE bill_summaries ADD COLUMN IF NOT EXISTS final_submitted_at TIMESTAMPTZ;

-- Existing records were already submitted into the approval workflow, so
-- leave their existing statuses and timestamps intact.
