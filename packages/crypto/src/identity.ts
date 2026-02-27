import type { ClientID } from '@cloudia/shared';
import { CLIENT_ID_LENGTH } from '@cloudia/shared';

export interface IdentityKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/** Generate a new ECDSA P-384 identity key pair */
export async function generateIdentity(): Promise<IdentityKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-384' },
    true,
    ['sign', 'verify'],
  );
  return keyPair as IdentityKeyPair;
}

/** Derive a ClientID from a public key (SHA-256 hash, first N hex chars) */
export async function deriveClientId(publicKey: CryptoKey): Promise<ClientID> {
  const exported = await crypto.subtle.exportKey('raw', publicKey);
  const hash = await crypto.subtle.digest('SHA-256', exported);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, CLIENT_ID_LENGTH);
}

/** Export key pair to JWK format for persistence */
export async function exportKeyPair(
  kp: IdentityKeyPair,
): Promise<{ publicKey: JsonWebKey; privateKey: JsonWebKey }> {
  return {
    publicKey: await crypto.subtle.exportKey('jwk', kp.publicKey),
    privateKey: await crypto.subtle.exportKey('jwk', kp.privateKey),
  };
}

/** Import key pair from JWK format */
export async function importKeyPair(jwk: {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}): Promise<IdentityKeyPair> {
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk.publicKey,
    { name: 'ECDSA', namedCurve: 'P-384' },
    true,
    ['verify'],
  );
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk.privateKey,
    { name: 'ECDSA', namedCurve: 'P-384' },
    true,
    ['sign'],
  );
  return { publicKey, privateKey };
}
