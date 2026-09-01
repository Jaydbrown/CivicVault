import { constants, publicEncrypt } from 'crypto';

import { circle } from './circleApi';

/**
 * Circle developer-controlled wallet requests need a fresh entity-secret
 * *ciphertext* per call: RSA-OAEP(SHA-256) encrypt the 32-byte entity secret
 * with Circle's entity public key, base64-encode. Done here with node's built-in
 * crypto so the custodial tier carries no SDK dependency (and no node-version
 * constraint from one).
 *
 * https://developers.circle.com/w3s/entity-secret-management
 */

let _publicKeyPem: string | null = null;

async function entityPublicKey(): Promise<string> {
  if (_publicKeyPem) return _publicKeyPem;
  const { publicKey } = await circle<{ publicKey: string }>('/config/entity/publicKey');
  if (!publicKey) throw new Error('Circle did not return an entity public key');
  _publicKeyPem = publicKey;
  return publicKey;
}

export async function entitySecretCiphertext(): Promise<string> {
  const secretHex = process.env.CIRCLE_ENTITY_SECRET?.trim();
  if (!secretHex || !/^[0-9a-fA-F]{64}$/.test(secretHex)) {
    throw new Error('CIRCLE_ENTITY_SECRET must be a 64-character hex string');
  }
  const key = await entityPublicKey();
  const encrypted = publicEncrypt(
    { key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(secretHex, 'hex'),
  );
  return encrypted.toString('base64');
}
