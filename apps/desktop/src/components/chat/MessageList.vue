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
  <div ref="listRef" class="flex-1 overflow-y-auto p-4 md:px-6 space-y-4">
    <div
      v-for="msg in messages"
      :key="msg.id"
      class="flex w-full"
      :class="{
        'justify-center': isSystemType(msg.type),
        'justify-end': !isSystemType(msg.type) && msg.from === identity.clientId,
        'justify-start': !isSystemType(msg.type) && msg.from !== identity.clientId,
      }"
    >
      <div :class="isSystemType(msg.type) ? '' : 'max-w-[85%] md:max-w-[70%]'">
        <component :is="getRenderer(msg.type)" :message="msg" />
      </div>
    </div>
    <!-- Soft empty state -->
    <div v-if="messages.length === 0" class="flex flex-col items-center justify-center text-center mt-24 px-4 h-full pointer-events-none">
      <div class="w-16 h-16 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Quiet in here</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[200px] leading-relaxed">Be the first to start the conversation.</p>
    </div>
  </div>
</template>
