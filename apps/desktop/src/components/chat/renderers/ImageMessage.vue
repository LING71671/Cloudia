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
  <div class="flex flex-col gap-1 w-full" :class="isSelf ? 'items-end' : 'items-start'">
    <span v-if="!isSelf" class="text-[11px] text-gray-400/80 ghost:text-ghost-text/40 dark:text-gray-500 font-medium tracking-wide">
      {{ message.from.slice(0, 8) }}
    </span>
    <div class="relative group mt-0.5">
       <img
        :src="payload.thumbnailUrl ?? payload.url"
        :alt="payload.filename"
        class="max-w-[280px] md:max-w-sm rounded-[14px] cursor-pointer hover:opacity-95 transition-all shadow-sm ring-1 ring-gray-200/50 dark:ring-white/10"
        :class="isSelf ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'"
        loading="lazy"
        @click="openImage"
      />
      <div class="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-[14px] pointer-events-none" :class="isSelf ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'"></div>
    </div>
  </div>
</template>
