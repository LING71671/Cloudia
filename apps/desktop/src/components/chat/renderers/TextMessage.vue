<script setup lang="ts">
import type { MessageEnvelope } from '@cloudia/shared';
import { useIdentityStore } from '@/stores/identity';

const props = defineProps<{
  message: MessageEnvelope<'text'>;
}>();

const identity = useIdentityStore();
const isSelf = props.message.from === identity.clientId;
</script>

<template>
  <div class="flex flex-col gap-0.5" :class="isSelf ? 'items-end' : 'items-start'">
    <span v-if="!isSelf" class="text-xs text-gray-400 ghost:text-ghost-text/40 dark:text-gray-500 font-mono">{{ message.from.slice(0, 8) }}</span>
    <div
      class="px-3 py-2 rounded-2xl text-sm break-words max-w-prose"
      :class="isSelf
        ? 'bg-primary text-white rounded-br-md'
        : 'bg-gray-100 text-gray-800 ghost:bg-ghost-muted ghost:text-ghost-text dark:bg-dark-muted dark:text-dark-text rounded-bl-md'"
    >
      {{ message.payload.content }}
    </div>
  </div>
</template>
