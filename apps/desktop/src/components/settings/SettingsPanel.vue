<script setup lang="ts">
import { ref } from 'vue';
import { useIdentityStore } from '@/stores/identity';
import IdentityBadge from '@/components/common/IdentityBadge.vue';

const identity = useIdentityStore();
const nameInput = ref(identity.displayName);

function saveName() {
  identity.setDisplayName(nameInput.value);
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-sm font-medium text-gray-700 mb-2">Identity</h3>
      <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <span class="text-xs text-gray-500">Client ID:</span>
        <IdentityBadge />
      </div>
    </div>

    <div>
      <h3 class="text-sm font-medium text-gray-700 mb-2">Display Name</h3>
      <div class="flex gap-2">
        <input
          v-model="nameInput"
          type="text"
          placeholder="Anonymous"
          class="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          class="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-hover transition-colors"
          @click="saveName"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>
