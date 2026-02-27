import type { Plugin, PluginContext } from '../plugin-manager';
import type { MessageEnvelope } from '@cloudia/shared';

/** Basic content filter — blocks messages containing banned words */
const BANNED_PATTERNS: string[] = [
  // Add patterns as needed; this is a placeholder for extensibility
];

export const contentFilter: Plugin = {
  name: 'content-filter',

  async before(msg: MessageEnvelope, ctx: PluginContext): Promise<boolean> {
    if (msg.type !== 'text' && msg.type !== 'ephemeral-text') return true;

    // Ephemeral messages are encrypted — server can't inspect them
    if (msg.type === 'ephemeral-text') return true;

    const payload = msg.payload as { content: string };
    const text = payload.content.toLowerCase();

    for (const pattern of BANNED_PATTERNS) {
      if (text.includes(pattern)) {
        ctx.ws.send(
          JSON.stringify({
            id: crypto.randomUUID(),
            type: 'system',
            from: '__server__',
            roomId: ctx.roomId,
            timestamp: Date.now(),
            signature: '',
            payload: { content: 'Message blocked by content filter.', level: 'warn' },
          }),
        );
        return false;
      }
    }

    return true;
  },
};
