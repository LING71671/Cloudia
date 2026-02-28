<script setup lang="ts">
import { ref } from 'vue';
import { useIdentityStore } from '@/stores/identity';
import { useThemeStore, type ThemeMode } from '@/stores/theme';
import IdentityBadge from '@/components/common/IdentityBadge.vue';

const identity = useIdentityStore();
const theme = useThemeStore();
const nameInput = ref(identity.displayName);
const notificationsEnabled = ref(Notification.permission === 'granted');

function saveName() {
  identity.setDisplayName(nameInput.value);
}

async function toggleNotifications() {
  if (notificationsEnabled.value) {
    const perm = await Notification.requestPermission();
    notificationsEnabled.value = perm === 'granted';
  }
}

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Identity</h3>
      <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-surface rounded-lg">
        <span class="text-xs text-gray-500 dark:text-gray-400">Client ID:</span>
        <IdentityBadge />
      </div>
    </div>

    <div>
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Name</h3>
      <div class="flex gap-2">
        <input
          v-model="nameInput"
          type="text"
          placeholder="Anonymous"
          class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border dark:bg-dark-muted dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          class="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-hover transition-colors"
          @click="saveName"
        >
          Save
        </button>
      </div>
    </div>

    <div>
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</h3>
      <div class="flex gap-2">
        <button
          v-for="opt in themeOptions"
          :key="opt.value"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="theme.mode === opt.value
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-muted dark:text-gray-400 dark:hover:bg-dark-border'"
          @click="theme.setMode(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div>
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notifications</h3>
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          v-model="notificationsEnabled"
          class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/50"
          @change="toggleNotifications"
        />
        <span class="text-sm text-gray-600 dark:text-gray-400">Enable browser notifications</span>
      </label>
    </div>

    <div>
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">About</h3>
      <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>Cloudia v0.0.1</p>
        <p>Decentralized end-to-end encrypted instant messaging</p>
      </div>
    </div>
  </div>
</template>
