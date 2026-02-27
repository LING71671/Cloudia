import { ref, readonly } from 'vue';
import type { ClientID, MessageEnvelope } from '@cloudia/shared';
import {
  generateEphemeralKeyPair,
  deriveSessionKey,
  importECDHPublicKey,
  exportECDHPublicKey,
  encrypt,
  decrypt,
} from '@cloudia/crypto';

/**
 * E2EE composable for Ghost (ephemeral) mode.
 *
 * Flow:
 * 1. On join: generate ECDH ephemeral key pair, broadcast public key via 'key-exchange'
 * 2. On receiving peer's 'key-exchange': derive shared AES-GCM session key
 * 3. Encrypt outgoing ephemeral-text payloads, decrypt incoming ones
 */
export function useE2EE() {
  const ephemeralKeyPair = ref<CryptoKeyPair | null>(null);
  const sessionKeys = ref<Map<ClientID, CryptoKey>>(new Map());
  const peerPublicKeys = ref<Map<ClientID, JsonWebKey>>(new Map());
  const ready = ref(false);

  /** Initialize E2EE for a new room session */
  async function initialize(): Promise<JsonWebKey> {
    ephemeralKeyPair.value = await generateEphemeralKeyPair();
    sessionKeys.value.clear();
    peerPublicKeys.value.clear();
    ready.value = true;
    return exportECDHPublicKey(ephemeralKeyPair.value.publicKey);
  }

  /** Handle incoming key-exchange message from a peer */
  async function handleKeyExchange(peerId: ClientID, peerPubKeyJwk: JsonWebKey): Promise<void> {
    if (!ephemeralKeyPair.value) return;

    peerPublicKeys.value.set(peerId, peerPubKeyJwk);

    const peerPubKey = await importECDHPublicKey(peerPubKeyJwk);
    const sessionKey = await deriveSessionKey(ephemeralKeyPair.value.privateKey, peerPubKey);
    sessionKeys.value.set(peerId, sessionKey);
  }

  /** Encrypt a plaintext message for broadcast (uses first available session key for now) */
  async function encryptMessage(plaintext: string): Promise<{ ciphertext: string; iv: string }> {
    // For group chat: encrypt with a shared group key
    // For simplicity in v1: use the first session key (works for 1-to-1)
    // TODO Phase 5: implement proper group key distribution
    const keys = Array.from(sessionKeys.value.values());
    if (keys.length === 0) {
      // No peers yet — send plaintext as fallback (will be visible only to self)
      return { ciphertext: plaintext, iv: '' };
    }
    return encrypt(keys[0], plaintext);
  }

  /** Decrypt an incoming ephemeral-text message */
  async function decryptMessage(
    senderId: ClientID,
    ciphertext: string,
    iv: string,
  ): Promise<string> {
    if (!iv) return ciphertext; // Unencrypted fallback

    const key = sessionKeys.value.get(senderId);
    if (!key) return '[Unable to decrypt — no session key for sender]';

    try {
      return await decrypt(key, ciphertext, iv);
    } catch {
      return '[Decryption failed]';
    }
  }

  /** Check if we have a session key for a given peer */
  function hasSessionKey(peerId: ClientID): boolean {
    return sessionKeys.value.has(peerId);
  }

  /** Get our ephemeral public key JWK for sending to new peers */
  async function getPublicKeyJwk(): Promise<JsonWebKey | null> {
    if (!ephemeralKeyPair.value) return null;
    return exportECDHPublicKey(ephemeralKeyPair.value.publicKey);
  }

  /** Cleanup on room leave */
  function destroy() {
    ephemeralKeyPair.value = null;
    sessionKeys.value.clear();
    peerPublicKeys.value.clear();
    ready.value = false;
  }

  return {
    ready: readonly(ready),
    sessionKeys: readonly(sessionKeys),
    peerPublicKeys: readonly(peerPublicKeys),
    initialize,
    handleKeyExchange,
    encryptMessage,
    decryptMessage,
    hasSessionKey,
    getPublicKeyJwk,
    destroy,
  };
}
