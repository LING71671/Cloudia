<script setup lang="ts">
import { useIdentityStore } from '@/stores/identity';
import { useConnectionStore } from '@/stores/connection';
import ConnectionStatus from '@/components/common/ConnectionStatus.vue';
import { onMounted } from 'vue';

const identity = useIdentityStore();
const connection = useConnectionStore();

onMounted(async () => {
  await identity.initialize();
});
</script>

<template>
  <div
    class="h-screen flex flex-col bg-gray-50 text-gray-900"
    :class="{ 'ghost-mode': connection.currentRoomMode === 'ephemeral' }"
  >
    <ConnectionStatus v-if="connection.currentRoomId" />
    <router-view class="flex-1 overflow-hidden" />
  </div>
</template>
