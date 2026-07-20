import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';

const FOLIO_PATTERN = /TK-\d{4}-\d{6}/;

export interface InboundEmailForMatching {
  subject: string;
  inReplyTo?: string | null;
  references: string[];
}

@Injectable()
export class ThreadMatcherService {
  private readonly logger = new Logger(ThreadMatcherService.name);

  constructor(
    private prisma: PrismaService,
    private tickets: TicketsService,
  ) {}

  /**
   * Finds the existing ticket an inbound email is replying to, if any.
   * Tries the folio embedded in the subject first (most robust — survives
   * mail clients that mangle threading headers), then falls back to
   * In-Reply-To/References against Message-IDs of emails we sent out
   * ourselves (see MailService.send`'s ticketId option).
   */
  async findTicketForReply(email: InboundEmailForMatching) {
    const folioMatch = email.subject?.match(FOLIO_PATTERN)?.[0];
    if (folioMatch) {
      const ticket = await this.tickets.findByFolio(folioMatch);
      if (ticket) return ticket;
      this.logger.warn(`Folio ${folioMatch} en asunto no corresponde a ningún ticket existente`);
    }

    const candidateMessageIds = [email.inReplyTo, ...(email.references ?? [])].filter(
      (id): id is string => !!id,
    );
    if (!candidateMessageIds.length) return null;

    const outboundMatch = await this.prisma.emailMessage.findFirst({
      where: { direction: 'outbound', messageId: { in: candidateMessageIds }, ticketId: { not: null } },
    });
    if (!outboundMatch?.ticketId) return null;

    return this.prisma.ticket.findUnique({ where: { id: outboundMatch.ticketId } });
  }
}
