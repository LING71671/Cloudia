import { describe, it, expect } from 'vitest';
import { generateIdentity } from '../identity';
import { signPayload, verifySignature, canonicalize } from '../signing';

describe('signing', () => {
  it('signs and verifies a payload', async () => {
    const kp = await generateIdentity();
    const payload = { content: 'hello world', type: 'text' };
    const data = canonicalize(payload);

    const signature = await signPayload(kp.privateKey, data);
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);

    const valid = await verifySignature(kp.publicKey, signature, data);
    expect(valid).toBe(true);
  });

  it('rejects tampered payload', async () => {
    const kp = await generateIdentity();
    const payload = { content: 'hello world', type: 'text' };
    const data = canonicalize(payload);

    const signature = await signPayload(kp.privateKey, data);

    const tampered = canonicalize({ content: 'tampered', type: 'text' });
    const valid = await verifySignature(kp.publicKey, signature, tampered);
    expect(valid).toBe(false);
  });

  it('rejects signature from wrong key', async () => {
    const kp1 = await generateIdentity();
    const kp2 = await generateIdentity();
    const data = canonicalize({ msg: 'test' });

    const signature = await signPayload(kp1.privateKey, data);
    const valid = await verifySignature(kp2.publicKey, signature, data);
    expect(valid).toBe(false);
  });

  it('canonicalize sorts keys deterministically', () => {
    const a = canonicalize({ z: 1, a: 2 });
    const b = canonicalize({ a: 2, z: 1 });
    expect(a).toEqual(b);
  });
});
