import { ref } from 'vue';

export function useAudioRecorder() {
  const isRecording = ref(false);
  const duration = ref(0);
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let startTime = 0;
  let durationTimer: ReturnType<typeof setInterval> | null = null;

  async function startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    chunks = [];
    startTime = Date.now();
    duration.value = 0;

    mediaRecorder.addEventListener('dataavailable', (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    });

    mediaRecorder.start();
    isRecording.value = true;
    durationTimer = setInterval(() => {
      duration.value = Math.floor((Date.now() - startTime) / 1000);
    }, 200);
  }

  function stopRecording(): Promise<{ blob: Blob; duration: number }> {
    return new Promise((resolve) => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve({ blob: new Blob(), duration: 0 });
        return;
      }

      mediaRecorder.addEventListener('stop', () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        const finalDuration = Math.floor((Date.now() - startTime) / 1000);
        cleanup();
        resolve({ blob, duration: finalDuration });
      }, { once: true });

      mediaRecorder.stop();
    });
  }

  function cancelRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    cleanup();
  }

  function cleanup() {
    if (mediaRecorder) {
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      mediaRecorder = null;
    }
    chunks = [];
    isRecording.value = false;
    duration.value = 0;
    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }
  }

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
