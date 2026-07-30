import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
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
import { AttachmentsService } from './attachments.service';
import { TicketsService } from '../tickets/tickets.service';
import { attachmentsMulterOptions } from './attachments.multer';

@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/attachments')
export class AttachmentsController {
  constructor(
    private attachmentsService: AttachmentsService,
    private ticketsService: TicketsService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 5, attachmentsMulterOptions))
  async upload(
    @Param('ticketId') ticketId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: AuthUser,
  ) {
    await this.ticketsService.findOne(ticketId, user);
    if (!files?.length) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    return this.attachmentsService.createForTicket(ticketId, files);
  }

  @Delete(':attachmentId')
  async remove(
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const ticket = await this.ticketsService.findOne(ticketId, user);
    const canDelete =
      user.role === 'admin' || user.role === 'supervisor' || ticket.assignedToId === user.id;
    if (!canDelete) {
      throw new ForbiddenException(
        'Solo un supervisor, un administrador o el agente asignado pueden eliminar adjuntos',
      );
    }
    return this.attachmentsService.removeFromTicket(ticketId, attachmentId);
  }
}
