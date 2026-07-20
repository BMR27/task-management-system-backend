import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { CategoriesModule } from './categories/categories.module';
import { TicketsModule } from './tickets/tickets.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { CommentsModule } from './comments/comments.module';
import { HistoryModule } from './history/history.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MailModule } from './mail/mail.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { HealthModule } from './health/health.module';
import { InboundEmailModule } from './inbound-email/inbound-email.module';
import { EmailProcessingModule } from './email-processing/email-processing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('REDIS_URL') ?? 'redis://localhost:6379' },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    CategoriesModule,
    TicketsModule,
    AttachmentsModule,
    CommentsModule,
    HistoryModule,
    NotificationsModule,
    MailModule,
    ReportsModule,
    SettingsModule,
    HealthModule,
    InboundEmailModule,
    EmailProcessingModule,
  ],
})
export class AppModule {}
