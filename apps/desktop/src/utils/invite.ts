import type { RoomInfo } from '@cloudia/shared';

const BASE_URL = 'https://cloudia.071.cc.cd';

/** Generate a shareable invite link for a room */
export function generateInviteLink(room: RoomInfo, wsEndpoint?: string): string {
  const url = new URL(`/join`, BASE_URL);
  url.searchParams.set('room', room.id);
  url.searchParams.set('name', room.name);
  url.searchParams.set('mode', room.mode);
  if (wsEndpoint) {
    url.searchParams.set('endpoint', wsEndpoint);
  }
  return url.toString();
}

/** Parse invite link parameters from current URL */
export function parseInviteParams(): {
  roomId: string | null;
  roomName: string | null;
  mode: string | null;
  endpoint: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  return {
    roomId: params.get('room'),
    roomName: params.get('name'),
    mode: params.get('mode'),
    endpoint: params.get('endpoint'),
  };
}
