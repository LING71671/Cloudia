<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat';
import { useConnectionStore } from '@/stores/connection';
import { useSettingsStore } from '@/stores/settings';
import { useIdentityStore } from '@/stores/identity';
import { useWebRTC } from '@/composables/useWebRTC';
import { generateInviteLink } from '@/utils/invite';
import MessageList from '@/components/chat/MessageList.vue';
import MessageInput from '@/components/chat/MessageInput.vue';
import GhostModeBanner from '@/components/chat/GhostModeBanner.vue';

defineProps<{
  roomId: string;
}>();

const chat = useChatStore();
const connection = useConnectionStore();
const settings = useSettingsStore();
const identity = useIdentityStore();
const router = useRouter();
const {
  localStream,
  remoteStream,
  pc,
  createPeerConnection,
  createOffer,
  handleOffer,
  handleAnswer,
  addIceCandidate,
  startLocalStream,
  cleanup: cleanupRTC,
} = useWebRTC();

const inCall = ref(false);
const localVideoRef = ref<HTMLVideoElement | null>(null);
const remoteVideoRef = ref<HTMLVideoElement | null>(null);

// Handle WebRTC signaling messages
const unsubSignaling = connection.onMessage(async (msg) => {
  if (msg.from === identity.clientId) return;

  if (msg.type === 'offer') {
    const payload = msg.payload as { sdp: string };
    if (!pc.value) await createPeerConnection();
    await startLocalStream(true, true);
    bindStreams();
    const answer = await handleOffer(payload.sdp);
    await chat.sendMessage('answer', { sdp: answer.sdp });
    setupIceTrickle(msg.from);
    inCall.value = true;
  } else if (msg.type === 'answer') {
    const payload = msg.payload as { sdp: string };
    await handleAnswer(payload.sdp);
  } else if (msg.type === 'ice-candidate') {
    const payload = msg.payload as { candidate: RTCIceCandidateInit };
    await addIceCandidate(payload.candidate);
  }
});

function setupIceTrickle(peerId: string) {
  if (!pc.value) return;
  pc.value.addEventListener('icecandidate', (event) => {
    if (event.candidate) {
      chat.sendMessage('ice-candidate', { candidate: event.candidate.toJSON() });
    }
  });
}

function bindStreams() {
  if (localVideoRef.value && localStream.value) {
    localVideoRef.value.srcObject = localStream.value;
  }
  // remoteStream is populated via 'track' event in useWebRTC
  if (remoteVideoRef.value && remoteStream.value) {
    remoteVideoRef.value.srcObject = remoteStream.value;
  }
}

async function startCall() {
  await createPeerConnection();
  await startLocalStream(true, true);
  bindStreams();
  const offer = await createOffer();
  await chat.sendMessage('offer', { sdp: offer.sdp });
  setupIceTrickle('');
  inCall.value = true;
}

function endCall() {
  cleanupRTC();
  inCall.value = false;
}

function handleSend(content: string) {
  chat.sendText(content);
}

const linkCopied = ref(false);
function shareInviteLink() {
  if (!chat.currentRoom) return;
  const link = generateInviteLink(chat.currentRoom, settings.wsEndpoint);
  navigator.clipboard.writeText(link);
  linkCopied.value = true;
  setTimeout(() => (linkCopied.value = false), 2000);
}

function handleLeave() {
  endCall();
  chat.leaveRoom();
  router.push({ name: 'lobby' });
}

onUnmounted(() => {
  unsubSignaling();
  endCall();
  chat.leaveRoom();
});
</script>

<template>
  <div class="flex flex-col h-full bg-white ghost:bg-ghost-bg">
    <!-- Header -->
    <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-200 ghost:border-ghost-muted">
      <button
        class="text-gray-500 hover:text-gray-700 ghost:text-ghost-text/60 ghost:hover:text-ghost-text"
        @click="handleLeave"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="flex-1 min-w-0">
        <h2 class="text-sm font-semibold text-gray-800 ghost:text-ghost-text truncate">
          {{ chat.currentRoom?.name ?? 'Chat' }}
        </h2>
        <span class="text-xs text-gray-400 ghost:text-ghost-text/40">
          {{ chat.currentRoom?.mode === 'ephemeral' ? 'Ghost Mode · E2EE' : 'Standard' }}
        </span>
      </div>
      <!-- Share invite link -->
      <button
        class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 ghost:text-ghost-text/60 ghost:hover:bg-ghost-muted"
        :title="linkCopied ? 'Copied!' : 'Copy invite link'"
        @click="shareInviteLink"
      >
        <svg v-if="!linkCopied" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <svg v-else class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <!-- Call button -->
      <button
        v-if="!inCall"
        class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 ghost:text-ghost-text/60 ghost:hover:bg-ghost-muted"
        title="Start call"
        @click="startCall"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      <button
        v-else
        class="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
        title="End call"
        @click="endCall"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Video call area -->
    <div v-if="inCall" class="relative bg-black h-48 shrink-0">
      <video
        ref="remoteVideoRef"
        autoplay
        playsinline
        class="w-full h-full object-cover"
        :srcObject="remoteStream ?? undefined"
      />
      <video
        ref="localVideoRef"
        autoplay
        playsinline
        muted
        class="absolute bottom-2 right-2 w-24 h-18 rounded-lg object-cover border-2 border-white/30"
        :srcObject="localStream ?? undefined"
      />
    </div>

    <!-- Ghost mode banner -->
    <GhostModeBanner v-if="connection.currentRoomMode === 'ephemeral'" />

    <!-- Messages -->
    <MessageList :messages="chat.messages" />

    <!-- Input -->
    <MessageInput @send="handleSend" />
  </div>
</template>
