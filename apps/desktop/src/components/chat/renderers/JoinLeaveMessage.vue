<script setup lang="ts">
import type { MessageEnvelope } from '@cloudia/shared';

const props = defineProps<{
  message: MessageEnvelope<'join'> | MessageEnvelope<'leave'>;
}>();

const label = props.message.type === 'join'
  ? `${props.message.from.slice(0, 8)} joined`
  : `${props.message.from.slice(0, 8)} left`;
</script>

<template>
  <div class="text-xs text-center py-0.5 px-2 text-gray-400 ghost:text-ghost-text/40 dark:text-gray-500">
    {{ label }}
  </div>
</template>
