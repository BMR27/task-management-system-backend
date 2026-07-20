import { Module } from '@nestjs/common';
import { InboundEmailController } from './inbound-email.controller';
import { EmailProcessingModule } from '../email-processing/email-processing.module';

@Module({
  imports: [EmailProcessingModule],
  controllers: [InboundEmailController],
})
export class InboundEmailModule {}
