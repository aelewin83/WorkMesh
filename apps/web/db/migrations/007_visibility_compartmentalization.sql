-- Relai Phase 3 visibility and compartmentalization controls.
-- Run with psql "$DATABASE_URL" -f apps/web/db/migrations/007_visibility_compartmentalization.sql

ALTER TABLE engagements
  ADD COLUMN IF NOT EXISTS visibility_mode TEXT NOT NULL DEFAULT 'compartmentalized',
  ADD COLUMN IF NOT EXISTS contributor_dm_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS roster_visibility_level TEXT NOT NULL DEFAULT 'role_only';

ALTER TABLE coordination_room_participants
  ADD COLUMN IF NOT EXISTS visibility_level TEXT NOT NULL DEFAULT 'role_only',
  ADD COLUMN IF NOT EXISTS dm_permission TEXT NOT NULL DEFAULT 'room_only',
  ADD COLUMN IF NOT EXISTS alias_override TEXT,
  ADD COLUMN IF NOT EXISTS disclosure_state TEXT NOT NULL DEFAULT 'minimal';

CREATE INDEX IF NOT EXISTS idx_engagements_visibility_mode ON engagements(visibility_mode);
CREATE INDEX IF NOT EXISTS idx_coordination_participants_dm_permission ON coordination_room_participants(dm_permission);
CREATE INDEX IF NOT EXISTS idx_coordination_participants_disclosure_state ON coordination_room_participants(disclosure_state);
