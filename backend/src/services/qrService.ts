import crypto from 'crypto';
import { prisma } from '../utils/prisma.js';
import { QrSessionType, QrSessionStatus, ActorType } from '@prisma/client';
import { createAuditLog } from '../utils/audit.js';

export interface CreateQrInput {
  name?: string;
  date?: string; // YYYY-MM-DD
  validFrom?: string; // HH:mm
  validUntil?: string; // HH:mm
  officeName?: string;
  description?: string;
  status?: QrSessionStatus;
  type?: QrSessionType;
  expirationSeconds?: number;
  createdById?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class QrService {
  /**
   * Generates a 256-bit cryptographically secure random token in hex.
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hashes a raw token using SHA-256 for secure DB storage.
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Creates a dedicated or one-day attendance QR code.
   */
  static async createAttendanceQr(input: CreateQrInput): Promise<{ qrSession: any; rawToken: string; payload: string }> {
    const {
      name = 'Main Office Attendance',
      date,
      validFrom = '07:00',
      validUntil = '18:00',
      officeName = 'Main Office',
      description,
      status = QrSessionStatus.ACTIVE,
      type = QrSessionType.ANY,
      createdById,
      ipAddress,
      userAgent,
    } = input;

    // 1. Calculate expiration timestamp
    const now = new Date();
    let expiresAt: Date;

    if (date && validUntil) {
      // One-day QR code: expires at date + validUntil in local/server time
      const [endHour, endMin] = validUntil.split(':').map((n) => parseInt(n, 10) || 0);
      const targetDate = new Date(`${date}T${validUntil}:00`);
      if (!isNaN(targetDate.getTime())) {
        expiresAt = targetDate;
      } else {
        expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours fallback
      }
    } else if (input.expirationSeconds) {
      expiresAt = new Date(now.getTime() + input.expirationSeconds * 1000);
    } else {
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    }

    // 2. Generate 256-bit cryptographic token
    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);

    // 3. Database transaction
    const result = await prisma.$transaction(async (tx) => {
      const newSession = await tx.qrSession.create({
        data: {
          tokenHash,
          type,
          expiresAt,
          status,
          createdById: createdById || null,
        },
      });

      await createAuditLog(
        {
          actorId: createdById,
          actorType: ActorType.ADMIN,
          action: 'QR_CREATED',
          entityType: 'QrSession',
          entityId: newSession.id,
          metadata: {
            name,
            date,
            validFrom,
            validUntil,
            officeName,
            expiresAt: expiresAt.toISOString(),
          },
          ipAddress,
          userAgent,
        },
        tx
      );

      return newSession;
    });

    const payload = JSON.stringify({
      version: '1.0',
      token: rawToken,
      type: result.type,
      exp: expiresAt.getTime(),
      name,
      office: officeName,
      date,
    });

    return {
      qrSession: {
        ...result,
        name,
        date,
        validFrom,
        validUntil,
        officeName,
        description,
      },
      rawToken,
      payload,
    };
  }

  /**
   * Generates a rolling kiosk QR session.
   */
  static async generateQrSession({
    type = QrSessionType.ANY,
    expirationSeconds,
    createdById,
    ipAddress,
    userAgent,
  }: {
    type?: QrSessionType;
    expirationSeconds?: number;
    createdById?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ qrSession: any; rawToken: string; payload: string }> {
    let ttlSeconds = expirationSeconds;
    if (!ttlSeconds) {
      const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } });
      ttlSeconds = settings?.qrExpirationSeconds || 60;
    }

    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const result = await prisma.$transaction(async (tx) => {
      await tx.qrSession.updateMany({
        where: { status: QrSessionStatus.ACTIVE },
        data: {
          status: QrSessionStatus.REVOKED,
          revokedAt: now,
        },
      });

      const newSession = await tx.qrSession.create({
        data: {
          tokenHash,
          type,
          expiresAt,
          status: QrSessionStatus.ACTIVE,
          createdById: createdById || null,
        },
      });

      await createAuditLog(
        {
          actorId: createdById,
          actorType: ActorType.ADMIN,
          action: 'QR_GENERATED',
          entityType: 'QrSession',
          entityId: newSession.id,
          metadata: {
            type,
            expiresAt: expiresAt.toISOString(),
            ttlSeconds,
          },
          ipAddress,
          userAgent,
        },
        tx
      );

      return newSession;
    });

    const payload = JSON.stringify({
      version: '1.0',
      token: rawToken,
      type: result.type,
      exp: expiresAt.getTime(),
    });

    return {
      qrSession: result,
      rawToken,
      payload,
    };
  }

  /**
   * Lists QR sessions with filters.
   */
  static async listQrSessions(filters: { status?: QrSessionStatus; date?: string; search?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;

    const sessions = await prisma.qrSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return sessions;
  }

  /**
   * Explicitly revokes an active QR session.
   */
  static async revokeActiveSessions(actorId?: string, ipAddress?: string, userAgent?: string) {
    const now = new Date();
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.qrSession.updateMany({
        where: { status: QrSessionStatus.ACTIVE },
        data: {
          status: QrSessionStatus.REVOKED,
          revokedAt: now,
        },
      });

      if (updated.count > 0) {
        await createAuditLog(
          {
            actorId,
            actorType: ActorType.ADMIN,
            action: 'QR_REVOKED',
            entityType: 'QrSession',
            metadata: { count: updated.count },
            ipAddress,
            userAgent,
          },
          tx
        );
      }

      return updated;
    });
  }

  /**
   * Deactivates a specific QR session by ID.
   */
  static async deactivateSession(id: string, actorId?: string) {
    const session = await prisma.qrSession.update({
      where: { id },
      data: { status: QrSessionStatus.REVOKED, revokedAt: new Date() },
    });

    await createAuditLog({
      actorId,
      actorType: ActorType.ADMIN,
      action: 'QR_DEACTIVATED',
      entityType: 'QrSession',
      entityId: id,
    });

    return session;
  }

  /**
   * Deletes a QR session by ID.
   */
  static async deleteSession(id: string, actorId?: string) {
    const session = await prisma.qrSession.delete({
      where: { id },
    });

    await createAuditLog({
      actorId,
      actorType: ActorType.ADMIN,
      action: 'QR_DELETED',
      entityType: 'QrSession',
      entityId: id,
    });

    return session;
  }

  /**
   * Fetches the current active QR session if not expired.
   */
  static async getCurrentSession() {
    const session = await prisma.qrSession.findFirst({
      where: {
        status: QrSessionStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return session;
  }
}
