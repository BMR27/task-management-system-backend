import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const ARCHIVE_AFTER_DAYS = 3;

@Injectable()
export class ArchiveTicketsCron {
  private readonly logger = new Logger(ArchiveTicketsCron.name);

  constructor(private prisma: PrismaService) {}

  /** Tickets closed for 3+ days move to 'archived' and drop out of agent/supervisor views. */
  @Cron(CronExpression.EVERY_HOUR)
  async archiveOldClosedTickets() {
    const cutoff = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.ticket.updateMany({
      where: { status: 'closed', closedAt: { lte: cutoff } },
      data: { status: 'archived' },
    });
    if (count > 0) {
      this.logger.log(`${count} ticket(s) archivado(s) tras 3 días cerrados`);
    }
  }
}
