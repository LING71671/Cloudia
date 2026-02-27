import type { RoomInfo, RoomMode } from '@cloudia/shared';

export interface Env {
  DB: D1Database;
  CHAT_ROOM: DurableObjectNamespace;
}

export async function listRooms(db: D1Database): Promise<RoomInfo[]> {
  const result = await db.prepare(`
    SELECT r.id, r.name, r.mode, r.created_at as createdAt,
           r.owner_client_id as ownerClientId,
           COUNT(rm.client_id) as memberCount
    FROM rooms r
    LEFT JOIN room_members rm ON r.id = rm.room_id
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `).all();
  return result.results as unknown as RoomInfo[];
}

export async function createRoom(
  db: D1Database,
  room: {
    id: string;
    name: string;
    mode: RoomMode;
    ownerClientId: string;
    ownerPublicKey: string;
  },
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO rooms (id, name, mode, owner_client_id, owner_public_key) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(room.id, room.name, room.mode, room.ownerClientId, room.ownerPublicKey)
    .run();
}

export async function getRoom(db: D1Database, roomId: string): Promise<RoomInfo | null> {
  const result = await db
    .prepare(
      `SELECT r.id, r.name, r.mode, r.created_at as createdAt,
              r.owner_client_id as ownerClientId,
              COUNT(rm.client_id) as memberCount
       FROM rooms r
       LEFT JOIN room_members rm ON r.id = rm.room_id
       WHERE r.id = ?
       GROUP BY r.id`,
    )
    .bind(roomId)
    .first<RoomInfo>();
  return result ?? null;
}

export async function insertMessage(
  db: D1Database,
  msg: {
    id: string;
    roomId: string;
    senderId: string;
    type: string;
    content: string;
    timestamp: number;
    signature: string;
  },
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO messages (id, room_id, sender_id, type, content, timestamp, signature) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(msg.id, msg.roomId, msg.senderId, msg.type, msg.content, msg.timestamp, msg.signature)
    .run();
}

export async function getMessages(
  db: D1Database,
  roomId: string,
  limit = 50,
  before?: number,
): Promise<unknown[]> {
  if (before) {
    const result = await db
      .prepare(
        'SELECT * FROM messages WHERE room_id = ? AND timestamp < ? ORDER BY timestamp DESC LIMIT ?',
      )
      .bind(roomId, before, limit)
      .all();
    return result.results;
  }
  const result = await db
    .prepare(
      'SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT ?',
    )
    .bind(roomId, limit)
    .all();
  return result.results;
}

export async function upsertMember(
  db: D1Database,
  member: {
    roomId: string;
    clientId: string;
    publicKey: string;
    displayName?: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO room_members (room_id, client_id, public_key, display_name)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (room_id, client_id) DO UPDATE SET
         public_key = excluded.public_key,
         display_name = excluded.display_name`,
    )
    .bind(member.roomId, member.clientId, member.publicKey, member.displayName ?? null)
    .run();
}

export async function removeMember(
  db: D1Database,
  roomId: string,
  clientId: string,
): Promise<void> {
  await db
    .prepare('DELETE FROM room_members WHERE room_id = ? AND client_id = ?')
    .bind(roomId, clientId)
    .run();
}
