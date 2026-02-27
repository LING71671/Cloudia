<script setup lang="ts">
import type { RoomInfo } from '@cloudia/shared';

defineProps<{
  rooms: RoomInfo[];
  loading: boolean;
}>();

const emit = defineEmits<{
  join: [room: RoomInfo];
}>();
</script>

<template>
  <div class="space-y-2">
    <div v-if="loading" class="text-center text-gray-400 text-sm py-4">Loading rooms...</div>
    <div v-else-if="rooms.length === 0" class="text-center text-gray-400 text-sm py-4">
      No rooms yet. Create one!
    </div>
    <button
      v-for="room in rooms"
      :key="room.id"
      class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
      @click="emit('join', room)"
    >
      <span
        class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        :class="room.mode === 'ephemeral' ? 'bg-ghost-accent' : 'bg-primary'"
      >
        {{ room.name.charAt(0).toUpperCase() }}
      </span>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-gray-800 truncate">{{ room.name }}</div>
        <div class="text-xs text-gray-400">
          {{ room.mode === 'ephemeral' ? 'Ghost' : 'Standard' }}
          · {{ room.memberCount }} member{{ room.memberCount !== 1 ? 's' : '' }}
        </div>
      </div>
    </button>
  </div>
</template>
