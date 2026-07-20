import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { safeAttachmentFilename } from './attachment-validation.util';

export interface InboundAttachmentFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

@Injectable()
export class AttachmentsService {
  private readonly uploadsDir = process.env.UPLOADS_DIR ?? './uploads';

  constructor(private prisma: PrismaService) {}

  /**
   * Persists attachments/embedded images fetched from an inbound email (no
   * multer request involved) using the same disk layout and naming scheme
   * as uploads coming through the HTTP endpoints.
   */
  private saveInboundFile(file: InboundAttachmentFile): { filename: string; size: number } {
    mkdirSync(this.uploadsDir, { recursive: true });
    const filename = `${randomUUID()}-${safeAttachmentFilename(file.name)}`;
    writeFileSync(join(this.uploadsDir, filename), file.buffer);
    return { filename, size: file.buffer.length };
  }

  createForTicketFromInboundFiles(ticketId: string, files: InboundAttachmentFile[]) {
    if (!files.length) return Promise.resolve([]);
    return this.prisma.$transaction(
      files.map((file) => {
        const { filename, size } = this.saveInboundFile(file);
        return this.prisma.attachment.create({
          data: { name: file.name, url: `/uploads/${filename}`, size, type: file.mimeType, ticketId },
        });
      }),
    );
  }

  createForCommentFromInboundFiles(commentId: string, files: InboundAttachmentFile[]) {
    if (!files.length) return Promise.resolve([]);
    return this.prisma.$transaction(
      files.map((file) => {
        const { filename, size } = this.saveInboundFile(file);
        return this.prisma.attachment.create({
          data: { name: file.name, url: `/uploads/${filename}`, size, type: file.mimeType, commentId },
        });
      }),
    );
  }

  createForTicket(ticketId: string, files: Express.Multer.File[]) {
    return this.prisma.$transaction(
      files.map((file) =>
        this.prisma.attachment.create({
          data: {
            name: file.originalname,
            url: `/uploads/${file.filename}`,
            size: file.size,
            type: file.mimetype,
            ticketId,
          },
        }),
      ),
    );
  }

  createForComment(commentId: string, files: Express.Multer.File[]) {
    return this.prisma.$transaction(
      files.map((file) =>
        this.prisma.attachment.create({
          data: {
            name: file.originalname,
            url: `/uploads/${file.filename}`,
            size: file.size,
            type: file.mimetype,
            commentId,
          },
        }),
      ),
    );
  }
}
