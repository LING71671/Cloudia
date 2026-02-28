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
const confirmDeleteId = ref<string | null>(null);

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

function handleDelete(roomId: string) {
  if (confirmDeleteId.value === roomId) {
    emit('delete', roomId);
    confirmDeleteId.value = null;
  } else {
    confirmDeleteId.value = roomId;
    // Auto-reset after 3 seconds
    setTimeout(() => {
      if (confirmDeleteId.value === roomId) confirmDeleteId.value = null;
    }, 3000);
  }
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="loading" class="flex flex-col items-center justify-center text-center py-10">
      <div class="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></div>
      <p class="text-sm text-gray-400 dark:text-gray-500 font-medium tracking-wide">Finding rooms...</p>
    </div>
    
    <div v-else-if="rooms.length === 0" class="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-gray-200 dark:border-white/5 rounded-2xl">
      <div class="w-12 h-12 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-3">
        <svg class="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <p class="text-[15px] font-medium text-gray-600 dark:text-gray-300">No active rooms found</p>
      <p class="text-[13px] text-gray-400 dark:text-gray-500 mt-1">Create a room or join with a specific code.</p>
    </div>

    <button
      v-for="room in rooms"
      :key="room.id"
      class="group w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm dark:bg-dark-surface dark:border-white/5 dark:hover:bg-dark-surface-elevated transition-all active:scale-[0.98] text-left relative overflow-hidden"
      @click="handleClick(room)"
    >
      <div class="absolute inset-y-0 left-0 w-1 bg-gradient-to-b opacity-0 group-hover:opacity-100 transition-opacity" :class="room.mode === 'ephemeral' ? 'from-ghost-accent to-purple-400' : 'from-primary to-indigo-400'"></div>
      
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-bold text-white shrink-0 shadow-sm"
        :class="room.mode === 'ephemeral' ? 'bg-gradient-to-br from-ghost-accent to-purple-500 shadow-ghost-accent/20' : 'bg-gradient-to-br from-primary to-indigo-500 shadow-primary/20'"
      >
        {{ room.name.charAt(0).toUpperCase() }}
      </div>
      
      <div class="flex-1 min-w-0 pr-2">
        <div class="flex items-center gap-2 mb-0.5">
          <svg v-if="room.accessLevel === 'password'" class="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span class="text-[15px] font-semibold text-gray-800 dark:text-gray-100 truncate">{{ room.name }}</span>
        </div>
        
        <div class="flex items-center gap-2 text-[12px] font-medium">
          <span class="px-1.5 py-0.5 rounded-md" :class="room.mode === 'ephemeral' ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'">
            {{ room.mode === 'ephemeral' ? 'Ghost' : 'Standard' }}
          </span>
          <span class="text-gray-400 dark:text-gray-500">
            &bull; {{ room.memberCount }} member{{ room.memberCount !== 1 ? 's' : '' }}
          </span>
          <span v-if="room.shortCode" class="font-mono text-gray-400 bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 rounded-md ml-auto">
            #{{ room.shortCode }}
          </span>
        </div>
      </div>
      
      <!-- Delete button (owner only) -->
      <button
        v-if="room.ownerClientId === currentClientId"
        class="p-2 rounded-xl transition-all shrink-0 z-10"
        :class="confirmDeleteId === room.id
          ? 'text-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-500/20'
          : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 hover:ring-1 hover:ring-red-100 dark:text-gray-600 dark:hover:bg-red-500/10 dark:hover:ring-red-500/20'"
        :title="confirmDeleteId === room.id ? 'Tap again to confirm' : 'Delete room'"
        @click.stop="handleDelete(room.id)"
      >
        <svg v-if="confirmDeleteId !== room.id" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span v-else class="text-[11px] font-bold px-1 uppercase tracking-wide">Delete</span>
      </button>
    </button>

    <!-- Password prompt overlay -->
    <div v-if="promptRoom" class="p-4 rounded-2xl border border-primary/20 bg-primary/5 dark:border-primary/20 dark:bg-primary/10 space-y-3">
      <div class="text-[13px] font-medium text-gray-600 dark:text-gray-300">
        Password required for <span class="font-bold text-gray-900 dark:text-white">{{ promptRoom.name }}</span>
      </div>
      <form class="flex gap-2" @submit.prevent="submitPassword">
        <input
          v-model="passwordInput"
          type="password"
          placeholder="Enter access code"
          class="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-dark-surface dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all shadow-sm"
          autofocus
        />
        <button
          type="submit"
          :disabled="!passwordInput"
          class="px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-hover active:scale-95 disabled:opacity-40 disabled:active:scale-100 shadow-sm shadow-primary/20 transition-all shrink-0"
        >
          Join
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface dark:hover:bg-dark-surface-elevated text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 active:scale-95 shadow-sm transition-all shrink-0"
          @click="promptRoom = null; passwordInput = ''"
        >
          Cancel
        </button>
      </form>
    </div>
  </div>
</template>
