import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

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
