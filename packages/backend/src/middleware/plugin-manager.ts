import type { MessageEnvelope } from '@cloudia/shared';

export interface PluginContext {
  ws: WebSocket;
  roomId: string;
  roomMode: 'standard' | 'ephemeral';
}

export interface Plugin {
  name: string;
  /** Return false to block the message from proceeding */
  before?(msg: MessageEnvelope, ctx: PluginContext): Promise<boolean>;
  after?(msg: MessageEnvelope, ctx: PluginContext): Promise<void>;
}

export class PluginManager {
  private plugins: Plugin[] = [];

  register(plugin: Plugin): void {
    this.plugins.push(plugin);
  }

  async runBefore(msg: MessageEnvelope, ctx: PluginContext): Promise<boolean> {
    for (const plugin of this.plugins) {
      if (plugin.before) {
        const ok = await plugin.before(msg, ctx);
        if (!ok) return false;
      }
    }
    return true;
  }

  async runAfter(msg: MessageEnvelope, ctx: PluginContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.after) {
        await plugin.after(msg, ctx);
      }
    }
  }
}
