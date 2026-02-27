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
      'bg-blue-50 text-blue-600': message.payload.level === 'info',
      'bg-yellow-50 text-yellow-600': message.payload.level === 'warn',
      'bg-red-50 text-red-600': message.payload.level === 'error',
    }"
  >
    {{ message.payload.content }}
  </div>
</template>
