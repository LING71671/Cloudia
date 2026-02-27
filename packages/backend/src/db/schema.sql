CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('standard', 'ephemeral')),
  access_level TEXT NOT NULL DEFAULT 'public' CHECK (access_level IN ('public', 'password', 'private', 'dm')),
  short_code TEXT UNIQUE,
  password_hash TEXT,
  owner_client_id TEXT NOT NULL,
  owner_public_key TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_short_code ON rooms(short_code);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  sender_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  signature TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_room_ts ON messages(room_id, timestamp);

CREATE TABLE IF NOT EXISTS room_members (
  room_id TEXT NOT NULL REFERENCES rooms(id),
  client_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  display_name TEXT,
  joined_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (room_id, client_id)
);

CREATE TABLE IF NOT EXISTS dm_pairs (
  participant_a TEXT NOT NULL,
  participant_b TEXT NOT NULL,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (participant_a, participant_b)
);
CREATE INDEX IF NOT EXISTS idx_dm_pairs_room ON dm_pairs(room_id);
