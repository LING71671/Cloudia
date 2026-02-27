import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { MessageEnvelope, RoomInfo, RoomMode } from '@cloudia/shared';
import { canonicalize, signPayload } from '@cloudia/crypto';
import { useIdentityStore } from './identity';
import { useConnectionStore } from './connection';
import { useSettingsStore } from './settings';
import { useE2EE } from '@/composables/useE2EE';
import { useNotification } from '@/composables/useNotification';

export const useChatStore = defineStore('chat', () => {
  const rooms = ref<RoomInfo[]>([]);
  const messages = ref<MessageEnvelope[]>([]);
  const currentRoom = ref<RoomInfo | null>(null);
  const loading = ref(false);

  const identity = useIdentityStore();
  const connection = useConnectionStore();
  const e2ee = useE2EE();
  const { notify } = useNotification();

  // Listen for incoming messages
  connection.onMessage(async (msg) => {
    // Handle key-exchange signaling for E2EE
    if (msg.type === 'key-exchange' && msg.from !== identity.clientId) {
      const payload = msg.payload as { encryptedSessionKey: string; ephemeralPublicKey: JsonWebKey };
      await e2ee.handleKeyExchange(msg.from, payload.ephemeralPublicKey);
      return;
    }

    // Decrypt ephemeral messages from others
    if (msg.type === 'ephemeral-text' && msg.from !== identity.clientId) {
      const payload = msg.payload as { ciphertext: string; iv: string };
      const plaintext = await e2ee.decryptMessage(msg.from, payload.ciphertext, payload.iv);
      // Replace ciphertext with plaintext for display
      (msg.payload as { ciphertext: string }).ciphertext = plaintext;
    }

    messages.value.push(msg);

    // Trigger notification for messages from others when not focused
    if (
      (msg.type === 'text' || msg.type === 'ephemeral-text') &&
      msg.from !== identity.clientId &&
      document.hidden
    ) {
      const content = msg.type === 'text'
        ? (msg.payload as { content: string }).content
        : (msg.payload as { ciphertext: string }).ciphertext;
      notify(currentRoom.value?.name ?? 'Cloudia', content.slice(0, 100));
    }
  });

  async function fetchRooms() {
    const settings = useSettingsStore();
    loading.value = true;
    try {
      const res = await fetch(`${settings.restEndpoint}/api/rooms`);
      const data = await res.json();
      rooms.value = data.rooms ?? [];
    } catch {
      rooms.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function createRoom(name: string, mode: RoomMode) {
    const settings = useSettingsStore();
    const publicKey = await identity.getPublicKeyJwk();
    const res = await fetch(`${settings.restEndpoint}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': identity.clientId,
      },
      body: JSON.stringify({ name, mode, ownerPublicKey: publicKey }),
    });
    const data = await res.json();
    if (data.room) {
      rooms.value.unshift(data.room);
      return data.room as RoomInfo;
    }
    throw new Error(data.error ?? 'Failed to create room');
  }

  async function joinRoom(room: RoomInfo) {
    currentRoom.value = room;
    messages.value = [];

    // Initialize E2EE for ephemeral rooms
    let ephemeralPubKey: JsonWebKey | null = null;
    if (room.mode === 'ephemeral') {
      ephemeralPubKey = await e2ee.initialize();
    }

    connection.connect(room.id, room.mode, room.name);

    // Wait for connection, then send join message
    const unwatch = connection.onMessage(async () => {});
    await waitForConnection();
    unwatch();

    const publicKey = await identity.getPublicKeyJwk();
    await sendMessage('join', {
      displayName: identity.displayName || undefined,
      publicKey,
    });

    // Broadcast ephemeral public key for E2EE key exchange
    if (room.mode === 'ephemeral' && ephemeralPubKey) {
      await sendMessage('key-exchange', {
        encryptedSessionKey: '',
        ephemeralPublicKey: ephemeralPubKey,
      });
    }
  }

  function leaveRoom() {
    if (currentRoom.value) {
      sendMessage('leave', { reason: 'user left' });
      e2ee.destroy();
      connection.disconnect();
      currentRoom.value = null;
      messages.value = [];
    }
  }

  async function sendText(content: string) {
    if (!currentRoom.value) return;

    if (currentRoom.value.mode === 'standard') {
      await sendMessage('text', { content });
    } else {
      // Ephemeral mode — encrypt with E2EE
      const encrypted = await e2ee.encryptMessage(content);
      await sendMessage('ephemeral-text', encrypted);
    }
  }

  async function sendMessage(type: string, payload: unknown) {
    if (!identity.keyPair) return;

    const envelope: MessageEnvelope = {
      id: crypto.randomUUID(),
      type: type as MessageEnvelope['type'],
      from: identity.clientId,
      roomId: currentRoom.value?.id ?? '',
      timestamp: Date.now(),
      signature: '',
      payload: payload as never,
    };

    // Sign the payload
    const data = canonicalize(envelope.payload);
    envelope.signature = await signPayload(identity.keyPair.privateKey, data);

    connection.send(envelope);

    // Add to local messages (optimistic)
    if (type === 'text' || type === 'ephemeral-text') {
      messages.value.push(envelope);
    }
  }

  function waitForConnection(): Promise<void> {
    return new Promise((resolve) => {
      if (connection.isConnected) return resolve();
      const check = setInterval(() => {
        if (connection.isConnected) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      // Timeout after 5s
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 5000);
    });
  }

  return {
    rooms,
    messages,
    currentRoom,
    loading,
    fetchRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    sendText,
    sendMessage,
  };
});
