import { useSettingsStore } from '@/stores/settings';
import type { IceServersResponse } from '@cloudia/shared';
import { ref, onUnmounted } from 'vue';

export function useWebRTC() {
  const pc = ref<RTCPeerConnection | null>(null);
  const localStream = ref<MediaStream | null>(null);
  const remoteStream = ref<MediaStream | null>(null);

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

  async function createPeerConnection(): Promise<RTCPeerConnection> {
    const iceServers = await fetchIceServers();
    const connection = new RTCPeerConnection({ iceServers });

    connection.addEventListener('track', (event) => {
      if (!remoteStream.value) {
        remoteStream.value = new MediaStream();
      }
      remoteStream.value.addTrack(event.track);
    });

    pc.value = connection;
    return connection;
  }

  async function createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!pc.value) await createPeerConnection();
    const offer = await pc.value!.createOffer();
    await pc.value!.setLocalDescription(offer);
    return offer;
  }

  async function handleOffer(sdp: string): Promise<RTCSessionDescriptionInit> {
    if (!pc.value) await createPeerConnection();
    await pc.value!.setRemoteDescription({ type: 'offer', sdp });
    const answer = await pc.value!.createAnswer();
    await pc.value!.setLocalDescription(answer);
    return answer;
  }

  async function handleAnswer(sdp: string) {
    await pc.value?.setRemoteDescription({ type: 'answer', sdp });
  }

  async function addIceCandidate(candidate: RTCIceCandidateInit) {
    await pc.value?.addIceCandidate(candidate);
  }

  async function startLocalStream(video = true, audio = true) {
    localStream.value = await navigator.mediaDevices.getUserMedia({ video, audio });
    if (pc.value) {
      for (const track of localStream.value.getTracks()) {
        pc.value.addTrack(track, localStream.value);
      }
    }
  }

  function cleanup() {
    localStream.value?.getTracks().forEach((t) => t.stop());
    remoteStream.value?.getTracks().forEach((t) => t.stop());
    pc.value?.close();
    pc.value = null;
    localStream.value = null;
    remoteStream.value = null;
  }

  onUnmounted(cleanup);

  return {
    pc,
    localStream,
    remoteStream,
    createPeerConnection,
    createOffer,
    handleOffer,
    handleAnswer,
    addIceCandidate,
    startLocalStream,
    cleanup,
  };
}
