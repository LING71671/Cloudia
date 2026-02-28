import type { RoomInfo, RoomMode, RoomAccessLevel } from '@cloudia/shared';
import { SHORT_CODE_LENGTH, SHORT_CODE_CHARSET } from '@cloudia/shared';

export interface Env {
  DB: D1Database;
  CHAT_ROOM: DurableObjectNamespace;
  MEDIA: R2Bucket;
}

// --- Short code generation ---

export function generateShortCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SHORT_CODE_LENGTH));
  return Array.from(bytes)
    .map((b) => SHORT_CODE_CHARSET[b % SHORT_CODE_CHARSET.length])
    .join('');
}

// --- Password hashing ---

export async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// --- Room CRUD ---

const ROOM_SELECT = `
  SELECT r.id, r.name, r.mode,
         r.access_level as accessLevel,
         r.short_code as shortCode,
         r.created_at as createdAt,
         r.owner_client_id as ownerClientId,
         COUNT(rm.client_id) as memberCount
  FROM rooms r
  LEFT JOIN room_members rm ON r.id = rm.room_id`;

export async function listRooms(db: D1Database): Promise<RoomInfo[]> {
  const result = await db.prepare(`
    ${ROOM_SELECT}
    WHERE r.access_level IN ('public', 'password')
    GROUP BY r.id ORDER BY r.created_at DESC
  `).all();
  return result.results as unknown as RoomInfo[];
}

export async function createRoom(
  db: D1Database,
  room: {
    id: string;
    name: string;
    mode: RoomMode;
    accessLevel: RoomAccessLevel;
    ownerClientId: string;
    ownerPublicKey: string;
    shortCode: string;
    passwordHash?: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO rooms (id, name, mode, access_level, owner_client_id, owner_public_key, short_code, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      room.id, room.name, room.mode, room.accessLevel,
      room.ownerClientId, room.ownerPublicKey,
      room.shortCode, room.passwordHash ?? null,
    )
    .run();
}

export async function getRoom(db: D1Database, roomId: string): Promise<RoomInfo | null> {
  const result = await db
    .prepare(`${ROOM_SELECT} WHERE r.id = ? GROUP BY r.id`)
    .bind(roomId)
    .first<RoomInfo>();
  return result ?? null;
}

export async function getRoomByShortCode(db: D1Database, shortCode: string): Promise<RoomInfo | null> {
  const result = await db
    .prepare(`${ROOM_SELECT} WHERE r.short_code = ? GROUP BY r.id`)
    .bind(shortCode.toUpperCase())
    .first<RoomInfo>();
  return result ?? null;
}

export async function getRoomWithAuth(
  db: D1Database,
  roomId: string,
): Promise<(RoomInfo & { passwordHash?: string; ownerPublicKey: string }) | null> {
  const result = await db
    .prepare(
      `SELECT r.id, r.name, r.mode,
              r.access_level as accessLevel,
              r.short_code as shortCode,
              r.created_at as createdAt,
              r.owner_client_id as ownerClientId,
              r.password_hash as passwordHash,
              r.owner_public_key as ownerPublicKey,
              COUNT(rm.client_id) as memberCount
       FROM rooms r
       LEFT JOIN room_members rm ON r.id = rm.room_id
       WHERE r.id = ? GROUP BY r.id`,
    )
    .bind(roomId)
    .first();
  return (result as any) ?? null;
}

// --- DM pairs ---

export async function findDmRoom(db: D1Database, a: string, b: string): Promise<string | null> {
  const [pa, pb] = [a, b].sort();
  const result = await db
    .prepare('SELECT room_id FROM dm_pairs WHERE participant_a = ? AND participant_b = ?')
    .bind(pa, pb)
    .first<{ room_id: string }>();
  return result?.room_id ?? null;
}

export async function createDmPair(db: D1Database, a: string, b: string, roomId: string): Promise<void> {
  const [pa, pb] = [a, b].sort();
  await db
    .prepare('INSERT INTO dm_pairs (participant_a, participant_b, room_id) VALUES (?, ?, ?)')
    .bind(pa, pb, roomId)
    .run();
}

// --- Messages ---

export async function insertMessage(
  db: D1Database,
  msg: {
    id: string; roomId: string; senderId: string;
    type: string; content: string; timestamp: number; signature: string;
  },
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO messages (id, room_id, sender_id, type, content, timestamp, signature) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(msg.id, msg.roomId, msg.senderId, msg.type, msg.content, msg.timestamp, msg.signature)
    .run();
}

export async function getMessages(db: D1Database, roomId: string, limit = 50, before?: number): Promise<unknown[]> {
  const sql = before
    ? 'SELECT * FROM messages WHERE room_id = ? AND timestamp < ? ORDER BY timestamp DESC LIMIT ?'
    : 'SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT ?';
  const binds = before ? [roomId, before, limit] : [roomId, limit];
  const result = await db.prepare(sql).bind(...binds).all();
  return result.results;
}

// --- Members ---

export async function upsertMember(
  db: D1Database,
  member: { roomId: string; clientId: string; publicKey: string; displayName?: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO room_members (room_id, client_id, public_key, display_name)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (room_id, client_id) DO UPDATE SET
         public_key = excluded.public_key, display_name = excluded.display_name`,
    )
    .bind(member.roomId, member.clientId, member.publicKey, member.displayName ?? null)
    .run();
}

export async function removeMember(db: D1Database, roomId: string, clientId: string): Promise<void> {
  await db
    .prepare('DELETE FROM room_members WHERE room_id = ? AND client_id = ?')
    .bind(roomId, clientId)
    .run();
}

// --- DM participants lookup ---

export async function deleteRoom(db: D1Database, roomId: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM messages WHERE room_id = ?').bind(roomId),
    db.prepare('DELETE FROM room_members WHERE room_id = ?').bind(roomId),
    db.prepare('DELETE FROM dm_pairs WHERE room_id = ?').bind(roomId),
    db.prepare('DELETE FROM rooms WHERE id = ?').bind(roomId),
  ]);
}

export async function getDmParticipants(
  db: D1Database,
  roomId: string,
): Promise<[string, string] | null> {
  const result = await db
    .prepare('SELECT participant_a, participant_b FROM dm_pairs WHERE room_id = ?')
    .bind(roomId)
    .first<{ participant_a: string; participant_b: string }>();
  if (!result) return null;
  return [result.participant_a, result.participant_b];
}
