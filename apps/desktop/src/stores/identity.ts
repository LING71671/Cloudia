import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ClientID } from '@cloudia/shared';
import {
  generateIdentity,
  deriveClientId,
  exportKeyPair,
  importKeyPair,
  type IdentityKeyPair,
} from '@cloudia/crypto';

const STORAGE_KEY = 'cloudia_identity';

export const useIdentityStore = defineStore('identity', () => {
  const keyPair = ref<IdentityKeyPair | null>(null);
  const clientId = ref<ClientID>('');
  const displayName = ref('');
  const ready = ref(false);

  const shortId = computed(() =>
    clientId.value ? clientId.value.slice(0, 8) + '...' + clientId.value.slice(-4) : '',
  );

  async function initialize() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const jwk = JSON.parse(stored);
        keyPair.value = await importKeyPair(jwk);
        clientId.value = await deriveClientId(keyPair.value.publicKey);
        displayName.value = localStorage.getItem('cloudia_display_name') ?? '';
        ready.value = true;
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // First launch — generate new identity
    keyPair.value = await generateIdentity();
    clientId.value = await deriveClientId(keyPair.value.publicKey);
    const exported = await exportKeyPair(keyPair.value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exported));
    ready.value = true;
  }

  function setDisplayName(name: string) {
    displayName.value = name;
    localStorage.setItem('cloudia_display_name', name);
  }

  async function getPublicKeyJwk(): Promise<JsonWebKey | null> {
    if (!keyPair.value) return null;
    return crypto.subtle.exportKey('jwk', keyPair.value.publicKey);
  }

  return {
    keyPair,
    clientId,
    displayName,
    shortId,
    ready,
    initialize,
    setDisplayName,
    getPublicKeyJwk,
  };
});
