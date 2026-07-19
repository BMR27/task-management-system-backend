import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, Ticket, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../history/history.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import {
  CommentCreatedEvent,
  TicketAssignedEvent,
  TicketCreatedEvent,
  TicketStatusChangedEvent,
  TICKET_ASSIGNED,
  TICKET_CREATED,
  TICKET_STATUS_CHANGED,
} from '../common/events/ticket-events';

const TICKET_INCLUDE = {
  category: true,
  group: true,
  assignedTo: { select: { id: true, name: true, avatar: true, role: true } },
  createdBy: { select: { id: true, name: true, avatar: true, role: true } },
  attachments: true,
};

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private history: HistoryService,
    private events: EventEmitter2,
  ) {}

  private async nextFolio(): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.folioCounter.upsert({
        where: { year },
        create: { year, lastSeq: 1 },
        update: { lastSeq: { increment: 1 } },
      });
      return existing.lastSeq;
    });
    return `TK-${year}-${String(counter).padStart(6, '0')}`;
  }

  private withSla(ticket: Ticket & { category?: { slaHours: number } | null }) {
    if (!ticket.category) return { ...ticket, slaAtRisk: false, slaBreached: false };
    const hoursElapsed = (Date.now() - new Date(ticket.createdAt).getTime()) / 3_600_000;
    const isOpen = ticket.status !== 'resolved' && ticket.status !== 'closed';
    const slaBreached = isOpen && hoursElapsed > ticket.category.slaHours;
    const slaAtRisk = isOpen && !slaBreached && hoursElapsed > ticket.category.slaHours * 0.8;
    return { ...ticket, slaAtRisk, slaBreached };
  }

  private async assertScope(
    user: AuthUser,
    ticket: { id: string; createdById: string; assignedToId: string | null },
  ) {
    if (user.role === 'user' && ticket.createdById !== user.id) {
      throw new ForbiddenException('No tienes acceso a este ticket');
    }
    if (user.role === 'agent' && ticket.assignedToId !== user.id) {
      const everAssigned = await this.prisma.historyEntry.findFirst({
        where: {
          ticketId: ticket.id,
          field: 'assignedToId',
          OR: [{ oldValue: user.id }, { newValue: user.id }],
        },
      });
      if (!everAssigned) {
        throw new ForbiddenException('No tienes acceso a este ticket');
      }
    }
  }

  async create(dto: CreateTicketDto, user: AuthUser) {
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    const groupId = dto.groupId || category.groupId;
    // Auto-assign to the category's default agent when the caller didn't pick someone explicitly.
    const assignedToId = dto.assignedToId ?? category.defaultAssigneeId ?? undefined;

    const folio = await this.nextFolio();
    const ticket = await this.prisma.ticket.create({
      data: {
        folio,
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        groupId,
        priority: dto.priority ?? 'medium',
        status: 'new',
        tags: dto.tags?.map((t) => t.trim().toLowerCase()).filter(Boolean) ?? [],
        createdById: user.id,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assignedToId,
        assignedAt: assignedToId ? new Date() : undefined,
      },
      include: TICKET_INCLUDE,
    });
    await this.history.create(ticket.id, user.id, 'created');
    this.events.emit(TICKET_CREATED, new TicketCreatedEvent(ticket, user.id));
    if (assignedToId) {
      await this.history.create(ticket.id, user.id, 'assigned', 'assignedToId', null, assignedToId);
      this.events.emit(TICKET_ASSIGNED, new TicketAssignedEvent(ticket, null, assignedToId, user.id));
    }
    return this.withSla(ticket);
  }

  async findAll(query: QueryTicketsDto, user: AuthUser) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 500) : 20;

    const where: Prisma.TicketWhereInput = {};

    if (user.role === 'user') {
      where.createdById = user.id;
    } else if (user.role === 'agent') {
      where.OR = [
        { assignedToId: user.id },
        {
          history: {
            some: {
              field: 'assignedToId',
              OR: [{ oldValue: user.id }, { newValue: user.id }],
            },
          },
        },
      ];
    } else if (query.assignedToId?.length) {
      where.assignedToId = { in: query.assignedToId };
    }

    if (query.status?.length) where.status = { in: query.status as TicketStatus[] };
    if (query.priority?.length) where.priority = { in: query.priority as any };
    if (query.groupId?.length) where.groupId = { in: query.groupId };
    if (query.categoryId?.length) where.categoryId = { in: query.categoryId };
    if (query.search) {
      const searchOr: Prisma.TicketWhereInput[] = [
        { folio: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
      where.AND = [{ OR: searchOr }];
    }
    if (query.from || query.to) {
      where.createdAt = {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      };
    }

    const [total, tickets] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        include: TICKET_INCLUDE,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortDir ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: tickets.map((t) => this.withSla(t)),
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: string, user: AuthUser) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: TICKET_INCLUDE,
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    await this.assertScope(user, ticket);
    return this.withSla(ticket);
  }

  async update(id: string, dto: UpdateTicketDto, user: AuthUser) {
    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Ticket no encontrado');
    }
    await this.assertScope(user, existing);

    const data: Prisma.TicketUpdateInput = {
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      tags: dto.tags?.map((t) => t.trim().toLowerCase()).filter(Boolean),
    };
    if (dto.categoryId) data.category = { connect: { id: dto.categoryId } };
    if (dto.groupId) data.group = { connect: { id: dto.groupId } };
    if (dto.assignedToId !== undefined) {
      data.assignedTo = dto.assignedToId ? { connect: { id: dto.assignedToId } } : { disconnect: true };
      data.assignedAt = dto.assignedToId ? new Date() : null;
    }
    if (dto.status) {
      Object.assign(data, this.statusSideEffects(existing.status, dto.status));
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data,
      include: TICKET_INCLUDE,
    });

    if (dto.assignedToId !== undefined && dto.assignedToId !== existing.assignedToId) {
      await this.history.create(
        id,
        user.id,
        'assigned',
        'assignedToId',
        existing.assignedToId,
        dto.assignedToId,
      );
      this.events.emit(
        TICKET_ASSIGNED,
        new TicketAssignedEvent(updated, existing.assignedToId, dto.assignedToId ?? null, user.id),
      );
    }
    if (dto.status && dto.status !== existing.status) {
      await this.history.create(id, user.id, 'status_changed', 'status', existing.status, dto.status);
      this.events.emit(
        TICKET_STATUS_CHANGED,
        new TicketStatusChangedEvent(updated, existing.status, dto.status, user.id),
      );
    }
    if (dto.priority && dto.priority !== existing.priority) {
      await this.history.create(
        id,
        user.id,
        'priority_changed',
        'priority',
        existing.priority,
        dto.priority,
      );
    }
    return this.withSla(updated);
  }

  private statusSideEffects(oldStatus: TicketStatus, newStatus: TicketStatus): Prisma.TicketUpdateInput {
    const data: Prisma.TicketUpdateInput = { status: newStatus };
    if (newStatus === 'resolved') {
      data.resolvedAt = new Date();
    }
    if (newStatus === 'closed') {
      data.closedAt = new Date();
    }
    if (oldStatus === 'closed' && newStatus !== 'closed') {
      data.closedAt = null;
    }
    if (newStatus === 'new' || newStatus === 'in_progress') {
      if (oldStatus === 'resolved' || oldStatus === 'closed') {
        data.resolvedAt = null;
        data.closedAt = null;
      }
    }
    return data;
  }

  async assign(id: string, userId: string | null, user: AuthUser) {
    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Ticket no encontrado');
    }
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        assignedTo: userId ? { connect: { id: userId } } : { disconnect: true },
        assignedAt: userId ? new Date() : null,
      },
      include: TICKET_INCLUDE,
    });
    await this.history.create(id, user.id, 'assigned', 'assignedToId', existing.assignedToId, userId);
    this.events.emit(
      TICKET_ASSIGNED,
      new TicketAssignedEvent(updated, existing.assignedToId, userId, user.id),
    );
    return this.withSla(updated);
  }

  async changeStatus(id: string, status: TicketStatus, user: AuthUser) {
    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Ticket no encontrado');
    }
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: this.statusSideEffects(existing.status, status),
      include: TICKET_INCLUDE,
    });
    await this.history.create(id, user.id, 'status_changed', 'status', existing.status, status);
    this.events.emit(
      TICKET_STATUS_CHANGED,
      new TicketStatusChangedEvent(updated, existing.status, status, user.id),
    );
    return this.withSla(updated);
  }

  async changePriority(id: string, priority: string, user: AuthUser) {
    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Ticket no encontrado');
    }
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { priority: priority as any },
      include: TICKET_INCLUDE,
    });
    await this.history.create(id, user.id, 'priority_changed', 'priority', existing.priority, priority);
    return this.withSla(updated);
  }

  async getHistory(id: string, user: AuthUser) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    await this.assertScope(user, ticket);
    return this.history.findByTicket(id);
  }

  async remove(id: string) {
    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Ticket no encontrado');
    }
    await this.prisma.ticket.delete({ where: { id } });
    return { ok: true };
  }

  emitCommentCreated(event: CommentCreatedEvent) {
    this.events.emit('comment.created', event);
  }
}
