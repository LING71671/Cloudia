<script setup lang="ts">
import { useRouter } from 'vue-router';
import SettingsPanel from '@/components/settings/SettingsPanel.vue';
import AdvancedEndpoint from '@/components/settings/AdvancedEndpoint.vue';

const router = useRouter();
</script>

<template>
  <div class="max-w-lg mx-auto p-6">
    <div class="flex items-center gap-3 mb-6">
      <button
        class="text-gray-500 hover:text-gray-700"
        @click="router.push({ name: 'lobby' })"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h2 class="text-lg font-semibold text-gray-800">Settings</h2>
    </div>

    <SettingsPanel />
    <AdvancedEndpoint />
  </div>
</template>
