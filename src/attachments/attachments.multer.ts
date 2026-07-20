import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { isAllowedAttachmentMimeType, safeAttachmentFilename } from './attachment-validation.util';

export const attachmentsMulterOptions = {
  storage: diskStorage({
    destination: process.env.UPLOADS_DIR ?? './uploads',
    filename: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      cb(null, `${randomUUID()}-${safeAttachmentFilename(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
    if (!isAllowedAttachmentMimeType(file.mimetype)) {
      cb(new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}`), false);
      return;
    }
    cb(null, true);
  },
};
