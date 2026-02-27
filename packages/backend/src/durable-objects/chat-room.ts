import { DurableObject } from 'cloudflare:workers';
import type { MessageEnvelope, RoomMode, RoomAccessLevel, InvitationToken } from '@cloudia/shared';
import { EPHEMERAL_ROOM_TTL_MS } from '@cloudia/shared';
import { PluginManager } from '../middleware/plugin-manager';
import { rateLimiter } from '../middleware/plugins/rate-limiter';
import { contentFilter } from '../middleware/plugins/content-filter';
import { insertMessage, upsertMember, removeMember } from '../db/queries';

interface SessionMeta {
  clientId: string;
  displayName?: string;
}

interface RoomState {
  mode: RoomMode;
  name: string;
  accessLevel: RoomAccessLevel;
  passwordHash?: string;
  ownerPublicKey?: string;
  dmParticipants?: [string, string];
}

export class ChatRoom extends DurableObject<{ DB: D1Database }> {
  private sessions = new Map<WebSocket, SessionMeta>();
  private roomState: RoomState | null = null;
  private pluginManager: PluginManager;

  constructor(ctx: DurableObjectState, env: { DB: D1Database }) {
    super(ctx, env);

    this.pluginManager = new PluginManager();
    this.pluginManager.register(rateLimiter);
    this.pluginManager.register(contentFilter);

    // Restore hibernated sessions
    for (const ws of this.ctx.getWebSockets()) {
      const meta = ws.deserializeAttachment() as SessionMeta | null;
      if (meta) this.sessions.set(ws, meta);
    }
  }

