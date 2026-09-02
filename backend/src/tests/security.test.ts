import { describe, it, expect, vi } from 'vitest';
import { requireAdmin, requireEmployee, requireSelfOrAdmin, AuthenticatedRequest } from '../middlewares/auth.js';
import { UserRole } from '@prisma/client';

describe('Security & RBAC Enforcement Middleware', () => {
  describe('requireAdmin Middleware', () => {
    it('allows access for users with ADMIN role', () => {
      const req = {
        user: {
          userId: 'admin-uuid-1',
          role: UserRole.ADMIN,
        },
      } as AuthenticatedRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      requireAdmin(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects access for users with EMPLOYEE role', () => {
      const req = {
        user: {
          userId: 'emp-user-uuid-1',
          employeeId: 'emp-uuid-1',
          role: UserRole.EMPLOYEE,
        },
      } as AuthenticatedRequest;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      const next = vi.fn();

      requireAdmin(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN_ADMIN_REQUIRED',
          }),
        })
      );
    });
  });

  describe('requireEmployee Middleware', () => {
    it('allows access for active employee with valid employeeId', () => {
      const req = {
        user: {
          userId: 'emp-user-uuid-1',
          employeeId: 'emp-uuid-1',
          role: UserRole.EMPLOYEE,
        },
      } as AuthenticatedRequest;

      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      requireEmployee(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('rejects users with missing employee profile', () => {
      const req = {
        user: {
          userId: 'user-uuid-without-emp',
          employeeId: null,
          role: UserRole.EMPLOYEE,
        },
      } as AuthenticatedRequest;

      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      requireEmployee(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireSelfOrAdmin IDOR Protection Middleware', () => {
    it('allows employee accessing their own employeeId', () => {
      const req = {
        user: {
          userId: 'user-uuid-1',
          employeeId: 'emp-uuid-1',
          role: UserRole.EMPLOYEE,
        },
        params: { employeeId: 'emp-uuid-1' },
        body: {},
        query: {},
      } as unknown as AuthenticatedRequest;

      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      const middleware = requireSelfOrAdmin('employeeId');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects employee attempting to access another employeeId (IDOR attempt)', () => {
      const req = {
        user: {
          userId: 'user-uuid-1',
          employeeId: 'emp-uuid-1',
          role: UserRole.EMPLOYEE,
        },
        params: { employeeId: 'emp-uuid-999-victim' }, // Malicious attempt to read victim's data
        body: {},
        query: {},
      } as unknown as AuthenticatedRequest;

      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      const middleware = requireSelfOrAdmin('employeeId');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN_ACCESS_DENIED',
          }),
        })
      );
    });

    it('always allows ADMIN to access any target employeeId', () => {
      const req = {
        user: {
          userId: 'admin-uuid-1',
          role: UserRole.ADMIN,
        },
        params: { employeeId: 'emp-uuid-999-victim' },
        body: {},
        query: {},
      } as unknown as AuthenticatedRequest;

      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      const middleware = requireSelfOrAdmin('employeeId');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
