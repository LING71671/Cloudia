import { describe, it, expect } from 'vitest';
import {
  generateEphemeralKeyPair,
  deriveSessionKey,
  exportECDHPublicKey,
  importECDHPublicKey,
} from '../key-exchange';
import { encrypt, decrypt } from '../encryption';

describe('key-exchange + encryption', () => {
  it('two parties derive the same session key and can encrypt/decrypt', async () => {
    // Alice generates ephemeral key pair
    const aliceKP = await generateEphemeralKeyPair();
    // Bob generates ephemeral key pair
    const bobKP = await generateEphemeralKeyPair();

    // Exchange public keys (simulate over wire via JWK)
    const alicePubJwk = await exportECDHPublicKey(aliceKP.publicKey);
    const bobPubJwk = await exportECDHPublicKey(bobKP.publicKey);

    const aliceImportedBobPub = await importECDHPublicKey(bobPubJwk);
    const bobImportedAlicePub = await importECDHPublicKey(alicePubJwk);

    // Derive session keys
    const aliceSessionKey = await deriveSessionKey(aliceKP.privateKey, aliceImportedBobPub);
    const bobSessionKey = await deriveSessionKey(bobKP.privateKey, bobImportedAlicePub);

    // Alice encrypts, Bob decrypts
    const plaintext = 'Hello from Alice!';
    const { ciphertext, iv } = await encrypt(aliceSessionKey, plaintext);

    expect(ciphertext).not.toBe(plaintext);

    const decrypted = await decrypt(bobSessionKey, ciphertext, iv);
    expect(decrypted).toBe(plaintext);
  });

  it('decryption fails with wrong key', async () => {
    const aliceKP = await generateEphemeralKeyPair();
    const bobKP = await generateEphemeralKeyPair();
    const eveKP = await generateEphemeralKeyPair();

    const bobPubJwk = await exportECDHPublicKey(bobKP.publicKey);
    const aliceImportedBobPub = await importECDHPublicKey(bobPubJwk);
    const aliceSessionKey = await deriveSessionKey(aliceKP.privateKey, aliceImportedBobPub);

    // Eve tries to derive key with Alice's public key
    const alicePubJwk = await exportECDHPublicKey(aliceKP.publicKey);
    const eveImportedAlicePub = await importECDHPublicKey(alicePubJwk);
    const eveSessionKey = await deriveSessionKey(eveKP.privateKey, eveImportedAlicePub);

    const { ciphertext, iv } = await encrypt(aliceSessionKey, 'secret message');

    await expect(decrypt(eveSessionKey, ciphertext, iv)).rejects.toThrow();
  });

  it('encrypt produces different ciphertext each time (random IV)', async () => {
    const aliceKP = await generateEphemeralKeyPair();
    const bobKP = await generateEphemeralKeyPair();

    const bobPubJwk = await exportECDHPublicKey(bobKP.publicKey);
    const aliceImportedBobPub = await importECDHPublicKey(bobPubJwk);
    const sessionKey = await deriveSessionKey(aliceKP.privateKey, aliceImportedBobPub);

    const r1 = await encrypt(sessionKey, 'same message');
    const r2 = await encrypt(sessionKey, 'same message');

    expect(r1.ciphertext).not.toBe(r2.ciphertext);
    expect(r1.iv).not.toBe(r2.iv);
  });
});
