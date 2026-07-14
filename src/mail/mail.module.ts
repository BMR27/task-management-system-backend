import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailDigestCron } from './mail-digest.cron';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  providers: [MailService, MailDigestCron],
  exports: [MailService],
})
export class MailModule {}
