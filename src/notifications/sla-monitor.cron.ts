import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from './notifications.service';
import { slaWarningTemplate } from '../mail/templates/templates';

@Injectable()
export class SlaMonitorCron {
  private readonly logger = new Logger(SlaMonitorCron.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private notifications: NotificationsService,
    private config: ConfigService,
  ) {}

  private ticketUrl(ticketId: string) {
    const base = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    return `${base}/tickets/${ticketId}`;
  }

  /** Checks every 15 minutes for open tickets nearing/breaching their category's SLA. */
  @Cron('*/15 * * * *')
  async checkSlaWarnings() {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        status: { in: ['new', 'in_progress'] },
        slaWarningSentAt: null,
        assignedToId: { not: null },
      },
      include: { category: true, assignedTo: true },
    });

    let warned = 0;
    for (const ticket of tickets) {
      if (!ticket.category || !ticket.assignedTo) continue;
      const hoursElapsed = (Date.now() - new Date(ticket.createdAt).getTime()) / 3_600_000;
      if (hoursElapsed <= ticket.category.slaHours * 0.8) continue;

      await this.notifications.create(
        ticket.assignedTo.id,
        'sla_warning',
        `SLA próximo a vencer — ${ticket.folio}`,
        ticket.title,
        ticket.id,
      );
      await this.mail.send(
        ticket.assignedTo.email,
        `SLA próximo a vencer — ${ticket.folio}`,
        slaWarningTemplate(ticket.folio, ticket.title, this.ticketUrl(ticket.id)),
        { ticketId: ticket.id },
      );
      await this.prisma.ticket.update({ where: { id: ticket.id }, data: { slaWarningSentAt: new Date() } });
      warned++;
    }
    if (warned > 0) {
      this.logger.log(`Aviso de SLA enviado para ${warned} ticket(s)`);
    }
  }
}
