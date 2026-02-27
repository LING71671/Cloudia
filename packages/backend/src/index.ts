import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './db/queries';
import { iceServersHandler } from './api/ice-servers';
import {
  listRoomsHandler,
  createRoomHandler,
  getRoomHandler,
  getMessagesHandler,
} from './api/rooms';

export { ChatRoom } from './durable-objects/chat-room';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', cors());

// REST API
app.get('/api/ice-servers', iceServersHandler);
app.get('/api/rooms', listRoomsHandler);
app.post('/api/rooms', createRoomHandler);
app.get('/api/rooms/:roomId', getRoomHandler);
app.get('/api/rooms/:roomId/messages', getMessagesHandler);

// WebSocket upgrade → Durable Object
app.get('/api/ws/:roomId', async (c) => {
  const roomId = c.req.param('roomId');
  const mode = c.req.query('mode') ?? 'standard';
  const name = c.req.query('name') ?? '';

  const id = c.env.CHAT_ROOM.idFromName(roomId);
  const stub = c.env.CHAT_ROOM.get(id);

  // Forward the upgrade request to the DO, passing room config as query params
  const url = new URL(c.req.url);
  url.searchParams.set('mode', mode);
  url.searchParams.set('name', name);

  return stub.fetch(new Request(url.toString(), c.req.raw));
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', version: '0.0.1' }));

export default app;
