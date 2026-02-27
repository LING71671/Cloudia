<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { parseInviteParams } from '@/utils/invite';
import { useSettingsStore } from '@/stores/settings';
import { useChatStore } from '@/stores/chat';
import { useIdentityStore } from '@/stores/identity';
import type { RoomMode, RoomAccessLevel } from '@cloudia/shared';

const router = useRouter();
const settings = useSettingsStore();
const chat = useChatStore();
const identity = useIdentityStore();
const status = ref('Joining room...');
const error = ref('');

onMounted(async () => {
  const params = parseInviteParams();

  if (!params.roomId) {
    error.value = 'Invalid invite link — missing room ID.';
    return;
  }

  // Apply endpoint override if present (BYOS)
  if (params.endpoint) {
    const rest = params.endpoint.replace(/^wss?:\/\//, 'https://');
    settings.setEndpoints(params.endpoint, rest);
    status.value = `Switching to server: ${params.endpoint}`;
  }

  // Wait for identity
  if (!identity.ready) {
    await identity.initialize();
  }

  // Join the room
  try {
    const room = {
      id: params.roomId,
      name: params.roomName ?? 'Invited Room',
      mode: (params.mode ?? 'standard') as RoomMode,
      accessLevel: (params.accessLevel ?? 'public') as RoomAccessLevel,
      shortCode: '',
      createdAt: Date.now(),
      ownerClientId: '',
      memberCount: 0,
    };

    await chat.joinRoom(room, {
      accessToken: params.accessToken ?? undefined,
    });
    router.replace({ name: 'chat', params: { roomId: room.id } });
  } catch (e) {
    error.value = `Failed to join room: ${e instanceof Error ? e.message : 'Unknown error'}`;
  }
});
</script>

<template>
  <div class="flex items-center justify-center h-full">
    <div v-if="error" class="text-center">
      <p class="text-red-500 text-sm">{{ error }}</p>
      <button
        class="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-hover"
        @click="router.push({ name: 'lobby' })"
      >
        Go to Lobby
      </button>
    </div>
    <div v-else class="text-center">
      <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      <p class="mt-3 text-sm text-gray-500">{{ status }}</p>
    </div>
  </div>
</template>
