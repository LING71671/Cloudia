// ============================================================
// Cloudia Protocol — Single Source of Truth
// ============================================================

// === Client Identity ===

/** SHA-256 hex hash of ECDSA public key (first 32 chars) */
export type ClientID = string;

// === Room ===

export type RoomMode = 'standard' | 'ephemeral';
export type RoomAccessLevel = 'public' | 'password' | 'private' | 'dm';

export interface RoomInfo {
  id: string;
  name: string;
  mode: RoomMode;
  accessLevel: RoomAccessLevel;
  shortCode: string;
  createdAt: number;
  ownerClientId: ClientID;
  memberCount: number;
}

// === Message Types ===

export type MessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'system'
  | 'join'
  | 'leave'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'key-exchange'
  | 'ephemeral-text';

// === Payload Definitions ===

export interface PayloadMap {
  'text': { content: string };
  'image': { url: string; thumbnailUrl?: string; filename: string; size: number; mimeType: string };
  'audio': { url: string; duration: number; size: number; mimeType: string };
  'system': { content: string; level: 'info' | 'warn' | 'error' };
  'join': {
    displayName?: string;
    publicKey: JsonWebKey;
    accessToken?: string;
    password?: string;
  };
  'leave': { reason?: string };
  'offer': { sdp: string };
  'answer': { sdp: string };
  'ice-candidate': { candidate: RTCIceCandidateInit };
  'key-exchange': { encryptedSessionKey: string; ephemeralPublicKey: JsonWebKey };
  'ephemeral-text': { ciphertext: string; iv: string };
}

// === Message Envelope ===

export interface MessageEnvelope<T extends MessageType = MessageType> {
  /** UUIDv7 — chronologically sortable */
  id: string;
  type: T;
  from: ClientID;
  /** Undefined = broadcast to room */
  to?: ClientID;
  roomId: string;
  /** Unix milliseconds */
  timestamp: number;
  /** Base64 ECDSA signature of canonical payload */
  signature: string;
  payload: T extends keyof PayloadMap ? PayloadMap[T] : never;
}

// === REST API ===

export interface CreateRoomRequest {
  name: string;
  mode: RoomMode;
  accessLevel?: RoomAccessLevel;
  ownerPublicKey: JsonWebKey;
  password?: string;
  participants?: [ClientID, ClientID];
}

export interface CreateRoomResponse {
  room: RoomInfo;
}

export interface ListRoomsResponse {
  rooms: RoomInfo[];
}

export interface IceServersResponse {
  iceServers: RTCIceServer[];
}

// === Invitation Token (for private rooms) ===

export interface InvitationPayload {
  roomId: string;
  inviteeClientId?: string;
  expiresAt: number;
}

export interface InvitationToken {
  payload: InvitationPayload;
  signature: string;
  ownerPublicKey: JsonWebKey;
}
