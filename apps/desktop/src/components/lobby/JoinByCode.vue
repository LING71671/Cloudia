<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{ 'join-by-code': [code: string] }>();
const code = ref('');

function handleInput(e: Event) {
  const input = e.target as HTMLInputElement;
  code.value = input.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 6);
}
</script>

<template>
  <div class="flex gap-2">
    <input
      :value="code"
      @input="handleInput"
      type="text"
      maxlength="6"
      placeholder="ABC123"
      class="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono tracking-widest uppercase text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
    <button
      :disabled="code.length !== 6"
      class="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-40 transition-colors"
      @click="emit('join-by-code', code)"
    >
      Join
    </button>
  </div>
</template>
