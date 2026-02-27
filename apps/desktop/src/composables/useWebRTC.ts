import { useSettingsStore } from '@/stores/settings';
import type { IceServersResponse } from '@cloudia/shared';
import { ref, onUnmounted, computed } from 'vue';

export interface PeerState {
  pc: RTCPeerConnection;
  stream: MediaStream;
}

export function useWebRTC() {
  const peers = ref<Map<string, PeerState>>(new Map());
  const localStream = ref<MediaStream | null>(null);
  const callMode = ref<'none' | 'video' | 'voice'>('none');

  const peerStreams = computed(() => Array.from(peers.value.entries()));

  async function fetchIceServers(): Promise<RTCIceServer[]> {
    const settings = useSettingsStore();
    try {
      const res = await fetch(`${settings.restEndpoint}/api/ice-servers`);
      const data: IceServersResponse = await res.json();
      return data.iceServers;
    } catch {
      return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
  }

  async function createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    const iceServers = await fetchIceServers();
    const pc = new RTCPeerConnection({ iceServers });

    const stream = new MediaStream();
    pc.addEventListener('track', (event) => {
      stream.addTrack(event.track);
      // Trigger reactivity
      peers.value = new Map(peers.value);
    });

    // Add local tracks to this connection
    if (localStream.value) {
      for (const track of localStream.value.getTracks()) {
        pc.addTrack(track, localStream.value);
      }
    }

    peers.value.set(peerId, { pc, stream });
    peers.value = new Map(peers.value);
    return pc;
  }

  async function createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    let peer = peers.value.get(peerId);
    if (!peer) {
      await createPeerConnection(peerId);
      peer = peers.value.get(peerId)!;
    }
    const offer = await peer.pc.createOffer();
    await peer.pc.setLocalDescription(offer);
    return offer;
  }

  async function handleOffer(peerId: string, sdp: string): Promise<RTCSessionDescriptionInit> {
    let peer = peers.value.get(peerId);
    if (!peer) {
      await createPeerConnection(peerId);
      peer = peers.value.get(peerId)!;
    }
    await peer.pc.setRemoteDescription({ type: 'offer', sdp });
    const answer = await peer.pc.createAnswer();
    await peer.pc.setLocalDescription(answer);
    return answer;
  }

  async function handleAnswer(peerId: string, sdp: string) {
    const peer = peers.value.get(peerId);
    if (peer) {
      await peer.pc.setRemoteDescription({ type: 'answer', sdp });
    }
  }

  async function addIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const peer = peers.value.get(peerId);
    if (peer) {
      await peer.pc.addIceCandidate(candidate);
    }
  }

  function getPeerConnection(peerId: string): RTCPeerConnection | null {
    return peers.value.get(peerId)?.pc ?? null;
  }

  async function startLocalStream(video: boolean, audio: boolean) {
    localStream.value = await navigator.mediaDevices.getUserMedia({ video, audio });
    // Add tracks to all existing peer connections
    for (const [, peer] of peers.value) {
      for (const track of localStream.value.getTracks()) {
        peer.pc.addTrack(track, localStream.value);
      }
    }
  }

  function removePeer(peerId: string) {
    const peer = peers.value.get(peerId);
    if (peer) {
      peer.stream.getTracks().forEach((t) => t.stop());
      peer.pc.close();
      peers.value.delete(peerId);
      peers.value = new Map(peers.value);
    }
  }

  function cleanup() {
    for (const [, peer] of peers.value) {
      peer.stream.getTracks().forEach((t) => t.stop());
      peer.pc.close();
    }
    peers.value = new Map();
    localStream.value?.getTracks().forEach((t) => t.stop());
    localStream.value = null;
    callMode.value = 'none';
  }

  onUnmounted(cleanup);

  return {
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
    cleanup,
  };
}
