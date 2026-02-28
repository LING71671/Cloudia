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
  <div class="flex flex-col gap-0.5" :class="isSelf ? 'items-end' : 'items-start'">
    <span v-if="!isSelf" class="text-xs text-gray-400 ghost:text-ghost-text/40 dark:text-gray-500 font-mono">
      {{ message.from.slice(0, 8) }}
    </span>
    <div class="flex items-center gap-2 bg-gray-100 ghost:bg-ghost-muted dark:bg-dark-muted rounded-lg px-3 py-2 max-w-[240px]">
      <button
        class="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white shrink-0"
        @click="togglePlay"
      >
        <svg v-if="!playing" class="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      </button>
      <div class="flex-1 min-w-0">
        <div class="h-1 bg-gray-300 ghost:bg-ghost-text/20 dark:bg-dark-border rounded-full overflow-hidden">
          <div class="h-full bg-primary rounded-full transition-all" :style="{ width: progress + '%' }" />
        </div>
        <span class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">
          {{ formatDuration(payload.duration) }}
        </span>
      </div>
    </div>
    <audio ref="audioRef" :src="payload.url" preload="metadata" @ended="onEnded" />
  </div>
</template>
