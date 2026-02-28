import type { Context } from 'hono';
import type { IceServersResponse } from '@cloudia/shared';
import type { Env } from '../db/queries';

export const iceServersHandler = (c: Context<{ Bindings: Env }>) => {
  const response: IceServersResponse = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Public free TURN servers (OpenRelay)
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  };
  return c.json(response);
};
