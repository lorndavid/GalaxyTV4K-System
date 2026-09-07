import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../utils/prisma.js';
import { generateToken } from '../utils/jwt.js';
import { UserRole } from '@prisma/client';

describe('Avatar Upload & 2x Daily Rate Limit', () => {
  let testEmployee: any;
  let testUser: any;
  let testToken: string;
  let isDbAvailable = false;

  // 1x1 transparent PNG as base64
  const sampleBase64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  beforeAll(async () => {
    try {
      await prisma.$connect();
      testEmployee = await prisma.employee.findFirst({
        where: { employeeCode: 'EMP-TEST-AVATAR' },
      });
      isDbAvailable = true;
    } catch {
      console.warn('PostgreSQL database not running locally. Skipping DB-dependent tests.');
      return;
    }

    if (!testEmployee) {
      testEmployee = await prisma.employee.create({
        data: {
          employeeCode: 'EMP-TEST-AVATAR',
          displayName: 'Test Avatar Employee',
          email: 'test.avatar@galaxytv4k.com',
          avatarUploadCountToday: 0,
          lastAvatarUploadDate: null,
        },
      });
    } else {
      testEmployee = await prisma.employee.update({
        where: { id: testEmployee.id },
        data: {
          avatarUploadCountToday: 0,
          lastAvatarUploadDate: null,
          profilePhoto: null,
        },
      });
    }

    testUser = await prisma.user.findFirst({
      where: { email: testEmployee.email },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: testEmployee.email,
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
          role: UserRole.EMPLOYEE,
          employeeId: testEmployee.id,
        },
      });
    }

    testToken = generateToken({
      userId: testUser.id,
      email: testUser.email,
      role: UserRole.EMPLOYEE,
      employeeId: testEmployee.id,
    });
  });

  afterAll(async () => {
    try {
      if (testUser) {
        await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
      }
      if (testEmployee) {
        await prisma.employee.delete({ where: { id: testEmployee.id } }).catch(() => {});
      }
    } catch {}
  });

  it('checks initial avatar quota (0/2 used, 2 remaining)', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .get('/api/profile/avatar-quota')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.uploadsToday).toBe(0);
    expect(res.body.data.maxDailyUploads).toBe(2);
    expect(res.body.data.remainingUploadsToday).toBe(2);
  });

  it('successfully uploads 1st avatar and increments count to 1', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ image: sampleBase64Png });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.uploadsToday).toBe(1);
    expect(res.body.data.remainingUploadsToday).toBe(1);
    expect(res.body.data.profilePhoto).toContain('/api/avatar/');
  });

  it('successfully uploads 2nd avatar and increments count to 2', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ image: sampleBase64Png });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.uploadsToday).toBe(2);
    expect(res.body.data.remainingUploadsToday).toBe(0);
  });

  it('rejects 3rd upload attempt on the same day with 429 TOO_MANY_REQUESTS', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ image: sampleBase64Png });

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AVATAR_LIMIT_REACHED');
  });

  it('rejects invalid image payload with 400', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ image: 'not-a-valid-base64' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects unauthenticated avatar upload attempt with 401', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .post('/api/profile/avatar')
      .send({ image: sampleBase64Png });

    expect(res.status).toBe(401);
  });

  it('resets daily count when date changes and allows upload again', async () => {
    if (!isDbAvailable) return;
    // Manually simulate yesterday date
    await prisma.employee.update({
      where: { id: testEmployee.id },
      data: {
        lastAvatarUploadDate: '2026-01-01',
        avatarUploadCountToday: 2,
      },
    });

    const res = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ image: sampleBase64Png });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.uploadsToday).toBe(1);
    expect(res.body.data.remainingUploadsToday).toBe(1);
  });

  it('serves the uploaded avatar file with caching headers', async () => {
    if (!isDbAvailable) return;
    const uploadRes = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ image: sampleBase64Png });

    const photoUrl = uploadRes.body.data.profilePhoto;
    const filename = photoUrl.replace('/api/avatar/', '');

    const serveRes = await request(app).get(`/api/avatar/${filename}`);
    expect(serveRes.status).toBe(200);
    expect(serveRes.headers['content-type']).toContain('image');
    expect(serveRes.headers['cache-control']).toContain('public');
  });
});
