<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { RoomInfo, RoomMode, RoomAccessLevel } from '@cloudia/shared';
import { useChatStore } from '@/stores/chat';
import { useIdentityStore } from '@/stores/identity';
import { useSettingsStore } from '@/stores/settings';
import RoomList from '@/components/lobby/RoomList.vue';
import CreateRoom from '@/components/lobby/CreateRoom.vue';
import JoinByCode from '@/components/lobby/JoinByCode.vue';
import IdentityBadge from '@/components/common/IdentityBadge.vue';

const chat = useChatStore();
const identity = useIdentityStore();
const settings = useSettingsStore();
const router = useRouter();

onMounted(() => {
  settings.applyUrlOverrides();
  chat.fetchRooms();
});

async function handleCreate(name: string, mode: RoomMode, accessLevel: RoomAccessLevel, password?: string, dmTarget?: string) {
  try {
    const room = await chat.createRoom(name, mode, {
      accessLevel,
      password,
      participants: dmTarget ? [identity.clientId, dmTarget] : undefined,
    });
    await handleJoin(room);
  } catch (e) {
    console.error('Failed to create room:', e);
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
    console.error('Failed to join by code:', e);
  }
}
</script>

<template>
  <div class="flex h-full">
    <aside class="w-72 border-r border-gray-200 flex flex-col bg-white">
      <div class="p-4 border-b border-gray-100 flex items-center justify-between">
        <h1 class="text-lg font-semibold text-gray-800">Cloudia</h1>
        <div class="flex items-center gap-2">
          <IdentityBadge />
          <button
            class="text-gray-400 hover:text-gray-600"
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
      <div class="p-4 space-y-3">
        <CreateRoom @create="handleCreate" />
        <JoinByCode @join-by-code="handleJoinByCode" />
      </div>
      <div class="flex-1 overflow-y-auto px-2">
        <RoomList :rooms="chat.rooms" :loading="chat.loading" @join="handleJoin" />
      </div>
    </aside>
    <main class="flex-1 flex items-center justify-center text-gray-400 text-sm">
      Select a room to start chatting
    </main>
  </div>
</template>
