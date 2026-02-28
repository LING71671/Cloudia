<script setup lang="ts">
import { ref } from 'vue';
import type { MessageEnvelope } from '@cloudia/shared';
import { useIdentityStore } from '@/stores/identity';

const props = defineProps<{
  message: MessageEnvelope<'audio'>;
}>();

const identity = useIdentityStore();
const isSelf = props.message.from === identity.clientId;

const audioRef = ref<HTMLAudioElement | null>(null);
const playing = ref(false);
const progress = ref(0);
let animFrame = 0;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function togglePlay() {
  if (!audioRef.value) return;
  if (playing.value) {
    audioRef.value.pause();
    playing.value = false;
    cancelAnimationFrame(animFrame);
  } else {
    audioRef.value.play();
    playing.value = true;
    updateProgress();
  }
}

function updateProgress() {
  if (!audioRef.value) return;
  if (audioRef.value.duration) {
    progress.value = (audioRef.value.currentTime / audioRef.value.duration) * 100;
  }
  if (playing.value) {
    animFrame = requestAnimationFrame(updateProgress);
  }
}

function onEnded() {
  playing.value = false;
  progress.value = 0;
  cancelAnimationFrame(animFrame);
}

const payload = props.message.payload as any;
</script>

<template>
  <div class="flex flex-col gap-1 w-full" :class="isSelf ? 'items-end' : 'items-start'">
    <span v-if="!isSelf" class="text-[11px] text-gray-400/80 ghost:text-ghost-text/40 dark:text-gray-500 font-medium tracking-wide">
      {{ message.from.slice(0, 8) }}
    </span>
    <div 
      class="flex items-center gap-3 rounded-full px-2 py-1.5 max-w-[260px] shadow-sm ring-1"
      :class="isSelf
        ? 'bg-white dark:bg-dark-surface ring-gray-100 dark:ring-white/5'
        : 'bg-indigo-50/50 dark:bg-indigo-500/5 ring-indigo-100/50 dark:ring-white/5'"
    >
      <button
        class="w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-transform active:scale-95"
        :class="isSelf ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'bg-white dark:bg-dark-surface-elevated text-primary shadow-sm'"
        @click="togglePlay"
      >
        <svg v-if="!playing" class="w-4 h-4 translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else class="w-4 h-4" file="currentColor" viewBox="0 0 24 24">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      </button>
      <div class="flex-1 min-w-[120px] ml-1">
        <div class="h-1.5 bg-gray-200/60 ghost:bg-ghost-text/20 dark:bg-white/10 rounded-full overflow-hidden relative">
          <div class="absolute inset-y-0 left-0 bg-primary rounded-full transition-none" :style="{ width: progress + '%' }" />
        </div>
      </div>
      <span class="text-[11px] font-mono font-medium text-gray-400 dark:text-gray-500 mr-2 shrink-0">
        {{ formatDuration(payload.duration) }}
      </span>
    </div>
    <audio ref="audioRef" :src="payload.url" preload="metadata" @ended="onEnded" />
  </div>
</template>
