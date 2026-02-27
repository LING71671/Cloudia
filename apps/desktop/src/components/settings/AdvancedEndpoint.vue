<script setup lang="ts">
import { ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
const wsInput = ref(settings.wsEndpoint);
const restInput = ref(settings.restEndpoint);
const saved = ref(false);

function save() {
  settings.setEndpoints(wsInput.value, restInput.value);
  saved.value = true;
  setTimeout(() => (saved.value = false), 2000);
}

function reset() {
  settings.resetToDefault();
  wsInput.value = settings.wsEndpoint;
  restInput.value = settings.restEndpoint;
}
</script>

<template>
  <details class="mt-6 border border-gray-200 rounded-lg">
    <summary class="px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800">
      Advanced — Custom Server Endpoint
    </summary>
    <div class="px-4 pb-4 space-y-3">
      <div>
        <label class="block text-xs text-gray-500 mb-1">WebSocket Endpoint</label>
        <input
          v-model="wsInput"
          type="text"
          placeholder="wss://your-server.example.com"
          class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div>
        <label class="block text-xs text-gray-500 mb-1">REST Endpoint</label>
        <input
          v-model="restInput"
          type="text"
          placeholder="https://your-server.example.com"
          class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div class="flex gap-2">
        <button
          class="px-4 py-1.5 rounded-lg bg-primary text-white text-sm hover:bg-primary-hover transition-colors"
          @click="save"
        >
          {{ saved ? 'Saved!' : 'Save' }}
        </button>
        <button
          class="px-4 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          @click="reset"
        >
          Reset to Default
        </button>
      </div>
    </div>
  </details>
</template>
