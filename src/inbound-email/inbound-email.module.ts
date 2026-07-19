import { Module } from '@nestjs/common';
import { InboundEmailController } from './inbound-email.controller';
import { TicketsModule } from '../tickets/tickets.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TicketsModule, MailModule],
  controllers: [InboundEmailController],
})
export class InboundEmailModule {}
