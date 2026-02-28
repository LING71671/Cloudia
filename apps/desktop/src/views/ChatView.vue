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
  <div class="flex flex-col h-full bg-gray-50/50 ghost:bg-ghost-bg dark:bg-dark-bg transition-colors duration-500 relative">
    
    <!-- Premium Header -->
    <div class="flex items-center gap-4 px-5 py-4 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-b border-gray-100/80 ghost:border-ghost-muted dark:border-white/5 z-10 shadow-sm shrink-0 transition-colors">
      <button
        class="p-2 -ml-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 ghost:text-ghost-text/60 ghost:hover:text-ghost-text ghost:hover:bg-ghost-muted/50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
        @click="handleLeave"
        title="Back to Lobby"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <div class="flex-1 min-w-0">
        <h2 class="text-[17px] font-semibold tracking-tight text-gray-900 ghost:text-ghost-text dark:text-gray-50 truncate transition-colors">
          {{ chat.currentRoom?.name ?? 'Chat' }}
        </h2>
        <div class="flex items-center text-xs text-gray-400 ghost:text-ghost-text/40 dark:text-gray-500 mt-0.5 space-x-2">
          <span class="inline-flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500/80"></span>
            {{ roomMembers.length + 1 }} online
          </span>
          <span class="text-gray-300 dark:text-gray-700">&middot;</span>
          <span>{{ chat.currentRoom?.mode === 'ephemeral' ? 'Ghost Mode E2EE' : 'Standard' }}</span>
        </div>
      </div>
      
      <!-- Actions Container -->
      <div class="flex items-center gap-1.5">
        <!-- Share invite link -->
        <button
          class="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 ghost:text-ghost-text/60 ghost:hover:bg-ghost-muted dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-white/10 transition-all active:scale-95"
          :title="linkCopied ? 'Copied!' : 'Copy invite link'"
          @click="shareInviteLink"
        >
          <svg v-if="!linkCopied" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <svg v-else class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        
        <div class="w-px h-5 bg-gray-200 dark:bg-white/10 mx-1"></div>
        
        <!-- Voice call button -->
        <button
          v-if="callMode === 'none'"
          class="p-2 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 ghost:text-ghost-text/60 ghost:hover:bg-ghost-muted dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-all active:scale-95"
          title="Start voice call"
          @click="startVoiceCall"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
        
        <!-- Video call button -->
        <button
          v-if="callMode === 'none'"
          class="p-2 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 ghost:text-ghost-text/60 ghost:hover:bg-ghost-muted dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-all active:scale-95"
          title="Start video call"
          @click="startVideoCall"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        
        <!-- End call button -->
        <button
          v-if="callMode !== 'none'"
          class="p-2.5 rounded-full bg-red-500/90 text-white hover:bg-red-600 shadow-sm transition-all active:scale-95 ml-1"
          title="End call"
          @click="endCall"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Video call area — elegant floating overlay -->
    <div v-if="callMode === 'video'" class="absolute top-20 right-4 z-20 flex flex-col gap-3">
      <!-- Remote videos -->
      <div
        v-for="[peerId, peer] in peerStreams"
        :key="peerId"
        class="relative w-40 h-28 md:w-48 md:h-32 rounded-2xl overflow-hidden shadow-xl bg-gray-900/90 ring-1 ring-white/10 dark:ring-white/5 backdrop-blur-md transition-all group"
      >
        <video
          autoplay
          playsinline
          class="w-full h-full object-cover"
          :srcObject="peer.stream"
        />
        <div class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <span class="text-[11px] font-medium text-white/90 drop-shadow-sm">
            {{ peerId.slice(0, 6) }}
          </span>
        </div>
      </div>
      
      <div v-if="peerStreams.length === 0" class="w-40 h-28 md:w-48 md:h-32 rounded-2xl bg-gray-900/80 backdrop-blur-xl flex flex-col items-center justify-center shadow-xl ring-1 ring-white/10">
        <div class="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mb-2" />
        <span class="text-xs text-white/60">Waiting for others...</span>
      </div>
      
      <!-- Local video PiP -->
      <div class="relative w-28 h-20 md:w-32 md:h-24 rounded-2xl overflow-hidden shadow-lg ring-1 ring-white/20 dark:ring-white/10 self-end">
        <video
          ref="localVideoRef"
          autoplay
          playsinline
          muted
          class="w-full h-full object-cover"
          :srcObject="localStream ?? undefined"
        />
        <div class="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_4px_rgba(34,197,94,0.8)]"></div>
      </div>
    </div>

    <!-- Voice call bar — modern and clean -->
    <div v-if="callMode === 'voice'" class="flex items-center justify-center gap-4 py-2.5 bg-indigo-50/50 dark:bg-indigo-500/5 backdrop-blur-sm border-b border-indigo-100/50 ghost:border-ghost-muted dark:border-white/5 shrink-0 transition-colors">
      <div class="flex items-center gap-2">
         <div class="relative flex h-2.5 w-2.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
        </div>
        <span class="text-xs font-medium text-indigo-900/70 ghost:text-ghost-text/80 dark:text-indigo-100/70">Voice active</span>
      </div>
      <span class="text-xs text-indigo-700 font-medium tracking-wide dark:text-indigo-400">{{ formatDuration(callDuration) }}</span>
      <span class="text-xs text-gray-400 dark:text-gray-500">&middot; {{ peerStreams.length + 1 }} in call</span>
    </div>

    <!-- Ghost mode banner -->
    <GhostModeBanner v-if="connection.currentRoomMode === 'ephemeral'" />

    <!-- Messages -->
    <MessageList :messages="chat.messages" class="flex-1" />

    <!-- Input -->
    <MessageInput class="bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl border-t border-gray-100/50 dark:border-white/5 pb-safe" @send="handleSend" @send-image="handleSendImage" @send-audio="handleSendAudio" />
  </div>
</template>
