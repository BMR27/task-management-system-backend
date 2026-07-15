import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { CommentAttachmentsController } from './comment-attachments.controller';
import { AttachmentsService } from './attachments.service';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TicketsModule],
  controllers: [AttachmentsController, CommentAttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
