<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick } from 'vue';
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
  peers,
  peerStreams,
  localStream,
  callMode,
  createPeerConnection,
  createOffer,
  handleOffer,
  handleAnswer,
  addIceCandidate,
  getPeerConnection,
  startLocalStream,
  removePeer,
  cleanup: cleanupRTC,
} = useWebRTC();

const localVideoRef = ref<HTMLVideoElement | null>(null);
const callDuration = ref(0);
let callTimer: ReturnType<typeof setInterval> | null = null;

// Grid columns based on participant count
const gridClass = computed(() => {
  const count = peerStreams.value.length;
  if (count <= 1) return 'grid-cols-1';
  if (count <= 2) return 'grid-cols-2';
  return 'grid-cols-2';
});

// Handle WebRTC signaling messages
const unsubSignaling = connection.onMessage(async (msg) => {
  if (msg.from === identity.clientId) return;

  if (msg.type === 'offer') {
    const payload = msg.payload as { sdp: string; callMode?: string };
    await startLocalStream(
      callMode.value === 'video' || payload.callMode === 'video',
      true,
    );
    if (payload.callMode && callMode.value === 'none') {
      callMode.value = payload.callMode as 'video' | 'voice';
      startCallTimer();
    }
    const answer = await handleOffer(msg.from, payload.sdp);
    await chat.sendMessage('answer', { sdp: answer.sdp });
    setupIceTrickle(msg.from);
    bindLocalVideo();
  } else if (msg.type === 'answer') {
    const payload = msg.payload as { sdp: string };
    await handleAnswer(msg.from, payload.sdp);
  } else if (msg.type === 'ice-candidate') {
    const payload = msg.payload as { candidate: RTCIceCandidateInit };
    await addIceCandidate(msg.from, payload.candidate);
  } else if (msg.type === 'leave') {
    removePeer(msg.from);
  }
});

function setupIceTrickle(peerId: string) {
  const pc = getPeerConnection(peerId);
  if (!pc) return;
  pc.addEventListener('icecandidate', (event) => {
    if (event.candidate) {
      chat.sendMessage('ice-candidate', { candidate: event.candidate.toJSON() });
    }
  });
}

function bindLocalVideo() {
  nextTick(() => {
    if (localVideoRef.value && localStream.value) {
      localVideoRef.value.srcObject = localStream.value;
    }
  });
}

function startCallTimer() {
  callDuration.value = 0;
  callTimer = setInterval(() => callDuration.value++, 1000);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}


async function startVideoCall() {
  callMode.value = 'video';
  await startLocalStream(true, true);
  bindLocalVideo();
  await broadcastOffer();
  startCallTimer();
}

async function startVoiceCall() {
  callMode.value = 'voice';
  await startLocalStream(false, true);
  await broadcastOffer();
  startCallTimer();
}

async function broadcastOffer() {
  // Create a peer connection and send offer (peers will respond)
  // For mesh: each new joiner sends offer to all existing participants
  // The server's member list system message tells us who's in the room
  const offer = await createOffer('__broadcast__');
  await chat.sendMessage('offer', { sdp: offer.sdp, callMode: callMode.value });
}

function endCall() {
  if (callTimer) {
    clearInterval(callTimer);
    callTimer = null;
  }
  cleanupRTC();
}

function handleSend(content: string) {
  chat.sendText(content);
}

async function handleSendImage(file: File) {
  const res = await fetch(`${settings.restEndpoint}/api/media/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': file.type,
      'X-Client-ID': identity.clientId,
    },
    body: file,
  });
  if (!res.ok) return;
  const { url } = await res.json();
  await chat.sendMessage('image', {
    url: `${settings.restEndpoint}${url}`,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
  });
}

async function handleSendAudio(blob: Blob, duration: number) {
  const res = await fetch(`${settings.restEndpoint}/api/media/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': blob.type || 'audio/webm',
      'X-Client-ID': identity.clientId,
    },
    body: blob,
  });
  if (!res.ok) return;
  const { url } = await res.json();
  await chat.sendMessage('audio', {
    url: `${settings.restEndpoint}${url}`,
    duration,
    size: blob.size,
    mimeType: blob.type || 'audio/webm',
  });
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
      <!-- Voice call button -->
      <button
        v-if="callMode === 'none'"
        class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 ghost:text-ghost-text/60 ghost:hover:bg-ghost-muted"
        title="Voice call"
        @click="startVoiceCall"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </button>
      <!-- Video call button -->
      <button
        v-if="callMode === 'none'"
        class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 ghost:text-ghost-text/60 ghost:hover:bg-ghost-muted"
        title="Video call"
        @click="startVideoCall"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      <!-- End call button -->
      <button
        v-if="callMode !== 'none'"
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
    <div v-if="callMode === 'video'" class="relative bg-black shrink-0 aspect-video max-h-[60vh]">
      <!-- Remote video grid -->
      <div class="w-full h-full grid gap-1" :class="gridClass">
        <div
          v-for="[peerId, peer] in peerStreams"
          :key="peerId"
          class="relative bg-gray-900"
        >
          <video
            autoplay
            playsinline
            class="w-full h-full object-contain"
            :srcObject="peer.stream"
          />
          <span class="absolute bottom-1 left-2 text-xs text-white/70 bg-black/40 px-1.5 py-0.5 rounded">
            {{ peerId.slice(0, 8) }}
          </span>
        </div>
        <div v-if="peerStreams.length === 0" class="flex items-center justify-center text-white/40 text-sm">
          Waiting for others to join...
        </div>
      </div>
      <!-- Local video PiP -->
      <video
        ref="localVideoRef"
        autoplay
        playsinline
        muted
        class="absolute bottom-3 right-3 w-32 h-24 rounded-lg object-cover border-2 border-white/30 shadow-lg"
        :srcObject="localStream ?? undefined"
      />
    </div>

    <!-- Voice call area -->
    <div v-if="callMode === 'voice'" class="flex items-center justify-center gap-4 py-4 bg-gray-50 ghost:bg-ghost-muted border-b border-gray-200 ghost:border-ghost-muted shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        <span class="text-sm text-gray-600 ghost:text-ghost-text/60">Voice call</span>
      </div>
      <span class="text-sm font-mono text-gray-500">{{ formatDuration(callDuration) }}</span>
      <span class="text-xs text-gray-400">
        {{ peerStreams.length }} participant{{ peerStreams.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Ghost mode banner -->
    <GhostModeBanner v-if="connection.currentRoomMode === 'ephemeral'" />

    <!-- Messages -->
    <MessageList :messages="chat.messages" />

    <!-- Input -->
    <MessageInput @send="handleSend" @send-image="handleSendImage" @send-audio="handleSendAudio" />
  </div>
</template>

