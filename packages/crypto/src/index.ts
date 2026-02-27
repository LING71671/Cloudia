export {
  generateIdentity,
  deriveClientId,
  exportKeyPair,
  importKeyPair,
  type IdentityKeyPair,
} from './identity';

export {
  canonicalize,
  signPayload,
  verifySignature,
} from './signing';

export {
  generateEphemeralKeyPair,
  deriveSessionKey,
  importECDHPublicKey,
  exportECDHPublicKey,
} from './key-exchange';

export {
  encrypt,
  decrypt,
} from './encryption';
