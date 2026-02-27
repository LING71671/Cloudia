import type { Plugin, PluginContext } from '../plugin-manager';
import type { MessageEnvelope } from '@cloudia/shared';

const WINDOW_MS = 10_000;
const MAX_MESSAGES = 30;

const windows = new Map<string, number[]>();

export const rateLimiter: Plugin = {
  name: 'rate-limiter',

  async before(msg: MessageEnvelope, ctx: PluginContext): Promise<boolean> {
    const now = Date.now();
    const key = msg.from;

    let timestamps = windows.get(key);
    if (!timestamps) {
      timestamps = [];
      windows.set(key, timestamps);
    }

    // Prune expired entries
    const cutoff = now - WINDOW_MS;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }

    if (timestamps.length >= MAX_MESSAGES) {
      ctx.ws.send(
        JSON.stringify({
          id: crypto.randomUUID(),
          type: 'system',
          from: '__server__',
          roomId: ctx.roomId,
          timestamp: now,
          signature: '',
          payload: { content: 'Rate limit exceeded. Please slow down.', level: 'warn' },
        }),
      );
      return false;
    }

    timestamps.push(now);
    return true;
  },
};
