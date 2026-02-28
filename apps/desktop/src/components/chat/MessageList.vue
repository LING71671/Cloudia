<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import type { MessageEnvelope } from '@cloudia/shared';
import { getRenderer } from '@/plugins/renderer-registry';

const props = defineProps<{
  messages: MessageEnvelope[];
}>();

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
</script>

<template>
  <div ref="listRef" class="flex-1 overflow-y-auto p-4 space-y-3">
    <div
      v-for="msg in messages"
      :key="msg.id"
      class="max-w-[80%]"
      :class="msg.type === 'system' ? 'mx-auto max-w-full' : ''"
    >
      <component :is="getRenderer(msg.type)" :message="msg" />
    </div>
    <div v-if="messages.length === 0" class="text-center text-gray-400 ghost:text-ghost-text/40 text-sm mt-8">
      No messages yet. Say something!
    </div>
  </div>
</template>
