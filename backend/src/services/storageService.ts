import * as Minio from 'minio';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export class StorageService {
  private static client: Minio.Client | null = null;
  private static bucket = process.env.MINIO_BUCKET || 'system-hr-avatars';
  private static localUploadDir = path.resolve(process.cwd(), 'uploads', 'avatars');
  private static isInitialized = false;

  private static getClient(): Minio.Client {
    if (!this.client) {
      const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const port = parseInt(process.env.MINIO_PORT || '9000', 10);
      const useSSL = process.env.MINIO_USE_SSL === 'true';
      const accessKey = process.env.MINIO_ROOT_USER || 'minioadmin';
      const secretKey = process.env.MINIO_ROOT_PASSWORD || 'ChangeThisMinioStrongPass2026';

      this.client = new Minio.Client({
        endPoint: endpoint,
        port,
        useSSL,
        accessKey,
        secretKey,
      });
    }
    return this.client;
  }

  /**
   * Ensure bucket and local fallback directories exist
   */
  static async init(): Promise<void> {
    if (this.isInitialized) return;

    // Ensure local backup directory exists
    try {
      if (!fs.existsSync(this.localUploadDir)) {
        fs.mkdirSync(this.localUploadDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[StorageService] Local upload directory init warning:', err);
    }

    // Try to ensure MinIO bucket exists
    try {
      const client = this.getClient();
      const exists = await client.bucketExists(this.bucket);
      if (!exists) {
        await client.makeBucket(this.bucket, 'us-east-1');
        console.log(`[StorageService] Created MinIO bucket: ${this.bucket}`);
      }
      this.isInitialized = true;
    } catch (err: any) {
      console.warn(`[StorageService] MinIO connection notice: ${err?.message || err}. Local fallback storage active.`);
    }
  }

  /**
   * Detect mime type from file extension or buffer
   */
  static getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.gif':
        return 'image/gif';
      case '.jpg':
      case '.jpeg':
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Upload an avatar buffer to MinIO (with local disk sync for resilience)
   */
  static async uploadAvatar(
    buffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<{ key: string; url: string }> {
    await this.init();

    // 1. Always save to local fallback cache
    try {
      const localFilePath = path.join(this.localUploadDir, filename);
      fs.writeFileSync(localFilePath, buffer);
    } catch (localErr) {
      console.warn('[StorageService] Local file write warning:', localErr);
    }

    // 2. Upload to MinIO object storage
    try {
      const client = this.getClient();
      await client.putObject(this.bucket, filename, buffer, buffer.length, {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400',
      });
      console.log(`[StorageService] Uploaded avatar to MinIO: ${filename}`);
    } catch (minioErr: any) {
      console.warn('[StorageService] MinIO upload error, served from local fallback:', minioErr?.message || minioErr);
    }

    return {
      key: filename,
      url: `/api/avatar/${filename}`,
    };
  }

  /**
   * Retrieve an avatar stream either from MinIO or from local disk fallback
   */
  static async getAvatarStream(
    filename: string
  ): Promise<{ stream: Readable; mimeType: string; size?: number } | null> {
    await this.init();

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const mimeType = this.getMimeType(safeFilename);

    // Try MinIO first
    try {
      const client = this.getClient();
      const stream = await client.getObject(this.bucket, safeFilename);
      return { stream, mimeType };
    } catch (minioErr) {
      // Fallback to local storage if MinIO is not available or file not found in bucket
      const localPath = path.join(this.localUploadDir, safeFilename);
      if (fs.existsSync(localPath)) {
        const stats = fs.statSync(localPath);
        const stream = fs.createReadStream(localPath);
        return { stream, mimeType, size: stats.size };
      }
    }

    return null;
  }

  /**
   * Delete avatar from MinIO and local fallback
   */
  static async deleteAvatar(filename: string): Promise<void> {
    const safeFilename = path.basename(filename);
    try {
      const client = this.getClient();
      await client.removeObject(this.bucket, safeFilename);
    } catch (err) {
      // ignore
    }

    try {
      const localPath = path.join(this.localUploadDir, safeFilename);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    } catch (err) {
      // ignore
    }
  }
}
