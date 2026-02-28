import type { Context } from 'hono';
import type { CreateRoomRequest, CreateRoomResponse, ListRoomsResponse, RoomAccessLevel } from '@cloudia/shared';
import {
  type Env, listRooms, createRoom, getRoom, getMessages,
  generateShortCode, hashPassword, getRoomByShortCode,
  findDmRoom, createDmPair, deleteRoom,
} from '../db/queries';

export const listRoomsHandler = async (c: Context<{ Bindings: Env }>) => {
  const rooms = await listRooms(c.env.DB);
  const response: ListRoomsResponse = { rooms };
  return c.json(response);
};

async function computeDmRoomId(a: string, b: string): Promise<string> {
  const sorted = [a, b].sort().join(':');
  const encoded = new TextEncoder().encode(sorted);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

export const createRoomHandler = async (c: Context<{ Bindings: Env }>) => {
  const body = await c.req.json<CreateRoomRequest>();

  if (!body.name || !body.mode || !body.ownerPublicKey) {
    return c.json({ error: 'Missing required fields: name, mode, ownerPublicKey' }, 400);
  }
  if (body.mode !== 'standard' && body.mode !== 'ephemeral') {
    return c.json({ error: 'mode must be "standard" or "ephemeral"' }, 400);
  }

  const accessLevel: RoomAccessLevel = body.accessLevel ?? 'public';
  const validLevels: RoomAccessLevel[] = ['public', 'password', 'private', 'dm'];
  if (!validLevels.includes(accessLevel)) {
    return c.json({ error: 'Invalid accessLevel' }, 400);
  }

  const ownerClientId = c.req.header('X-Client-ID') ?? 'anonymous';

  // DM-specific logic
  if (accessLevel === 'dm') {
    if (!body.participants || body.participants.length !== 2) {
      return c.json({ error: 'DM rooms require exactly 2 participants' }, 400);
    }
    if (!body.participants.includes(ownerClientId)) {
      return c.json({ error: 'Creator must be one of the DM participants' }, 400);
    }
    // Standard DM: check existing
    if (body.mode === 'standard') {
      const existingRoomId = await findDmRoom(c.env.DB, body.participants[0], body.participants[1]);
      if (existingRoomId) {
        const existingRoom = await getRoom(c.env.DB, existingRoomId);
        if (existingRoom) return c.json({ room: existingRoom }, 200);
      }
    }
  }

  // Password hashing
  let passwordHash: string | undefined;
  if (accessLevel === 'password') {
    if (!body.password) return c.json({ error: 'Password rooms require a password' }, 400);
    passwordHash = await hashPassword(body.password);
  }

  // Generate ID
  const id = (accessLevel === 'dm' && body.mode === 'standard' && body.participants)
    ? await computeDmRoomId(body.participants[0], body.participants[1])
    : crypto.randomUUID();

  // Generate short code with retry on collision
  let shortCode = generateShortCode();
  try {
    await createRoom(c.env.DB, {
      id, name: body.name, mode: body.mode, accessLevel,
      ownerClientId, ownerPublicKey: JSON.stringify(body.ownerPublicKey),
      shortCode, passwordHash,
    });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE') && e.message?.includes('short_code')) {
      shortCode = generateShortCode();
      await createRoom(c.env.DB, {
        id, name: body.name, mode: body.mode, accessLevel,
        ownerClientId, ownerPublicKey: JSON.stringify(body.ownerPublicKey),
        shortCode, passwordHash,
      });
    } else {
      throw e;
    }
  }

  // Register DM pair
  if (accessLevel === 'dm' && body.participants) {
    await createDmPair(c.env.DB, body.participants[0], body.participants[1], id);
  }

  const room = await getRoom(c.env.DB, id);
  return c.json({ room: room! } satisfies CreateRoomResponse, 201);
};

export const getRoomHandler = async (c: Context<{ Bindings: Env }>) => {
  const roomId = c.req.param('roomId');
  const room = await getRoom(c.env.DB, roomId);
  if (!room) return c.json({ error: 'Room not found' }, 404);
  return c.json({ room });
};

export const lookupByShortCodeHandler = async (c: Context<{ Bindings: Env }>) => {
  const shortCode = c.req.param('shortCode');
  if (!shortCode || shortCode.length !== 6) return c.json({ error: 'Invalid short code' }, 400);
  const room = await getRoomByShortCode(c.env.DB, shortCode);
  if (!room) return c.json({ error: 'Room not found' }, 404);
  return c.json({ room });
};

export const getMessagesHandler = async (c: Context<{ Bindings: Env }>) => {
  const roomId = c.req.param('roomId');
  const room = await getRoom(c.env.DB, roomId);
  if (!room) return c.json({ error: 'Room not found' }, 404);
  if (room.mode === 'ephemeral') return c.json({ error: 'History is not available for ephemeral rooms' }, 403);

  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
  const before = c.req.query('before') ? Number(c.req.query('before')) : undefined;
  const messages = await getMessages(c.env.DB, roomId, limit, before);
  return c.json({ messages });
};

export const deleteRoomHandler = async (c: Context<{ Bindings: Env }>) => {
  const roomId = c.req.param('roomId');
  const clientId = c.req.header('X-Client-ID');
  if (!clientId) return c.json({ error: 'X-Client-ID required' }, 401);
  const room = await getRoom(c.env.DB, roomId);
  if (!room) return c.json({ error: 'Room not found' }, 404);
  if (room.ownerClientId !== clientId) return c.json({ error: 'Forbidden' }, 403);
  await deleteRoom(c.env.DB, roomId);
  return c.json({ ok: true });
};
