export const PROTOCOL_VERSION = 1;

export const DEFAULT_ENDPOINT = 'wss://cloudia.071.cc.cd';
export const DEFAULT_REST_ENDPOINT = 'https://cloudia.071.cc.cd';

export const MAX_MESSAGE_SIZE = 64 * 1024; // 64 KB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5 MB
export const EPHEMERAL_ROOM_TTL_MS = 30 * 60 * 1000; // 30 min after last disconnect
export const CLIENT_ID_LENGTH = 32; // first 32 hex chars of SHA-256

/** Exponential backoff intervals for WebSocket reconnection */
export const RECONNECT_INTERVALS_MS = [1000, 2000, 4000, 8000, 16000] as const;

/** Human-readable room short code */
export const SHORT_CODE_LENGTH = 6;
export const SHORT_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
