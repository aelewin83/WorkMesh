-- Relai Phase 2 secure group coordination room foundation.
-- Run with psql "$DATABASE_URL" -f apps/web/db/migrations/006_secure_group_coordination_rooms.sql

CREATE TABLE IF NOT EXISTS coordination_rooms (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  employer_wallet TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'engagement_group',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, room_type)
);

CREATE TABLE IF NOT EXISTS coordination_room_participants (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES coordination_rooms(id) ON DELETE CASCADE,
  engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  handle TEXT NOT NULL DEFAULT 'Pseudonymous participant',
  participant_type TEXT NOT NULL,
  assigned_role TEXT NOT NULL DEFAULT 'Contributor',
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  UNIQUE (room_id, wallet_address)
);

CREATE TABLE IF NOT EXISTS coordination_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES coordination_rooms(id) ON DELETE CASCADE,
  engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  sender_wallet TEXT NOT NULL,
  sender_handle TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  attachment_refs TEXT[] NOT NULL DEFAULT '{}',
  read_receipts JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coordination_rooms_engagement ON coordination_rooms(engagement_id);
CREATE INDEX IF NOT EXISTS idx_coordination_room_participants_room ON coordination_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_coordination_room_participants_engagement ON coordination_room_participants(engagement_id);
CREATE INDEX IF NOT EXISTS idx_coordination_room_participants_wallet ON coordination_room_participants(wallet_address);
CREATE INDEX IF NOT EXISTS idx_coordination_messages_room_created ON coordination_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_coordination_messages_engagement ON coordination_messages(engagement_id);
CREATE INDEX IF NOT EXISTS idx_coordination_messages_sender ON coordination_messages(sender_wallet);
