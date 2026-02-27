<script setup lang="ts">
import { ref } from 'vue';
import type { RoomMode } from '@cloudia/shared';

const emit = defineEmits<{
  create: [name: string, mode: RoomMode];
}>();

const name = ref('');
const mode = ref<RoomMode>('standard');
const open = ref(false);

function handleCreate() {
  if (!name.value.trim()) return;
  emit('create', name.value.trim(), mode.value);
  name.value = '';
  mode.value = 'standard';
  open.value = false;
}
</script>

<template>
  <div>
    <button
      class="w-full py-2 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
      @click="open = !open"
    >
      {{ open ? 'Cancel' : '+ New Room' }}
    </button>

    <form v-if="open" class="mt-3 space-y-3" @submit.prevent="handleCreate">
      <input
        v-model="name"
        type="text"
        placeholder="Room name"
        class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
          :class="mode === 'standard'
            ? 'bg-primary text-white border-primary'
            : 'bg-white text-gray-600 border-gray-300 hover:border-primary'"
          @click="mode = 'standard'"
        >
          Standard
        </button>
        <button
          type="button"
          class="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
          :class="mode === 'ephemeral'
            ? 'bg-ghost-accent text-white border-ghost-accent'
            : 'bg-white text-gray-600 border-gray-300 hover:border-ghost-accent'"
          @click="mode = 'ephemeral'"
        >
          Ghost
        </button>
      </div>
      <button
        type="submit"
        :disabled="!name.trim()"
        class="w-full py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-40 transition-colors"
      >
        Create Room
      </button>
    </form>
  </div>
</template>
