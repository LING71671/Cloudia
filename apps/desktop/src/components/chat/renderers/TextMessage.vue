<script setup lang="ts">
import type { MessageEnvelope } from '@cloudia/shared';

defineProps<{
  message: MessageEnvelope<'text'>;
}>();
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <span class="text-xs text-gray-400 ghost:text-ghost-text/40 dark:text-gray-500 font-mono">{{ message.from.slice(0, 8) }}</span>
    <p class="text-sm text-gray-800 ghost:text-ghost-text dark:text-dark-text break-words">
      {{ message.payload.content }}
    </p>
  </div>
</template>
