<script setup lang="ts">
import { ref } from 'vue';
import type { RoomInfo } from '@cloudia/shared';

defineProps<{
  rooms: RoomInfo[];
  loading: boolean;
  currentClientId: string;
}>();

const emit = defineEmits<{
  join: [room: RoomInfo, password?: string];
  delete: [roomId: string];
}>();

const promptRoom = ref<RoomInfo | null>(null);
const passwordInput = ref('');

function handleClick(room: RoomInfo) {
  if (room.accessLevel === 'password') {
    promptRoom.value = room;
    passwordInput.value = '';
  } else {
    emit('join', room);
  }
}

function submitPassword() {
  if (promptRoom.value && passwordInput.value) {
    emit('join', promptRoom.value, passwordInput.value);
    promptRoom.value = null;
    passwordInput.value = '';
  }
}
</script>

<template>
  <div class="space-y-2">
    <div v-if="loading" class="text-center text-gray-400 dark:text-gray-500 text-sm py-4">Loading rooms...</div>
    <div v-else-if="rooms.length === 0" class="text-center text-gray-400 dark:text-gray-500 text-sm py-4">
      No rooms yet. Create one!
    </div>
    <button
      v-for="room in rooms"
      :key="room.id"
      class="w-full flex items-center gap-3 p-3.5 md:p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-muted active:bg-gray-200 dark:active:bg-dark-border transition-colors text-left"
      @click="handleClick(room)"
    >
      <span
        class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        :class="room.mode === 'ephemeral' ? 'bg-ghost-accent' : 'bg-primary'"
      >
        {{ room.name.charAt(0).toUpperCase() }}
      </span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-dark-text truncate">
          <!-- Lock icon for password rooms -->
          <svg v-if="room.accessLevel === 'password'" class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span class="truncate">{{ room.name }}</span>
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          {{ room.mode === 'ephemeral' ? 'Ghost' : 'Standard' }}
          · {{ room.memberCount }} member{{ room.memberCount !== 1 ? 's' : '' }}
          <span v-if="room.shortCode" class="font-mono text-gray-300 dark:text-gray-600 ml-1">{{ room.shortCode }}</span>
        </div>
      </div>
      <!-- Delete button (owner only) -->
      <button
        v-if="room.ownerClientId === currentClientId"
        class="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:text-gray-600 dark:hover:bg-red-900/20 transition-colors shrink-0"
        title="Delete room"
        @click.stop="emit('delete', room.id)"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </button>

    <!-- Password prompt overlay -->
    <div v-if="promptRoom" class="p-3 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface space-y-2">
      <div class="text-xs text-gray-500 dark:text-gray-400">Enter password for <span class="font-medium text-gray-700 dark:text-dark-text">{{ promptRoom.name }}</span></div>
      <form class="flex gap-2" @submit.prevent="submitPassword">
        <input
          v-model="passwordInput"
          type="password"
          placeholder="Password"
          class="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-dark-border dark:bg-dark-muted dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          autofocus
        />
        <button
          type="submit"
          :disabled="!passwordInput"
          class="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover disabled:opacity-40 transition-colors"
        >
          Join
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
          @click="promptRoom = null"
        >
          Cancel
        </button>
      </form>
    </div>
  </div>
</template>
