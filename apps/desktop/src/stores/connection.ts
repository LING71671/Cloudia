import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MessageEnvelope, RoomMode } from '@cloudia/shared';
import { RECONNECT_INTERVALS_MS } from '@cloudia/shared';
import { useSettingsStore } from './settings';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectOptions {
  password?: string;
  accessToken?: string;
  clientId?: string;
}

export const useConnectionStore = defineStore('connection', () => {
  const ws = ref<WebSocket | null>(null);
  const state = ref<ConnectionState>('disconnected');
  const currentRoomId = ref('');
  const currentRoomMode = ref<RoomMode | null>(null);
  const reconnectAttempt = ref(0);
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const isConnected = computed(() => state.value === 'connected');

  const messageHandlers = new Set<(msg: MessageEnvelope) => void>();

  function onMessage(handler: (msg: MessageEnvelope) => void) {
    messageHandlers.add(handler);
    return () => messageHandlers.delete(handler);
  }

  function connect(roomId: string, mode: RoomMode = 'standard', roomName = '', options: ConnectOptions = {}) {
    disconnect();
    currentRoomId.value = roomId;
    currentRoomMode.value = mode;
    state.value = 'connecting';

    const settings = useSettingsStore();
    const params = new URLSearchParams({ mode, name: roomName });
    if (options.password) params.set('password', options.password);
    if (options.accessToken) params.set('accessToken', options.accessToken);
    if (options.clientId) params.set('clientId', options.clientId);
    const url = `${settings.wsEndpoint}/api/ws/${roomId}?${params.toString()}`;

    const socket = new WebSocket(url);
    ws.value = socket;

    socket.addEventListener('open', () => {
      state.value = 'connected';
      reconnectAttempt.value = 0;
    });

    socket.addEventListener('message', (event) => {
      try {
        const msg: MessageEnvelope = JSON.parse(event.data);
        for (const handler of messageHandlers) {
          handler(msg);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    socket.addEventListener('close', () => {
      state.value = 'disconnected';
      ws.value = null;
      scheduleReconnect(roomId, mode, roomName, options);
    });

    socket.addEventListener('error', () => {
      state.value = 'error';
    });
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectAttempt.value = 0;
    if (ws.value) {
      ws.value.close(1000, 'user disconnect');
      ws.value = null;
    }
    state.value = 'disconnected';
    currentRoomId.value = '';
    currentRoomMode.value = null;
  }

  function send(msg: MessageEnvelope) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(msg));
    }
  }

  function scheduleReconnect(roomId: string, mode: RoomMode, roomName: string, options: ConnectOptions = {}) {
    if (reconnectAttempt.value >= RECONNECT_INTERVALS_MS.length) return;
    const delay = RECONNECT_INTERVALS_MS[reconnectAttempt.value];
    reconnectAttempt.value++;
    reconnectTimer = setTimeout(() => connect(roomId, mode, roomName, options), delay);
  }

  return {
    ws,
    state,
    currentRoomId,
    currentRoomMode,
    isConnected,
    reconnectAttempt,
    connect,
    disconnect,
    send,
    onMessage,
  };
});
