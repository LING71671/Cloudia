<script setup lang="ts">
import type { MessageEnvelope } from '@cloudia/shared';

defineProps<{
  message: MessageEnvelope<'system'>;
}>();
</script>

<template>
  <div class="flex items-center justify-center my-2">
    <div
      class="text-[11px] font-medium tracking-wide py-1 px-4 rounded-full"
      :class="{
        'bg-blue-50 text-blue-600 ghost:bg-ghost-muted ghost:text-ghost-text/70 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20': message.payload.level === 'info',
        'bg-yellow-50 text-yellow-600 ghost:bg-yellow-900/20 ghost:text-yellow-400 dark:bg-yellow-500/10 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-500/20': message.payload.level === 'warn',
        'bg-red-50 text-red-600 ghost:bg-red-900/20 ghost:text-red-400 dark:bg-red-500/10 dark:text-red-400 border border-red-100 dark:border-red-500/20': message.payload.level === 'error',
      }"
    >
      {{ message.payload.content }}
    </div>
  </div>
</template>
