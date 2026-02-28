<script setup lang="ts">
import { ref } from 'vue';
import type { RoomMode, RoomAccessLevel } from '@cloudia/shared';

const emit = defineEmits<{
  create: [name: string, mode: RoomMode, accessLevel: RoomAccessLevel, password?: string, dmTarget?: string];
}>();

const name = ref('');
const mode = ref<RoomMode>('standard');
const accessLevel = ref<RoomAccessLevel>('public');
const password = ref('');
const dmTarget = ref('');
const open = ref(false);

function handleCreate() {
  if (!name.value.trim()) return;
  if (accessLevel.value === 'password' && !password.value) return;
  if (accessLevel.value === 'dm' && !dmTarget.value.trim()) return;
  emit(
    'create',
    name.value.trim(),
    mode.value,
    accessLevel.value,
    accessLevel.value === 'password' ? password.value : undefined,
    accessLevel.value === 'dm' ? dmTarget.value.trim() : undefined,
  );
  name.value = '';
  mode.value = 'standard';
  accessLevel.value = 'public';
  password.value = '';
  dmTarget.value = '';
  open.value = false;
}

const accessLevels: { value: RoomAccessLevel; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'password', label: 'Password' },
  { value: 'private', label: 'Private' },
  { value: 'dm', label: 'DM' },
];
</script>

<template>
  <div>
    <button
      class="w-full py-2.5 md:py-2 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover active:bg-primary-hover transition-colors"
      @click="open = !open"
    >
      {{ open ? 'Cancel' : '+ New Room' }}
    </button>

    <form v-if="open" class="mt-3 space-y-3" @submit.prevent="handleCreate">
      <input
        v-model="name"
        type="text"
        placeholder="Room name"
        class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border dark:bg-dark-muted dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <!-- Mode toggle -->
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 py-2 md:py-1.5 rounded-lg text-xs font-medium border transition-colors"
          :class="mode === 'standard'
            ? 'bg-primary text-white border-primary'
            : 'bg-white dark:bg-dark-muted text-gray-600 dark:text-gray-400 border-gray-300 dark:border-dark-border hover:border-primary'"
          @click="mode = 'standard'"
        >
          Standard
        </button>
        <button
          type="button"
          class="flex-1 py-2 md:py-1.5 rounded-lg text-xs font-medium border transition-colors"
          :class="mode === 'ephemeral'
            ? 'bg-ghost-accent text-white border-ghost-accent'
            : 'bg-white dark:bg-dark-muted text-gray-600 dark:text-gray-400 border-gray-300 dark:border-dark-border hover:border-ghost-accent'"
          @click="mode = 'ephemeral'"
        >
          Ghost
        </button>
      </div>
      <!-- Access level toggle -->
      <div class="flex gap-1">
        <button
          v-for="al in accessLevels"
          :key="al.value"
          type="button"
          class="flex-1 py-2 md:py-1.5 rounded-lg text-xs font-medium border transition-colors"
          :class="accessLevel === al.value
            ? 'bg-gray-800 text-white border-gray-800'
            : 'bg-white dark:bg-dark-muted text-gray-600 dark:text-gray-400 border-gray-300 dark:border-dark-border hover:border-gray-500'"
          @click="accessLevel = al.value"
        >
          {{ al.label }}
        </button>
      </div>
      <!-- Password input -->
      <input
        v-if="accessLevel === 'password'"
        v-model="password"
        type="password"
        placeholder="Room password"
        class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border dark:bg-dark-muted dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <!-- DM target input -->
      <input
        v-if="accessLevel === 'dm'"
        v-model="dmTarget"
        type="text"
        placeholder="Peer Client ID"
        class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border dark:bg-dark-muted dark:text-dark-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <button
        type="submit"
        :disabled="!name.trim() || (accessLevel === 'password' && !password) || (accessLevel === 'dm' && !dmTarget.trim())"
        class="w-full py-2.5 md:py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-40 transition-colors"
      >
        Create Room
      </button>
    </form>
  </div>
</template>
