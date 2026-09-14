import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

export type ImageKind = 'banner' | 'logo' | 'avatar';

const SIZES: Record<ImageKind, { width: number; height?: number; fit: keyof sharp.FitEnum }> = {
  banner: { width: 1600, fit: 'inside' },
  logo: { width: 800, fit: 'inside' },
  avatar: { width: 512, height: 512, fit: 'cover' },
};

/**
 * Pluggable file storage. Two drivers, selected with STORAGE_DRIVER:
 *  - db    : files live in PostgreSQL (FileObject) and are served by FilesController. Zero extra
 *            infrastructure and survives redeploys on ephemeral hosts. Default.
 *  - local : files written to UPLOAD_DIR and served statically from /files.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: 'db' | 'local';
  private readonly uploadDir: string;
  private readonly publicUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.driver = config.get('STORAGE_DRIVER') === 'local' ? 'local' : 'db';
    this.uploadDir = config.get('UPLOAD_DIR') ?? './uploads';
    this.publicUrl = (config.get('PUBLIC_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
    this.logger.log(`Storage driver: ${this.driver}`);
  }

  /** Resizes/re-encodes the image and stores it. Returns an absolute public URL. */
  async saveImage(buffer: Buffer, kind: ImageKind): Promise<string> {
    const spec = SIZES[kind];
    const processed = await sharp(buffer)
      .rotate()
      .resize({ width: spec.width, height: spec.height, fit: spec.fit, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    return this.saveBuffer(processed, 'image/webp', '.webp');
  }

  async saveBuffer(buffer: Buffer, mimeType: string, ext: string): Promise<string> {
    if (this.driver === 'local') {
      await fs.mkdir(this.uploadDir, { recursive: true });
      const name = `${uuid()}${ext}`;
      await fs.writeFile(join(this.uploadDir, name), buffer);
      return `${this.publicUrl}/files/${name}`;
    }
    const file = await this.prisma.fileObject.create({
      data: { mimeType, size: buffer.length, data: new Uint8Array(buffer) },
      select: { id: true },
    });
    return `${this.publicUrl}/files/${file.id}${ext}`;
  }

  /** Loads a db-stored file by id (the extension in the URL is cosmetic). */
  async getDbFile(idWithExt: string) {
    const id = idWithExt.replace(extname(idWithExt), '');
    const file = await this.prisma.fileObject.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  /** Best-effort deletion of a previously stored file given its public URL. */
  async deleteByUrl(url?: string | null) {
    const prefix = `${this.publicUrl}/files/`;
    if (!url || !url.startsWith(prefix)) return;
    const name = url.substring(prefix.length);
    try {
      if (this.driver === 'local') await fs.unlink(join(this.uploadDir, name));
      else await this.prisma.fileObject.delete({ where: { id: name.replace(extname(name), '') } });
    } catch {
      /* already gone */
    }
  }
}
