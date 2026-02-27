import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MessageEnvelope, RoomMode } from '@cloudia/shared';
import { RECONNECT_INTERVALS_MS } from '@cloudia/shared';
import { useSettingsStore } from './settings';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

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

  function connect(roomId: string, mode: RoomMode = 'standard', roomName = '') {
    disconnect();
    currentRoomId.value = roomId;
    currentRoomMode.value = mode;
    state.value = 'connecting';

    const settings = useSettingsStore();
    const url = `${settings.wsEndpoint}/api/ws/${roomId}?mode=${mode}&name=${encodeURIComponent(roomName)}`;

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
      scheduleReconnect(roomId, mode, roomName);
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

  function scheduleReconnect(roomId: string, mode: RoomMode, roomName: string) {
    if (reconnectAttempt.value >= RECONNECT_INTERVALS_MS.length) return;
    const delay = RECONNECT_INTERVALS_MS[reconnectAttempt.value];
    reconnectAttempt.value++;
    reconnectTimer = setTimeout(() => connect(roomId, mode, roomName), delay);
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
