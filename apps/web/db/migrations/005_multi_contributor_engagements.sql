-- Relai Phase 1 multi-contributor engagement foundation.
-- Run with psql "$DATABASE_URL" -f apps/web/db/migrations/005_multi_contributor_engagements.sql

CREATE TABLE IF NOT EXISTS engagements (
  id TEXT PRIMARY KEY,
  employer_wallet TEXT NOT NULL,
  title TEXT NOT NULL,
  operational_focus TEXT NOT NULL,
  description_preview TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available',
  contributor_ids TEXT[] NOT NULL DEFAULT '{}',
  team_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS engagement_contributors (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  contributor_wallet TEXT NOT NULL,
  contributor_handle TEXT NOT NULL DEFAULT 'Pseudonymous contributor',
  assigned_role TEXT NOT NULL DEFAULT 'Contributor',
  operational_focus TEXT NOT NULL DEFAULT 'custom',
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'accepted',
  agreement_id TEXT REFERENCES agreements(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, contributor_wallet)
);

CREATE INDEX IF NOT EXISTS idx_engagements_employer_wallet ON engagements(employer_wallet);
CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);
CREATE INDEX IF NOT EXISTS idx_engagement_contributors_engagement_id ON engagement_contributors(engagement_id);
CREATE INDEX IF NOT EXISTS idx_engagement_contributors_wallet ON engagement_contributors(contributor_wallet);
CREATE INDEX IF NOT EXISTS idx_engagement_contributors_status ON engagement_contributors(status);
