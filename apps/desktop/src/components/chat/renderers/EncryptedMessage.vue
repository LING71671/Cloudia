<script setup lang="ts">
import type { MessageEnvelope } from '@cloudia/shared';
import { useIdentityStore } from '@/stores/identity';

const props = defineProps<{
  message: MessageEnvelope<'ephemeral-text'>;
}>();

const identity = useIdentityStore();
const isSelf = props.message.from === identity.clientId;
</script>

<template>
  <div class="flex flex-col gap-0.5" :class="isSelf ? 'items-end' : 'items-start'">
    <span v-if="!isSelf" class="text-xs font-mono text-ghost-text/60">{{ message.from.slice(0, 8) }}</span>
    <div
      class="px-3 py-2 rounded-2xl text-sm select-none break-words max-w-prose"
      :class="isSelf
        ? 'bg-ghost-accent text-white rounded-br-md'
        : 'bg-ghost-muted text-ghost-text rounded-bl-md'"
    >
      {{ message.payload.ciphertext }}
    </div>
  </div>
</template>
