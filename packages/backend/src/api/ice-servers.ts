import type { Context } from 'hono';
import type { IceServersResponse } from '@cloudia/shared';
import type { Env } from '../db/queries';

export const iceServersHandler = (c: Context<{ Bindings: Env }>) => {
  const response: IceServersResponse = {
    iceServers: [
      { urls: 'stun:stun.relay.metered.ca:80' },
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: 'b0f7eddf7a4b2ca489c9264f',
        credential: 'NXSgirHqzgzQ0Eso',
      },
      {
        urls: 'turn:global.relay.metered.ca:80?transport=tcp',
        username: 'b0f7eddf7a4b2ca489c9264f',
        credential: 'NXSgirHqzgzQ0Eso',
      },
      {
        urls: 'turn:global.relay.metered.ca:443',
        username: 'b0f7eddf7a4b2ca489c9264f',
        credential: 'NXSgirHqzgzQ0Eso',
      },
      {
        urls: 'turns:global.relay.metered.ca:443?transport=tcp',
        username: 'b0f7eddf7a4b2ca489c9264f',
        credential: 'NXSgirHqzgzQ0Eso',
      },
    ],
  };
  return c.json(response);
};
