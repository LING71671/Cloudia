<script setup lang="ts">
import type { MessageEnvelope } from '@cloudia/shared';

const props = defineProps<{
  message: MessageEnvelope<'image'>;
}>();

const payload = props.message.payload as { url: string; filename: string };

function openImage() {
  window.open(payload.url, '_blank');
}
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <span class="text-xs text-gray-400 ghost:text-ghost-text/40 font-mono">
      {{ message.from.slice(0, 8) }}
    </span>
    <img
      :src="payload.url"
      :alt="payload.filename"
      class="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
      loading="lazy"
      @click="openImage"
    />
    <span class="text-xs text-gray-400">{{ payload.filename }}</span>
  </div>
</template>
