<script setup lang="ts">
import type { MessageEnvelope } from '@cloudia/shared';
import { useIdentityStore } from '@/stores/identity';

const props = defineProps<{
  message: MessageEnvelope<'image'>;
}>();

const identity = useIdentityStore();
const isSelf = props.message.from === identity.clientId;
const payload = props.message.payload as { url: string; thumbnailUrl?: string; filename: string };

function openImage() {
  window.open(payload.url, '_blank');
}
</script>

<template>
  <div class="flex flex-col gap-0.5" :class="isSelf ? 'items-end' : 'items-start'">
    <span v-if="!isSelf" class="text-xs text-gray-400 ghost:text-ghost-text/40 dark:text-gray-500 font-mono">
      {{ message.from.slice(0, 8) }}
    </span>
    <img
      :src="payload.thumbnailUrl ?? payload.url"
      :alt="payload.filename"
      class="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
      loading="lazy"
      @click="openImage"
    />
    <span class="text-xs text-gray-400 ghost:text-ghost-text/40 dark:text-gray-500">{{ payload.filename }}</span>
  </div>
</template>
