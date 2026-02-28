import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './db/queries';
import { iceServersHandler } from './api/ice-servers';
import { uploadHandler, downloadHandler } from './api/media';
import {
  listRoomsHandler,
  createRoomHandler,
  getRoomHandler,
  getMessagesHandler,
  lookupByShortCodeHandler,
  deleteRoomHandler,
} from './api/rooms';
import { getRoomWithAuth, getDmParticipants } from './db/queries';

export { ChatRoom } from './durable-objects/chat-room';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', cors());

// REST API
app.get('/api/ice-servers', iceServersHandler);
app.get('/api/rooms', listRoomsHandler);
app.post('/api/rooms', createRoomHandler);
app.get('/api/rooms/code/:shortCode', lookupByShortCodeHandler);
app.get('/api/rooms/:roomId', getRoomHandler);
app.get('/api/rooms/:roomId/messages', getMessagesHandler);
app.delete('/api/rooms/:roomId', deleteRoomHandler);

// Media upload/download (R2)
app.post('/api/media/upload', uploadHandler);
app.get('/api/media/:key', downloadHandler);

// WebSocket upgrade → Durable Object
app.get('/api/ws/:roomId', async (c) => {
  const roomId = c.req.param('roomId');

  // Fetch room auth config from D1
  const room = await getRoomWithAuth(c.env.DB, roomId);
  if (!room) return c.json({ error: 'Room not found' }, 404);

  const id = c.env.CHAT_ROOM.idFromName(roomId);
  const stub = c.env.CHAT_ROOM.get(id);

  // Forward the upgrade request to the DO, passing room config as query params
  const url = new URL(c.req.url);
  url.searchParams.set('mode', room.mode);
  url.searchParams.set('name', room.name);
  url.searchParams.set('roomId', roomId);
  url.searchParams.set('accessLevel', room.accessLevel);
  if (room.passwordHash) url.searchParams.set('passwordHash', room.passwordHash);
  if (room.ownerPublicKey) url.searchParams.set('ownerPublicKey', room.ownerPublicKey);

  // DM participants
  if (room.accessLevel === 'dm') {
    const participants = await getDmParticipants(c.env.DB, roomId);
    if (participants) {
      url.searchParams.set('dmParticipants', JSON.stringify(participants));
    }
  }

  // Client auth credentials (password, accessToken, clientId) are already on the URL

  return stub.fetch(new Request(url.toString(), c.req.raw));
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', version: '0.0.1' }));

export default app;
