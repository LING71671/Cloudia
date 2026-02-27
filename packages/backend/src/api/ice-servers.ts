import type { Context } from 'hono';
import type { IceServersResponse } from '@cloudia/shared';
import type { Env } from '../db/queries';

export const iceServersHandler = (c: Context<{ Bindings: Env }>) => {
  const response: IceServersResponse = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Production: add TURN servers from env vars
      // { urls: 'turn:turn.example.com:3478', username: '...', credential: '...' },
    ],
  };
  return c.json(response);
};
