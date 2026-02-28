<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { RoomInfo, RoomMode, RoomAccessLevel } from '@cloudia/shared';
import { useChatStore } from '@/stores/chat';
import { useIdentityStore } from '@/stores/identity';
import { useSettingsStore } from '@/stores/settings';
import { useToast } from '@/composables/useToast';
import RoomList from '@/components/lobby/RoomList.vue';
import CreateRoom from '@/components/lobby/CreateRoom.vue';
import JoinByCode from '@/components/lobby/JoinByCode.vue';
import IdentityBadge from '@/components/common/IdentityBadge.vue';

const chat = useChatStore();
const identity = useIdentityStore();
const settings = useSettingsStore();
const router = useRouter();
const { show: toast } = useToast();

onMounted(async () => {
  settings.applyUrlOverrides();
  // Ensure identity is initialized before fetching rooms
  if (!identity.ready) {
    await identity.initialize();
  }
  chat.fetchRooms();
});

const creating = ref(false);

async function handleCreate(name: string, mode: RoomMode, accessLevel: RoomAccessLevel, password?: string, dmTarget?: string) {
  if (creating.value) return;
  creating.value = true;
  try {
    const room = await chat.createRoom(name, mode, {
      accessLevel,
      password,
      participants: dmTarget ? [identity.clientId, dmTarget] : undefined,
    });
    await handleJoin(room);
  } catch (e) {
    toast('Failed to create room', 'error');
    console.error('Failed to create room:', e);
  } finally {
    creating.value = false;
  }
}

async function handleJoin(room: RoomInfo, password?: string) {
  await chat.joinRoom(room, { password });
  router.push({ name: 'chat', params: { roomId: room.id } });
}

async function handleJoinByCode(code: string) {
  try {
    const room = await chat.joinByShortCode(code);
    router.push({ name: 'chat', params: { roomId: room.id } });
  } catch (e) {
    toast('Room not found', 'error');
    console.error('Failed to join by code:', e);
  }
}

async function handleDelete(roomId: string) {
  try {
    await chat.removeRoom(roomId);
    toast('Room deleted', 'success');
  } catch (e) {
    toast('Failed to delete room', 'error');
    console.error('Failed to delete room:', e);
  }
}
</script>

<template>
  <div class="flex h-full bg-gray-50/50 dark:bg-dark-bg transition-colors duration-500">
    <aside class="w-full md:w-80 border-r border-gray-100 dark:border-white/5 flex flex-col bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl shrink-0 z-10 shadow-sm">
      <div class="px-6 py-5 flex items-center justify-between">
        <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50 bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-400">Cloudia</h1>
        <div class="flex items-center gap-1.5 border border-gray-100 dark:border-white/10 rounded-full p-1 bg-white/50 dark:bg-black/20">
          <button
            class="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-white/10 transition-colors"
            title="Refresh rooms"
            @click="chat.fetchRooms()"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            class="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-white/10 transition-colors"
            title="Settings"
            @click="router.push({ name: 'settings' })"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
      
      <div class="px-6 pb-2">
         <IdentityBadge class="w-full justify-center py-2 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100/50 dark:border-white/5" />
      </div>

      <div class="px-5 py-4 space-y-4">
        <CreateRoom :loading="creating" @create="handleCreate" />
        <JoinByCode @join-by-code="handleJoinByCode" />
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-6 elegant-scrollbar">
        <div class="px-2 mb-2">
            <h2 class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Your Spaces</h2>
        </div>
        <RoomList :rooms="chat.rooms" :loading="chat.loading" :current-client-id="identity.clientId" @join="handleJoin" @delete="handleDelete" />
      </div>
    </aside>
    
    <main class="hidden md:flex flex-1 items-center justify-center relative overflow-hidden bg-white dark:bg-[#09090b]">
      <!-- Abstract subtle background pattern -->
      <div class="absolute inset-0 opacity-[0.02] dark:opacity-5 pointer-events-none" style="background-image: radial-gradient(#6366f1 1px, transparent 1px); background-size: 32px 32px;"></div>
      
      <div class="text-center z-10 flex flex-col items-center max-w-sm px-6">
        <div class="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-white/5 flex items-center justify-center mb-6 shadow-sm border border-indigo-100/50 dark:border-white/5">
           <svg class="w-8 h-8 text-primary/80 dark:text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Ready to connect</h3>
        <p class="text-[15px] leading-relaxed text-gray-500 dark:text-gray-400">Select a room from the sidebar to start chatting, or create a new space.</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.elegant-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.elegant-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.elegant-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--color-gray-200, #e5e7eb);
  border-radius: 4px;
}
.dark .elegant-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
