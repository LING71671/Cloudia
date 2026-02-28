<script setup lang="ts">
import type { MessageEnvelope } from '@cloudia/shared';
import { useChatStore } from '@/stores/chat';
import { computed } from 'vue';

const props = defineProps<{
  message: MessageEnvelope<'join'> | MessageEnvelope<'leave'>;
}>();

const chat = useChatStore();
const label = computed(() => {
  const name = chat.memberNames[props.message.from] ?? props.message.from.slice(0, 8);
  return props.message.type === 'join' ? `${name} joined` : `${name} left`;
});
</script>

<template>
  <div class="flex items-center justify-center my-2">
    <div class="text-[11px] font-medium tracking-wide text-gray-400 ghost:text-ghost-text/40 dark:text-gray-500 uppercase">
      {{ label }}
    </div>
  </div>
</template>
