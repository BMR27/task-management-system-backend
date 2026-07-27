import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { HistoryModule } from '../history/history.module';
import { ArchiveTicketsCron } from './archive-tickets.cron';

@Module({
  imports: [HistoryModule],
  controllers: [TicketsController],
  providers: [TicketsService, ArchiveTicketsCron],
  exports: [TicketsService],
})
export class TicketsModule {}
