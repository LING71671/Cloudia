<script setup lang="ts">
import { ref } from 'vue';
import { useAudioRecorder } from '@/composables/useAudioRecorder';

const emit = defineEmits<{
  send: [content: string];
  'send-image': [file: File];
  'send-audio': [blob: Blob, duration: number];
}>();

const input = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const { isRecording, duration, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

function handleSend() {
  const text = input.value.trim();
  if (!text) return;
  emit('send', text);
  input.value = '';
}

function openFilePicker() {
  fileInput.value?.click();
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    emit('send-image', file);
    target.value = '';
  }
}

async function toggleRecording() {
  if (isRecording.value) {
    const { blob, duration: dur } = await stopRecording();
    if (blob.size > 0 && dur > 0) {
      emit('send-audio', blob, dur);
    }
  } else {
    await startRecording();
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
</script>

<template>
  <div class="px-4 py-3 bg-transparent">
    <form
      class="flex items-center gap-2 p-1.5 rounded-2xl border border-gray-200/80 ghost:border-ghost-muted dark:border-white/10 bg-white/90 ghost:bg-ghost-bg/90 dark:bg-dark-surface/90 shadow-sm backdrop-blur-xl transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30"
      @submit.prevent="handleSend"
    >
      <!-- Hidden file input -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileChange"
      />

      <!-- Image button -->
      <button
        type="button"
        class="p-2.5 rounded-xl text-gray-400 hover:text-primary hover:bg-primary-soft/50 ghost:text-ghost-text/40 ghost:hover:text-ghost-text/70 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-white/5 transition-colors shrink-0"
        title="Send image"
        @click="openFilePicker"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      <!-- Recording indicator or text input -->
      <div v-if="isRecording" class="flex-1 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 ghost:bg-red-900/20 border border-red-100 ghost:border-red-800 dark:bg-red-500/10 dark:border-red-500/20">
        <div class="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
        <span class="text-[15px] font-medium text-red-600 ghost:text-red-400 dark:text-red-400">Recording {{ formatDuration(duration) }}</span>
        <button
          type="button"
          class="ml-auto text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
          @click="cancelRecording"
        >
          Cancel
        </button>
      </div>
      <input
        v-else
        v-model="input"
        type="text"
        placeholder="Type a message..."
        class="flex-1 px-3 py-2.5 bg-transparent border-none text-[15px] text-gray-800 ghost:text-ghost-text dark:text-dark-text placeholder-gray-400/80 ghost:placeholder-ghost-text/30 dark:placeholder-gray-500 focus:outline-none focus:ring-0"
        autocomplete="off"
      />

      <!-- Audio record button -->
      <button
        type="button"
        class="p-2.5 shrink-0 rounded-xl transition-colors"
        :class="isRecording
          ? 'text-red-500 hover:text-red-700 bg-red-50 ghost:bg-red-900/20 dark:bg-red-500/10'
          : 'text-gray-400 hover:text-primary hover:bg-primary-soft/50 ghost:text-ghost-text/40 ghost:hover:text-ghost-text/70 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-white/5'"
        :title="isRecording ? 'Stop recording' : 'Record voice message'"
        @click="toggleRecording"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>

      <!-- Send button -->
      <button
        v-if="!isRecording"
        type="submit"
        :disabled="!input.trim()"
        class="p-2.5 rounded-xl bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-white/5 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-all shrink-0 active:scale-95"
      >
        <svg class="w-5 h-5 -rotate-90 translate-x-0.5 translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </form>
  </div>
</template>
