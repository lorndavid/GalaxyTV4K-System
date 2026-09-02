import { describe, it, expect } from 'vitest';
import { TelegramService } from '../services/telegramService';
import { encryptText, decryptText, maskToken } from '../utils/encryption';

describe('TelegramService & Security Tests', () => {
  it('encrypts, decrypts, and masks bot tokens correctly', () => {
    const rawToken = '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz12345';
    const encrypted = encryptText(rawToken);
    expect(encrypted).not.toBe(rawToken);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = decryptText(encrypted);
    expect(decrypted).toBe(rawToken);

    const masked = maskToken(rawToken);
    expect(masked).toBe('••••••••••••2345');
    expect(masked).not.toContain('ABCdef');
  });

  it('handles invalid token test connection safely without crashing', async () => {
    const testResult = await TelegramService.testConnection('invalid_token_12345');
    expect(testResult.success).toBe(false);
    expect(testResult.message).toBeDefined();
  });
});
