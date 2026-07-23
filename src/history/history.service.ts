import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

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

  findRecent(user: AuthUser, limit = 10) {
    const where: Prisma.HistoryEntryWhereInput = {};

    if (user.role === 'user') {
      where.ticket = { createdById: user.id };
    } else if (user.role === 'agent') {
      where.ticket = user.groupId
        ? { groupId: user.groupId }
        : {
            OR: [
              { assignedToId: user.id },
              {
                history: {
                  some: {
                    field: 'assignedToId',
                    OR: [{ oldValue: user.id }, { newValue: user.id }],
                  },
                },
              },
            ],
          };
    }

    return this.prisma.historyEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true } },
        ticket: { select: { id: true, folio: true, title: true } },
      },
    });
  }
}
