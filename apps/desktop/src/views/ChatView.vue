<script setup lang="ts">
import { ref, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat';
import { useConnectionStore } from '@/stores/connection';
import { useSettingsStore } from '@/stores/settings';
import { useIdentityStore } from '@/stores/identity';
import { useWebRTC } from '@/composables/useWebRTC';
import { generateInviteLink } from '@/utils/invite';
import { compressImage } from '@/utils/image-compress';
import MessageList from '@/components/chat/MessageList.vue';
import MessageInput from '@/components/chat/MessageInput.vue';
import GhostModeBanner from '@/components/chat/GhostModeBanner.vue';

const props = defineProps<{
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
const roomMembers = ref<string[]>([]);
let callTimer: ReturnType<typeof setInterval> | null = null;

// Handle WebRTC signaling messages and member tracking
const unsubSignaling = connection.onMessage(async (msg) => {
  // Track room members from server system messages (don't block — let chat store also see it)
  if (msg.type === 'system' && msg.from === '__server__') {
    try {
      const data = JSON.parse((msg.payload as { content: string }).content);
      if (data.members) {
        roomMembers.value = data.members
          .map((m: { clientId: string }) => m.clientId)
          .filter((id: string) => id !== identity.clientId);
      }
    } catch { /* not a member list message */ }
    // Don't return — let chat store handler also process system messages
  }

  // Track join/leave for member list (don't block other handlers)
  if (msg.type === 'join' && msg.from !== identity.clientId) {
    if (!roomMembers.value.includes(msg.from)) {
      roomMembers.value = [...roomMembers.value, msg.from];
    }
  }
  if (msg.type === 'leave' && msg.from !== identity.clientId) {
    roomMembers.value = roomMembers.value.filter(id => id !== msg.from);
    removePeer(msg.from);
  }

  // Only handle WebRTC signaling below
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
    setupIceTrickle(msg.from);
    // Send answer targeted to the offerer
    await chat.sendMessage('answer', { sdp: answer.sdp }, msg.from);
    bindLocalVideo();
  } else if (msg.type === 'answer') {
    const payload = msg.payload as { sdp: string };
    await handleAnswer(msg.from, payload.sdp);
  } else if (msg.type === 'ice-candidate') {
    const payload = msg.payload as { candidate: RTCIceCandidateInit };
    await addIceCandidate(msg.from, payload.candidate);
  }
});

function setupIceTrickle(peerId: string) {
  const pc = getPeerConnection(peerId);
  if (!pc) return;
  pc.addEventListener('icecandidate', (event) => {
    if (event.candidate) {
      // Send ICE candidate targeted to the specific peer
      chat.sendMessage('ice-candidate', { candidate: event.candidate.toJSON() }, peerId);
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
  // Create individual peer connections for each known room member
  for (const peerId of roomMembers.value) {
    const offer = await createOffer(peerId);
    setupIceTrickle(peerId);
    // Send offer targeted to the specific peer
    await chat.sendMessage('offer', { sdp: offer.sdp, callMode: callMode.value }, peerId);
  }
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

async function uploadMedia(blob: Blob, contentType: string): Promise<{ url: string }> {
  const res = await fetch(`${settings.restEndpoint}/api/media/upload`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'X-Client-ID': identity.clientId },
    body: blob,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

async function handleSendImage(file: File) {
  try {
    // Compress main image and generate thumbnail in parallel
    const [mainBlob, thumbBlob] = await Promise.all([
      compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.8 }),
      compressImage(file, { maxWidth: 300, maxHeight: 300, quality: 0.6 }),
    ]);
    const [mainRes, thumbRes] = await Promise.all([
      uploadMedia(mainBlob, 'image/jpeg'),
      uploadMedia(thumbBlob, 'image/jpeg'),
    ]);
    await chat.sendMessage('image', {
      url: `${settings.restEndpoint}${mainRes.url}`,
      thumbnailUrl: `${settings.restEndpoint}${thumbRes.url}`,
      filename: file.name,
      size: mainBlob.size,
      mimeType: 'image/jpeg',
    });
  } catch {
    // Fallback: upload original without compression
    const res = await uploadMedia(file, file.type);
    await chat.sendMessage('image', {
      url: `${settings.restEndpoint}${res.url}`,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    });
  }
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
  // Only leave if we're still in the room this component was managing
  if (chat.currentRoom?.id === props.roomId) {
    chat.leaveRoom();
  }
});
</script>

<template>
  <div class="flex flex-col h-full bg-white ghost:bg-ghost-bg dark:bg-dark-bg relative">
    <!-- Header -->
    <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-200 ghost:border-ghost-muted dark:border-dark-border">
      <button
        class="text-gray-500 hover:text-gray-700 ghost:text-ghost-text/60 ghost:hover:text-ghost-text dark:text-gray-400 dark:hover:text-dark-text"
        @click="handleLeave"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="flex-1 min-w-0">
        <h2 class="text-sm font-semibold text-gray-800 ghost:text-ghost-text dark:text-dark-text truncate">
          {{ chat.currentRoom?.name ?? 'Chat' }}
        </h2>
        <span class="text-xs text-gray-400 ghost:text-ghost-text/40 dark:text-gray-500">
          {{ chat.currentRoom?.mode === 'ephemeral' ? 'Ghost Mode · E2EE' : 'Standard' }}
          · {{ roomMembers.length + 1 }} online
        </span>
      </div>
      <!-- Share invite link -->
      <button
        class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 ghost:text-ghost-text/60 ghost:hover:bg-ghost-muted dark:text-gray-400 dark:hover:bg-dark-muted"
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
        class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 ghost:text-ghost-text/60 ghost:hover:bg-ghost-muted dark:text-gray-400 dark:hover:bg-dark-muted"
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
        class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 ghost:text-ghost-text/60 ghost:hover:bg-ghost-muted dark:text-gray-400 dark:hover:bg-dark-muted"
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

    <!-- Video call area — compact floating overlay -->
    <div v-if="callMode === 'video'" class="absolute top-14 right-3 z-20 flex flex-col gap-1.5">
      <!-- Remote videos -->
      <div
        v-for="[peerId, peer] in peerStreams"
        :key="peerId"
        class="relative w-36 h-28 md:w-44 md:h-32 rounded-lg overflow-hidden shadow-lg bg-gray-900 ring-1 ring-black/20"
      >
        <video
          autoplay
          playsinline
          class="w-full h-full object-cover"
          :srcObject="peer.stream"
        />
        <span class="absolute bottom-0.5 left-1 text-[10px] text-white/70 bg-black/50 px-1 rounded">
          {{ peerId.slice(0, 6) }}
        </span>
      </div>
      <div v-if="peerStreams.length === 0" class="w-36 h-28 md:w-44 md:h-32 rounded-lg bg-gray-900/80 flex items-center justify-center shadow-lg ring-1 ring-black/20">
        <span class="text-[10px] text-white/50">Waiting...</span>
      </div>
      <!-- Local video PiP -->
      <div class="relative w-24 h-18 md:w-28 md:h-20 rounded-lg overflow-hidden shadow-md ring-1 ring-white/20 self-end">
        <video
          ref="localVideoRef"
          autoplay
          playsinline
          muted
          class="w-full h-full object-cover"
          :srcObject="localStream ?? undefined"
        />
      </div>
    </div>

    <!-- Voice call bar — compact -->
    <div v-if="callMode === 'voice'" class="flex items-center justify-center gap-3 py-2 bg-gray-50 ghost:bg-ghost-muted dark:bg-dark-surface border-b border-gray-200 ghost:border-ghost-muted dark:border-dark-border shrink-0">
      <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span class="text-xs text-gray-600 ghost:text-ghost-text/60 dark:text-gray-400">Voice · {{ formatDuration(callDuration) }}</span>
      <span class="text-xs text-gray-400">{{ peerStreams.length + 1 }} in call</span>
    </div>

    <!-- Ghost mode banner -->
    <GhostModeBanner v-if="connection.currentRoomMode === 'ephemeral'" />

    <!-- Messages -->
    <MessageList :messages="chat.messages" />

    <!-- Input -->
    <MessageInput @send="handleSend" @send-image="handleSendImage" @send-audio="handleSendAudio" />
  </div>
</template>

