import { describe, it, expect } from 'vitest';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { UserRole } from '@prisma/client';

describe('Authentication & JWT Security', () => {
  it('signs and verifies a valid JWT payload', () => {
    const payload = {
      userId: 'user-uuid-12345',
      email: 'sokha.chan@company.com',
      role: UserRole.EMPLOYEE,
      employeeId: 'emp-uuid-67890',
    };

    const token = generateToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // Header.Payload.Signature

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.employeeId).toBe(payload.employeeId);
  });

  it('fails verification on tampered tokens', () => {
    const payload = {
      userId: 'user-1',
      email: 'admin@company.com',
      role: UserRole.ADMIN,
      employeeId: null,
    };

    const token = generateToken(payload);
    const tampered = token.slice(0, -5) + 'xxxxx';

    expect(() => verifyToken(tampered)).toThrow();
  });
});
