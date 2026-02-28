<script setup lang="ts">
import type { MessageEnvelope } from '@cloudia/shared';
import { useIdentityStore } from '@/stores/identity';
import { useChatStore } from '@/stores/chat';
import { computed } from 'vue';

const props = defineProps<{
  message: MessageEnvelope<'text'>;
}>();

const identity = useIdentityStore();
const chat = useChatStore();
const isSelf = props.message.from === identity.clientId;
const senderLabel = computed(() =>
  chat.memberNames[props.message.from] ?? props.message.from.slice(0, 8),
);
</script>

<template>
  <div class="flex flex-col gap-1 w-full" :class="isSelf ? 'items-end' : 'items-start'">
    <span v-if="!isSelf" class="text-[11px] text-gray-400/80 ghost:text-ghost-text/40 dark:text-gray-500 font-medium tracking-wide">{{ senderLabel }}</span>
    <div
      class="px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed break-words max-w-prose shadow-sm"
      :class="isSelf
        ? 'bg-gradient-to-br from-primary to-indigo-500 text-white rounded-br-[4px] shadow-indigo-500/10'
        : 'bg-white border border-gray-100/50 text-gray-800 ghost:border-ghost-muted ghost:bg-ghost-bg ghost:text-ghost-text dark:bg-dark-surface dark:border-white/5 dark:text-gray-100 rounded-bl-[4px] shadow-black/5'"
    >
      {{ message.payload.content }}
    </div>
  </div>
</template>
