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
  <div class="flex items-center justify-center p-8 h-full bg-gradient-to-br from-gray-50 to-white dark:from-dark-bg dark:to-dark-surface">
    <div v-if="error" class="flex flex-col items-center justify-center text-center max-w-sm">
      <div class="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-6">
        <svg class="w-8 h-8 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to Join</h2>
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">{{ error }}</p>
      
      <button
        class="px-6 py-2.5 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[15px] font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
        @click="router.push({ name: 'lobby' })"
      >
        Back to Lobby
      </button>
    </div>
    
    <div v-else class="flex flex-col items-center justify-center text-center">
      <div class="relative w-16 h-16 mb-6">
        <div class="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
        <div class="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
      </div>
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Connecting</h2>
      <p class="text-[15px] font-medium text-gray-500 dark:text-gray-400 tracking-wide">{{ status }}</p>
    </div>
  </div>
</template>
