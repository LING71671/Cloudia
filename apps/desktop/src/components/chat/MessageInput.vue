<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  send: [content: string];
}>();

const input = ref('');

function handleSend() {
  const text = input.value.trim();
  if (!text) return;
  emit('send', text);
  input.value = '';
}
</script>

<template>
  <form
    class="flex gap-2 p-3 border-t border-gray-200 ghost:border-ghost-muted bg-white ghost:bg-ghost-bg"
    @submit.prevent="handleSend"
  >
    <input
      v-model="input"
      type="text"
      placeholder="Type a message..."
      class="flex-1 px-3 py-2 rounded-lg border border-gray-300 ghost:border-ghost-muted ghost:bg-ghost-muted ghost:text-ghost-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      autocomplete="off"
    />
    <button
      type="submit"
      :disabled="!input.trim()"
      class="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      Send
    </button>
  </form>
</template>
