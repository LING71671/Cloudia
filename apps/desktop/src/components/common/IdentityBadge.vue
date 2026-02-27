<script setup lang="ts">
import { useIdentityStore } from '@/stores/identity';

const identity = useIdentityStore();

function copyId() {
  navigator.clipboard.writeText(identity.clientId);
}
</script>

<template>
  <div class="flex items-center gap-2 text-xs">
    <span class="font-mono text-gray-500 ghost:text-ghost-text/60">{{ identity.shortId }}</span>
    <button
      class="text-gray-400 hover:text-gray-600 ghost:hover:text-ghost-text"
      title="Copy full ID"
      @click="copyId"
    >
      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </button>
  </div>
</template>
