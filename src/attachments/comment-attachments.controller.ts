import {
  BadRequestException,
  Controller,
  NotFoundException,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentsService } from './attachments.service';
import { TicketsService } from '../tickets/tickets.service';
import { attachmentsMulterOptions } from './attachments.multer';

@UseGuards(JwtAuthGuard)
@Controller('comments/:commentId/attachments')
export class CommentAttachmentsController {
  constructor(
    private attachmentsService: AttachmentsService,
    private ticketsService: TicketsService,
    private prisma: PrismaService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 5, attachmentsMulterOptions))
  async upload(
    @Param('commentId') commentId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: AuthUser,
  ) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }
    await this.ticketsService.findOne(comment.ticketId, user);
    if (!files?.length) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    return this.attachmentsService.createForComment(commentId, files);
  }
}
