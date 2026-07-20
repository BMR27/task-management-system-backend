import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../history/history.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentCreatedEvent, COMMENT_CREATED } from '../common/events/ticket-events';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private history: HistoryService,
    private events: EventEmitter2,
  ) {}

  private async loadTicketWithScope(ticketId: string, user: AuthUser) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    if (user.role === 'user' && ticket.createdById !== user.id) {
      throw new ForbiddenException('No tienes acceso a este ticket');
    }
    return ticket;
  }

  async findByTicket(ticketId: string, user: AuthUser) {
    await this.loadTicketWithScope(ticketId, user);
    const comments = await this.prisma.comment.findMany({
      where: { ticketId },
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (user.role === 'user') {
      return comments.filter((c) => c.type !== 'internal');
    }
    return comments;
  }

  async create(ticketId: string, dto: CreateCommentDto, user: AuthUser) {
    const ticket = await this.loadTicketWithScope(ticketId, user);
    const type = dto.type ?? 'public';
    if (type === 'internal' && user.role === 'user') {
      throw new ForbiddenException('No puedes crear comentarios internos');
    }
    const comment = await this.prisma.comment.create({
      data: { ticketId, userId: user.id, content: dto.content, type },
      include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
    });
    await this.prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
    await this.history.create(
      ticketId,
      user.id,
      type === 'internal' ? 'internal_comment' : 'comment',
    );
    this.events.emit(
      COMMENT_CREATED,
      new CommentCreatedEvent(
        { id: comment.id, ticketId, userId: user.id, content: comment.content, type, source: 'web' },
        ticket,
        user.id,
      ),
    );
    return comment;
  }

  /**
   * Adds a comment coming from a matched inbound email reply. No AuthUser
   * involved (the "sender" isn't a logged-in account) — the system user acts
   * on their behalf, same as TicketsService.createFromEmail.
   */
  async createFromEmail(ticketId: string, content: string, systemUserId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    const comment = await this.prisma.comment.create({
      data: { ticketId, userId: systemUserId, content, type: 'public', source: 'email' },
      include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
    });
    await this.prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
    await this.history.create(ticketId, systemUserId, 'comment_from_email');
    this.events.emit(
      COMMENT_CREATED,
      new CommentCreatedEvent(
        { id: comment.id, ticketId, userId: systemUserId, content, type: 'public', source: 'email' },
        ticket,
        systemUserId,
      ),
    );
    return comment;
  }
}
