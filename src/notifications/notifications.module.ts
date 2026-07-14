import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TicketNotificationsListener } from './listeners/ticket-notifications.listener';
import { MailModule } from '../mail/mail.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [MailModule, SettingsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, TicketNotificationsListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
