import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { QrService } from '../services/qrService.js';

describe('QR Token Cryptography & Lifecycle', () => {
  it('generates a 64-char SHA256 hexadecimal hash from a raw token', () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hash1 = QrService.hashToken(rawToken);
    const hash2 = QrService.hashToken(rawToken);

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(rawToken);
  });

  it('produces completely distinct hashes for different tokens', () => {
    const tokenA = 'token-alpha-12345';
    const tokenB = 'token-beta-67890';

    expect(QrService.hashToken(tokenA)).not.toBe(QrService.hashToken(tokenB));
  });

  it('generates a 256-bit cryptographically secure raw token', () => {
    const token = QrService.generateToken();
    expect(token).toHaveLength(64); // 32 bytes hex encoded = 64 characters
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
  });
});
