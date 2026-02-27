<script setup lang="ts">
import type { MessageEnvelope } from '@cloudia/shared';

defineProps<{
  message: MessageEnvelope<'ephemeral-text'>;
}>();
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <span class="text-xs font-mono text-ghost-text/60">{{ message.from.slice(0, 8) }}</span>
    <p class="text-sm text-ghost-text select-none break-words">
      {{ message.payload.ciphertext }}
    </p>
  </div>
</template>
