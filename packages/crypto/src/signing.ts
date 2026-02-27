/** Canonical serialization: sort keys, stringify, encode to UTF-8 */
export function canonicalize(payload: unknown): Uint8Array {
  const json = JSON.stringify(payload, Object.keys(payload as object).sort());
  return new TextEncoder().encode(json);
}

/** Sign a payload with ECDSA, returns base64 signature */
export async function signPayload(
  privateKey: CryptoKey,
  data: Uint8Array,
): Promise<string> {
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-384' },
    privateKey,
    data.buffer as ArrayBuffer,
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** Verify an ECDSA signature */
export async function verifySignature(
  publicKey: CryptoKey,
  signature: string,
  data: Uint8Array,
): Promise<boolean> {
  const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-384' },
    publicKey,
    sigBytes.buffer as ArrayBuffer,
    data.buffer as ArrayBuffer,
  );
}
