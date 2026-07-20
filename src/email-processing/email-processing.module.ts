import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EMAIL_INBOUND_QUEUE } from './email-processing.constants';
import { EmailProcessor } from './email.processor';
import { EmailProcessingController } from './email-processing.controller';
import { ThreadMatcherService } from './thread-matcher.service';
import { ClassificationRulesService } from './classification-rules.service';
import { SenderGuardService } from './sender-guard.service';
import { ResendEmailFetcherService } from './resend-email-fetcher.service';
import { TicketsModule } from '../tickets/tickets.module';
import { CommentsModule } from '../comments/comments.module';
import { MailModule } from '../mail/mail.module';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_INBOUND_QUEUE,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 500 },
        removeOnFail: false,
      },
    }),
    TicketsModule,
    CommentsModule,
    MailModule,
    AttachmentsModule,
  ],
  providers: [
    EmailProcessor,
    ThreadMatcherService,
    ClassificationRulesService,
    SenderGuardService,
    ResendEmailFetcherService,
  ],
  controllers: [EmailProcessingController],
  exports: [BullModule],
})
export class EmailProcessingModule {}
