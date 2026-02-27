import { describe, it, expect } from 'vitest';
import {
  generateIdentity,
  deriveClientId,
  exportKeyPair,
  importKeyPair,
} from '../identity';
import { CLIENT_ID_LENGTH } from '@cloudia/shared';

describe('identity', () => {
  it('generates a valid ECDSA key pair', async () => {
    const kp = await generateIdentity();
    expect(kp.publicKey).toBeDefined();
    expect(kp.privateKey).toBeDefined();
    expect(kp.publicKey.algorithm).toMatchObject({ name: 'ECDSA' });
  });

  it('derives a deterministic ClientID from public key', async () => {
    const kp = await generateIdentity();
    const id1 = await deriveClientId(kp.publicKey);
    const id2 = await deriveClientId(kp.publicKey);
    expect(id1).toBe(id2);
    expect(id1).toHaveLength(CLIENT_ID_LENGTH);
    expect(id1).toMatch(/^[0-9a-f]+$/);
  });

  it('exports and re-imports key pair with same ClientID', async () => {
    const kp = await generateIdentity();
    const originalId = await deriveClientId(kp.publicKey);

    const exported = await exportKeyPair(kp);
    const imported = await importKeyPair(exported);
    const reimportedId = await deriveClientId(imported.publicKey);

    expect(reimportedId).toBe(originalId);
  });

  it('generates unique ClientIDs for different keys', async () => {
    const kp1 = await generateIdentity();
    const kp2 = await generateIdentity();
    const id1 = await deriveClientId(kp1.publicKey);
    const id2 = await deriveClientId(kp2.publicKey);
    expect(id1).not.toBe(id2);
  });
});
