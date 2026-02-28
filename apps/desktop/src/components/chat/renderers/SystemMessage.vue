<script setup lang="ts">
import type { MessageEnvelope } from '@cloudia/shared';

defineProps<{
  message: MessageEnvelope<'system'>;
}>();
</script>

<template>
  <div
    class="text-xs text-center py-1 px-3 rounded-full mx-auto"
    :class="{
      'bg-blue-50 text-blue-600 ghost:bg-ghost-muted ghost:text-ghost-text/70 dark:bg-blue-900/20 dark:text-blue-400': message.payload.level === 'info',
      'bg-yellow-50 text-yellow-600 ghost:bg-yellow-900/20 ghost:text-yellow-400 dark:bg-yellow-900/20 dark:text-yellow-400': message.payload.level === 'warn',
      'bg-red-50 text-red-600 ghost:bg-red-900/20 ghost:text-red-400 dark:bg-red-900/20 dark:text-red-400': message.payload.level === 'error',
    }"
  >
    {{ message.payload.content }}
  </div>
</template>
