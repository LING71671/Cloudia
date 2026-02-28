import type { RoomInfo, InvitationPayload, InvitationToken } from '@cloudia/shared';
import { canonicalize, signPayload } from '@cloudia/crypto';

/** Generate a shareable invite link for a room */
export function generateInviteLink(room: RoomInfo, wsEndpoint?: string, accessToken?: string): string {
  const url = new URL(`/join`, window.location.origin);
  url.searchParams.set('room', room.id);
  url.searchParams.set('name', room.name);
  url.searchParams.set('mode', room.mode);
  url.searchParams.set('accessLevel', room.accessLevel);
  if (wsEndpoint) {
    url.searchParams.set('endpoint', wsEndpoint);
  }
  if (accessToken) {
    url.searchParams.set('token', accessToken);
  }
  return url.toString();
}

/** Parse invite link parameters from current URL */
export function parseInviteParams(): {
  roomId: string | null;
  roomName: string | null;
  mode: string | null;
  endpoint: string | null;
  accessToken: string | null;
  accessLevel: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  return {
    roomId: params.get('room'),
    roomName: params.get('name'),
    mode: params.get('mode'),
    endpoint: params.get('endpoint'),
    accessToken: params.get('token'),
    accessLevel: params.get('accessLevel'),
  };
}

/** Create a signed invitation token for private rooms */
export async function createInvitationToken(
  roomId: string,
  privateKey: CryptoKey,
  publicKeyJwk: JsonWebKey,
  inviteeClientId?: string,
  ttlMs = 24 * 60 * 60 * 1000,
): Promise<string> {
  const payload: InvitationPayload = {
    roomId,
    inviteeClientId,
    expiresAt: Date.now() + ttlMs,
  };
  const data = canonicalize(payload);
  const signature = await signPayload(privateKey, data);
  const token: InvitationToken = { payload, signature, ownerPublicKey: publicKeyJwk };
  return btoa(JSON.stringify(token));
}
