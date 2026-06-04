-- Relai contractor workflow persistence baseline.
-- Run with psql "$DATABASE_URL" -f apps/web/db/migrations/001_relai_contractor_workflow.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS contractor_profiles (
  wallet_address TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  public_key TEXT,
  signing_public_key TEXT,
  verticals TEXT[] NOT NULL DEFAULT '{}',
  skills TEXT[] NOT NULL DEFAULT '{}',
  custom_skills TEXT[] NOT NULL DEFAULT '{}',
  public_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  region JSONB NOT NULL DEFAULT '{}'::jsonb,
  availability JSONB NOT NULL DEFAULT '{}'::jsonb,
  privacy_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  encrypted_private_blob_ref TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  trust_score INTEGER NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gigs (
  id TEXT PRIMARY KEY,
  employer_wallet TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  verticals TEXT[] NOT NULL DEFAULT '{}',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  required_level INTEGER NOT NULL DEFAULT 1,
  pay NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  location_mode TEXT NOT NULL DEFAULT 'local',
  distance_miles NUMERIC(8,2) NOT NULL DEFAULT 0,
  time_window TEXT,
  urgency TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'available',
  escrow_required BOOLEAN NOT NULL DEFAULT TRUE,
  contractor_wallet TEXT,
  applicant_wallets TEXT[] NOT NULL DEFAULT '{}',
  encrypted_details_ref TEXT,
  coordinates JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agreements (
  id TEXT PRIMARY KEY,
  gig_id TEXT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  employer_wallet TEXT NOT NULL,
  contractor_wallet TEXT NOT NULL,
  terms_ref TEXT NOT NULL,
  terms_preview TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  accepted_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  employer_confirmed_at TIMESTAMPTZ,
  dispute_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agreement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id TEXT NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  actor_wallet TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS completion_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id TEXT NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  uploaded_by_wallet TEXT NOT NULL,
  proof_type TEXT NOT NULL,
  encrypted_file_ref TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  encrypted_size INTEGER NOT NULL DEFAULT 0,
  note_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_threads (
  id TEXT PRIMARY KEY,
  gig_id TEXT,
  agreement_id TEXT,
  participant_wallets TEXT[] NOT NULL,
  last_message_preview TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS encrypted_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_wallet TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  attachment_refs TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS escrow_states (
  agreement_id TEXT PRIMARY KEY,
  gig_id TEXT,
  status TEXT NOT NULL DEFAULT 'not_funded',
  gross_task_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_payout NUMERIC(12,2) NOT NULL DEFAULT 0,
  gas_estimate NUMERIC(12,4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  chain_id INTEGER,
  contract_address TEXT,
  escrow_id TEXT,
  tx_hash TEXT,
  funded_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chain_events (
  id TEXT PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  event_name TEXT NOT NULL,
  agreement_id TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  block_number NUMERIC(32,0) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_history (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  agreement_id TEXT NOT NULL,
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_payout NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  related_entity_type TEXT NOT NULL,
  related_entity_id TEXT NOT NULL,
  target TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disclosure_audits (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  recipient_wallet TEXT,
  disclosed_fields TEXT[] NOT NULL DEFAULT '{}',
  purpose TEXT NOT NULL,
  agreement_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_verticals ON gigs USING gin(verticals);
CREATE INDEX IF NOT EXISTS idx_gigs_required_skills ON gigs USING gin(required_skills);
CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON encrypted_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_wallet_read ON notifications(wallet_address, read);
CREATE INDEX IF NOT EXISTS idx_chain_events_agreement ON chain_events(agreement_id);
