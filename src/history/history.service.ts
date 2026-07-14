import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  create(
    ticketId: string,
    userId: string,
    action: string,
    field?: string,
    oldValue?: string | null,
    newValue?: string | null,
  ) {
    return this.prisma.historyEntry.create({
      data: {
        ticketId,
        userId,
        action,
        field,
        oldValue: oldValue ?? undefined,
        newValue: newValue ?? undefined,
      },
    });
  }

  findByTicket(ticketId: string) {
    return this.prisma.historyEntry.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
    });
  }

  findRecent(limit = 10) {
    return this.prisma.historyEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true } },
        ticket: { select: { id: true, folio: true, title: true } },
      },
    });
  }
}
