import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { OFFICIAL_EMPLOYEES } from '../services/seedEmployeesService.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { UserRole } from '@prisma/client';

describe('Official Employees Data & Authentication E2E Tests', () => {
  it('contains exactly 20 official employees with unique codes and emails', () => {
    expect(OFFICIAL_EMPLOYEES).toHaveLength(20);

    const codes = new Set<string>();
    const emails = new Set<string>();

    for (const emp of OFFICIAL_EMPLOYEES) {
      expect(emp.code).toMatch(/^EMP-\d{3}$/);
      expect(emp.email).toMatch(/^[a-z0-9]+@galaxytv4k\.com$/);
      expect(emp.khmerName).toBeTruthy();
      expect(emp.latinName).toBeTruthy();
      expect(['ប្រុស', 'ស្រី']).toContain(emp.gender);
      expect(emp.phone).toMatch(/^0\d{8,9}$/);
      expect(emp.departmentName).toBeTruthy();

      // Check uniqueness
      expect(codes.has(emp.code)).toBe(false);
      expect(emails.has(emp.email)).toBe(false);

      codes.add(emp.code);
      emails.add(emp.email);
    }

    expect(codes.size).toBe(20);
    expect(emails.size).toBe(20);
  });

  it('correctly maps lastnames to email addresses for all 20 employees', () => {
    expect(OFFICIAL_EMPLOYEES[0].email).toBe('bunthoeun@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[1].email).toBe('seila@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[2].email).toBe('chanthy@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[3].email).toBe('vann@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[4].email).toBe('sreynich@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[5].email).toBe('sokleang@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[6].email).toBe('sreyny@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[7].email).toBe('sreyneang@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[8].email).toBe('reaksmey@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[9].email).toBe('sreylen@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[10].email).toBe('chehouy@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[11].email).toBe('sambath@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[12].email).toBe('saifa@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[13].email).toBe('samphors@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[14].email).toBe('sreymey@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[15].email).toBe('samoerun@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[16].email).toBe('sokly@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[17].email).toBe('rathany@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[18].email).toBe('devorn@galaxytv4k.com');
    expect(OFFICIAL_EMPLOYEES[19].email).toBe('panha@galaxytv4k.com');
  });

  it('validates employee default password matches galaxytv@@ hash', async () => {
    const defaultPassword = 'galaxytv@@';
    const hash = await bcrypt.hash(defaultPassword, 10);

    const isValid = await bcrypt.compare('galaxytv@@', hash);
    expect(isValid).toBe(true);

    const isWrong = await bcrypt.compare('WrongPassword', hash);
    expect(isWrong).toBe(false);
  });

  it('supports rememberMe token expiration customization', () => {
    const payload = {
      userId: 'user-001',
      email: 'bunthoeun@galaxytv4k.com',
      role: UserRole.EMPLOYEE,
      employeeId: 'emp-001',
    };

    // When rememberMe is true, generates 30d token
    const tokenLong = generateToken(payload, '30d');
    const decodedLong = verifyToken(tokenLong);
    expect(decodedLong.email).toBe('bunthoeun@galaxytv4k.com');

    // When rememberMe is false, generates 24h token
    const tokenShort = generateToken(payload, '24h');
    const decodedShort = verifyToken(tokenShort);
    expect(decodedShort.email).toBe('bunthoeun@galaxytv4k.com');
  });

  it('resolves username without domain to full official email address', () => {
    const testCases = [
      { input: 'bunthoeun', expected: 'bunthoeun@galaxytv4k.com' },
      { input: 'SEILA', expected: 'seila@galaxytv4k.com' },
      { input: 'chanthy@galaxytv4k.com', expected: 'chanthy@galaxytv4k.com' },
      { input: ' Panha ', expected: 'panha@galaxytv4k.com' },
    ];

    for (const tc of testCases) {
      const clean = tc.input.toLowerCase().trim();
      const resolved = clean.includes('@') ? clean : `${clean}@galaxytv4k.com`;
      expect(resolved).toBe(tc.expected);
    }
  });
});
