<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import type { MessageEnvelope } from '@cloudia/shared';
import { getRenderer } from '@/plugins/renderer-registry';
import { useIdentityStore } from '@/stores/identity';

const props = defineProps<{
  messages: MessageEnvelope[];
}>();

const identity = useIdentityStore();
const listRef = ref<HTMLElement | null>(null);

watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight;
    }
  },
);

function isSystemType(type: string) {
  return type === 'system' || type === 'join' || type === 'leave';
}
</script>

<template>
  <div ref="listRef" class="flex-1 overflow-y-auto p-4 space-y-2">
    <div
      v-for="msg in messages"
      :key="msg.id"
      class="flex"
      :class="{
        'justify-center': isSystemType(msg.type),
        'justify-end': !isSystemType(msg.type) && msg.from === identity.clientId,
        'justify-start': !isSystemType(msg.type) && msg.from !== identity.clientId,
      }"
    >
      <div :class="isSystemType(msg.type) ? '' : 'max-w-[80%]'">
        <component :is="getRenderer(msg.type)" :message="msg" />
      </div>
    </div>
    <div v-if="messages.length === 0" class="flex flex-col items-center justify-center text-center mt-16 px-4">
      <svg class="w-12 h-12 text-gray-200 ghost:text-ghost-text/20 dark:text-dark-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <p class="text-sm text-gray-400 ghost:text-ghost-text/40 dark:text-gray-500">No messages yet</p>
      <p class="text-xs text-gray-300 ghost:text-ghost-text/20 dark:text-gray-600 mt-1">Send a message to start the conversation</p>
    </div>
  </div>
</template>