  async fetch(request: Request): Promise<Response> {
    // Load room state on first request
    if (!this.roomState) {
      this.roomState =
        (await this.ctx.storage.get<RoomState>('roomState')) ?? null;
    }

    // Accept room initialization via query params (set by Worker on first WS connect)
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') as RoomMode | null;
    const name = url.searchParams.get('name');
    if (!this.roomState && mode) {
      this.roomState = {
        mode,
        name: name ?? 'Unnamed Room',
        accessLevel: (url.searchParams.get('accessLevel') as RoomAccessLevel) ?? 'public',
        passwordHash: url.searchParams.get('passwordHash') ?? undefined,
        ownerPublicKey: url.searchParams.get('ownerPublicKey') ?? undefined,
        dmParticipants: url.searchParams.get('dmParticipants')
          ? JSON.parse(url.searchParams.get('dmParticipants')!)
          : undefined,
      };
      await this.ctx.storage.put('roomState', this.roomState);
    }

    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Authorize before accepting WebSocket
    const password = url.searchParams.get('password');
    const accessToken = url.searchParams.get('accessToken');
    const clientId = url.searchParams.get('clientId');

    const authResult = await this.authorize(password, accessToken, clientId);
    if (!authResult.ok) {
      return new Response(authResult.reason ?? 'Forbidden', { status: 403 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  // --- WebSocket Hibernation API handlers ---

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let msg: MessageEnvelope;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    } catch {
      ws.send(JSON.stringify({
        id: crypto.randomUUID(),
        type: 'system',
        from: '__server__',
        roomId: '',
        timestamp: Date.now(),
        signature: '',
        payload: { content: 'Invalid JSON', level: 'error' },
      }));
      return;
    }

    const roomId = this.ctx.id.toString();
    const ctx = {
      ws,
      roomId,
      roomMode: this.roomState?.mode ?? 'standard' as const,
      accessLevel: this.roomState?.accessLevel ?? 'public' as const,
    };

    // Run plugin before-hooks
    const proceed = await this.pluginManager.runBefore(msg, ctx);
    if (!proceed) return;

    switch (msg.type) {
      case 'join':
        await this.handleJoin(ws, msg as MessageEnvelope<'join'>);
        break;
      case 'leave':
        await this.handleLeave(ws, msg);
        break;
      case 'text':
      case 'image':
      case 'audio':
        this.broadcast(msg, ws);
        if (this.roomState?.mode === 'standard') {
          this.persistMessage(msg);
        }
        break;
      case 'ephemeral-text':
        // Pure broadcast — never persist
        this.broadcast(msg, ws);
        break;
      case 'offer':
      case 'answer':
      case 'ice-candidate':
      case 'key-exchange':
        this.relay(msg);
        break;
      default:
        // Unknown type — broadcast anyway for extensibility
        this.broadcast(msg, ws);
    }

    await this.pluginManager.runAfter(msg, ctx);
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    const meta = this.sessions.get(ws);
    this.sessions.delete(ws);

    // Broadcast leave notification
    if (meta) {
      const leaveMsg: MessageEnvelope<'leave'> = {
        id: crypto.randomUUID(),
        type: 'leave',
        from: meta.clientId,
        roomId: this.ctx.id.toString(),
        timestamp: Date.now(),
        signature: '',
        payload: { reason: reason || 'disconnected' },
      };
      this.broadcast(leaveMsg);
    }

    // Ephemeral room: schedule destruction when empty
    if (this.sessions.size === 0 && this.roomState?.mode === 'ephemeral') {
      await this.ctx.storage.setAlarm(Date.now() + EPHEMERAL_ROOM_TTL_MS);
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    this.sessions.delete(ws);
    if (this.sessions.size === 0 && this.roomState?.mode === 'ephemeral') {
      await this.ctx.storage.setAlarm(Date.now() + EPHEMERAL_ROOM_TTL_MS);
    }
  }

  async alarm(): Promise<void> {
    // If still no connections after TTL, destroy the room
    if (this.sessions.size === 0) {
      await this.ctx.storage.deleteAll();
    }
  }

  // --- Private helpers ---

  private async handleJoin(ws: WebSocket, msg: MessageEnvelope<'join'>): Promise<void> {
    // DM 2-person limit
    if (this.roomState?.accessLevel === 'dm') {
      const uniqueClients = new Set(
        Array.from(this.sessions.values()).map((m) => m.clientId),
      );
      uniqueClients.add(msg.from);
      if (uniqueClients.size > 2) {
        ws.send(JSON.stringify({
          id: crypto.randomUUID(),
          type: 'system',
          from: '__server__',
          roomId: msg.roomId,
          timestamp: Date.now(),
          signature: '',
          payload: { content: 'DM rooms are limited to 2 participants', level: 'error' },
        }));
        ws.close(4003, 'DM room full');
        return;
      }
    }

    const meta: SessionMeta = {
      clientId: msg.from,
      displayName: msg.payload.displayName,
    };
    this.sessions.set(ws, meta);
    ws.serializeAttachment(meta);

    // Persist member in D1 for standard rooms
    if (this.roomState?.mode === 'standard') {
      try {
        await upsertMember(this.env.DB, {
          roomId: msg.roomId,
          clientId: msg.from,
          publicKey: JSON.stringify(msg.payload.publicKey),
          displayName: msg.payload.displayName,
        });
      } catch {
        // Non-critical — don't break the join flow
      }
    }

    // Notify others
    this.broadcast(msg, ws);

    // Send current member list to the new joiner
    const members = Array.from(this.sessions.values()).map((m) => ({
      clientId: m.clientId,
      displayName: m.displayName,
    }));
    ws.send(
      JSON.stringify({
        id: crypto.randomUUID(),
        type: 'system',
        from: '__server__',
        roomId: msg.roomId,
        timestamp: Date.now(),
        signature: '',
        payload: {
          content: JSON.stringify({ members, roomMode: this.roomState?.mode }),
          level: 'info',
        },
      }),
    );
  }

  private async handleLeave(ws: WebSocket, msg: MessageEnvelope): Promise<void> {
    const meta = this.sessions.get(ws);
    this.sessions.delete(ws);

    if (meta && this.roomState?.mode === 'standard') {
      try {
        await removeMember(this.env.DB, msg.roomId, meta.clientId);
      } catch {
        // Non-critical
      }
    }

    this.broadcast(msg, ws);
    ws.close(1000, 'left');
  }

  private broadcast(msg: MessageEnvelope, exclude?: WebSocket): void {
    const data = JSON.stringify(msg);
    for (const [ws] of this.sessions) {
      if (ws !== exclude) {
        try {
          ws.send(data);
        } catch {
          // Connection may have died — will be cleaned up on close
        }
      }
    }
  }

  private relay(msg: MessageEnvelope): void {
    if (!msg.to) return;
    for (const [ws, meta] of this.sessions) {
      if (meta.clientId === msg.to) {
        try {
          ws.send(JSON.stringify(msg));
        } catch {
          // Ignore
        }
        return;
      }
    }
  }

  private async persistMessage(msg: MessageEnvelope): Promise<void> {
    try {
      await insertMessage(this.env.DB, {
        id: msg.id,
        roomId: msg.roomId,
        senderId: msg.from,
        type: msg.type,
        content: JSON.stringify(msg.payload),
        timestamp: msg.timestamp,
        signature: msg.signature,
      });
    } catch (e) {
      console.error('Failed to persist message:', e);
    }
  }

  // --- Authorization ---

  private async authorize(
    password?: string | null,
    accessToken?: string | null,
    clientId?: string | null,
  ): Promise<{ ok: boolean; reason?: string }> {
    const level = this.roomState?.accessLevel ?? 'public';

    switch (level) {
      case 'public':
        return { ok: true };

      case 'password': {
        if (!password) return { ok: false, reason: 'Password required' };
        const hash = await this.hashString(password);
        if (hash !== this.roomState?.passwordHash) {
          return { ok: false, reason: 'Incorrect password' };
        }
        return { ok: true };
      }

      case 'private': {
        if (!accessToken) return { ok: false, reason: 'Invitation token required' };
        try {
          const token: InvitationToken = JSON.parse(decodeURIComponent(accessToken));
          const valid = await this.verifyInvitationToken(token, clientId);
          if (!valid) return { ok: false, reason: 'Invalid or expired invitation' };
          return { ok: true };
        } catch {
          return { ok: false, reason: 'Malformed invitation token' };
        }
      }

      case 'dm': {
        if (!clientId) return { ok: false, reason: 'Client ID required for DM' };
        const participants = this.roomState?.dmParticipants;
        if (!participants || !participants.includes(clientId)) {
          return { ok: false, reason: 'Not a participant of this DM' };
        }
        return { ok: true };
      }

      default:
        return { ok: false, reason: 'Unknown access level' };
    }
  }

  private async hashString(input: string): Promise<string> {
    const encoded = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async verifyInvitationToken(
    token: InvitationToken,
    clientId?: string | null,
  ): Promise<boolean> {
    if (token.payload.expiresAt < Date.now()) return false;

    if (token.payload.inviteeClientId && token.payload.inviteeClientId !== clientId) {
      return false;
    }

    // Verify owner public key matches stored room owner
    const storedOwnerJwk = this.roomState?.ownerPublicKey;
    if (storedOwnerJwk) {
      const storedJwk = JSON.parse(storedOwnerJwk);
      if (storedJwk.x !== token.ownerPublicKey.x || storedJwk.y !== token.ownerPublicKey.y) {
        return false;
      }
    }

    const publicKey = await crypto.subtle.importKey(
      'jwk',
      token.ownerPublicKey,
      { name: 'ECDSA', namedCurve: 'P-384' },
      false,
      ['verify'],
    );

    const data = new TextEncoder().encode(
      JSON.stringify(token.payload, Object.keys(token.payload).sort()),
    );
    const sigBytes = Uint8Array.from(atob(token.signature), (c) => c.charCodeAt(0));
    return crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-384' },
      publicKey,
      sigBytes.buffer as ArrayBuffer,
      data.buffer as ArrayBuffer,
    );
  }
}
