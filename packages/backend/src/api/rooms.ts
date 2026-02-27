import type { Context } from 'hono';
import type { CreateRoomRequest, CreateRoomResponse, ListRoomsResponse } from '@cloudia/shared';
import { type Env, listRooms, createRoom, getRoom, getMessages } from '../db/queries';

export const listRoomsHandler = async (c: Context<{ Bindings: Env }>) => {
  const rooms = await listRooms(c.env.DB);
  const response: ListRoomsResponse = { rooms };
  return c.json(response);
};

export const createRoomHandler = async (c: Context<{ Bindings: Env }>) => {
  const body = await c.req.json<CreateRoomRequest>();

  if (!body.name || !body.mode || !body.ownerPublicKey) {
    return c.json({ error: 'Missing required fields: name, mode, ownerPublicKey' }, 400);
  }

  if (body.mode !== 'standard' && body.mode !== 'ephemeral') {
    return c.json({ error: 'mode must be "standard" or "ephemeral"' }, 400);
  }

  const id = crypto.randomUUID();
  const ownerClientId = c.req.header('X-Client-ID') ?? 'anonymous';

  await createRoom(c.env.DB, {
    id,
    name: body.name,
    mode: body.mode,
    ownerClientId,
    ownerPublicKey: JSON.stringify(body.ownerPublicKey),
  });

  const room = await getRoom(c.env.DB, id);
  const response: CreateRoomResponse = { room: room! };
  return c.json(response, 201);
};

export const getRoomHandler = async (c: Context<{ Bindings: Env }>) => {
  const roomId = c.req.param('roomId');
  const room = await getRoom(c.env.DB, roomId);

  if (!room) {
    return c.json({ error: 'Room not found' }, 404);
  }

  return c.json({ room });
};

export const getMessagesHandler = async (c: Context<{ Bindings: Env }>) => {
  const roomId = c.req.param('roomId');
  const room = await getRoom(c.env.DB, roomId);

  if (!room) {
    return c.json({ error: 'Room not found' }, 404);
  }

  // Ephemeral rooms: strictly forbidden to fetch history
  if (room.mode === 'ephemeral') {
    return c.json({ error: 'History is not available for ephemeral rooms' }, 403);
  }

  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
  const before = c.req.query('before') ? Number(c.req.query('before')) : undefined;

  const messages = await getMessages(c.env.DB, roomId, limit, before);
  return c.json({ messages });
};
