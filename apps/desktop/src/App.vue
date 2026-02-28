<script setup lang="ts">
import { useIdentityStore } from '@/stores/identity';
import { useConnectionStore } from '@/stores/connection';
import { useThemeStore } from '@/stores/theme';
import ConnectionStatus from '@/components/common/ConnectionStatus.vue';
import ToastContainer from '@/components/common/ToastContainer.vue';
import { onMounted } from 'vue';

const identity = useIdentityStore();
const connection = useConnectionStore();
const theme = useThemeStore();

onMounted(async () => {
  await identity.initialize();
});
</script>

<template>
  <div
    class="h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-dark-bg dark:text-dark-text"
    :class="{ 'ghost-mode': connection.currentRoomMode === 'ephemeral' }"
  >
    <ConnectionStatus v-if="connection.currentRoomId" />
    <router-view class="flex-1 overflow-hidden" />
    <ToastContainer />
  </div>
</template>
