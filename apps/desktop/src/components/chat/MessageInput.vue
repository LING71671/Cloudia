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
  <form
    class="flex items-center gap-2 p-3 border-t border-gray-200 ghost:border-ghost-muted bg-white ghost:bg-ghost-bg"
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
      class="p-2 text-gray-400 hover:text-gray-600 ghost:text-ghost-text/40 ghost:hover:text-ghost-text/70 shrink-0"
      title="Send image"
      @click="openFilePicker"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </button>

    <!-- Recording indicator or text input -->
    <div v-if="isRecording" class="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 ghost:bg-red-900/20 border border-red-200 ghost:border-red-800">
      <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      <span class="text-sm text-red-600 ghost:text-red-400">Recording {{ formatDuration(duration) }}</span>
      <button
        type="button"
        class="ml-auto text-xs text-red-500 hover:text-red-700"
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
      class="flex-1 px-3 py-2 rounded-lg border border-gray-300 ghost:border-ghost-muted ghost:bg-ghost-muted ghost:text-ghost-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      autocomplete="off"
    />

    <!-- Audio record button -->
    <button
      type="button"
      class="p-2 shrink-0 rounded-lg transition-colors"
      :class="isRecording
        ? 'text-red-500 hover:text-red-700 bg-red-50 ghost:bg-red-900/20'
        : 'text-gray-400 hover:text-gray-600 ghost:text-ghost-text/40 ghost:hover:text-ghost-text/70'"
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
      class="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
    >
      Send
    </button>
  </form>
</template>
