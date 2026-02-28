<script setup lang="ts">
import { useConnectionStore } from '@/stores/connection';

const connection = useConnectionStore();
</script>

<template>
  <div class="flex items-center gap-2 px-3 py-1.5 text-xs bg-white ghost:bg-ghost-bg dark:bg-dark-bg border-b border-gray-100 ghost:border-ghost-muted dark:border-dark-border">
    <span
      class="w-2 h-2 rounded-full"
      :class="{
        'bg-green-500': connection.state === 'connected',
        'bg-yellow-500 animate-pulse': connection.state === 'connecting',
        'bg-red-500': connection.state === 'error',
        'bg-gray-400': connection.state === 'disconnected',
      }"
    />
    <span class="text-gray-500 ghost:text-ghost-text/60 dark:text-gray-400">
      {{ connection.state === 'connected' ? 'Connected' :
         connection.state === 'connecting' ? 'Connecting...' :
         connection.state === 'error' ? 'Connection error' : 'Disconnected' }}
    </span>
    <span v-if="connection.reconnectAttempt > 0" class="text-gray-400 dark:text-gray-500">
      (retry {{ connection.reconnectAttempt }})
    </span>
  </div>
</template>
