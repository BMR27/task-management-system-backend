import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import { MailService } from '../../mail/mail.service';
import { SettingsService } from '../../settings/settings.service';
import { STATUS_CONFIG_LABELS, PRIORITY_LABELS } from '../../common/constants/display.constant';
import {
  ticketAssignedTemplate,
  ticketCreatedTemplate,
  statusChangedTemplate,
  newCommentExternalTemplate,
  ticketResolvedExternalTemplate,
} from '../../mail/templates/templates';
import {
  CommentCreatedEvent,
  TicketAssignedEvent,
  TicketCreatedEvent,
  TicketStatusChangedEvent,
  TICKET_ASSIGNED,
  TICKET_CREATED,
  TICKET_STATUS_CHANGED,
  COMMENT_CREATED,
} from '../../common/events/ticket-events';

@Injectable()
export class TicketNotificationsListener {
  private readonly logger = new Logger(TicketNotificationsListener.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
    private settings: SettingsService,
    private config: ConfigService,
  ) {}

  private ticketUrl(ticketId: string) {
    const base = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    return `${base}/tickets/${ticketId}`;
  }

  private async notifyAndMaybeEmail(
    userId: string,
    email: string,
    type: any,
    title: string,
    message: string,
    ticketId: string,
    html: string,
    toggleEnabled: boolean,
  ) {
    await this.notifications.create(userId, type, title, message, ticketId);
    const settings = await this.settings.get();
    if (settings.digestFrequency === 'none' && toggleEnabled) {
      await this.mail.send(email, title, html);
    }
  }

  @OnEvent(TICKET_CREATED)
  async onTicketCreated(event: TicketCreatedEvent) {
    const { ticket, actorId } = event;
    const settings = await this.settings.get();
    const staff = await this.prisma.user.findMany({
      where: {
        groupId: ticket.groupId,
        role: { in: ['agent', 'supervisor', 'admin'] },
        isActive: true,
        id: { not: actorId },
      },
    });
    const title = `Nuevo ticket ${ticket.folio}`;
    const message = `${ticket.title}`;
    const url = this.ticketUrl(ticket.id);
    for (const s of staff) {
      await this.notifyAndMaybeEmail(
        s.id,
        s.email,
        'ticket_created',
        title,
        message,
        ticket.id,
        ticketCreatedTemplate(ticket.folio, ticket.title, url),
        settings.emailOnNewTicket,
      );
    }
  }

  @OnEvent(TICKET_ASSIGNED)
  async onTicketAssigned(event: TicketAssignedEvent) {
    const { ticket, newAssigneeId, actorId } = event;
    if (!newAssigneeId || newAssigneeId === actorId) return;
    const assignee = await this.prisma.user.findUnique({ where: { id: newAssigneeId } });
    if (!assignee) return;
    const settings = await this.settings.get();
    const url = this.ticketUrl(ticket.id);
    await this.notifyAndMaybeEmail(
      assignee.id,
      assignee.email,
      'ticket_assigned',
      `Se te asignó el ticket ${ticket.folio}`,
      ticket.title,
      ticket.id,
      ticketAssignedTemplate(ticket.folio, ticket.title, url),
      settings.emailOnAssignment,
    );
  }

  @OnEvent(TICKET_STATUS_CHANGED)
  async onStatusChanged(event: TicketStatusChangedEvent) {
    const { ticket, oldStatus, newStatus, actorId, resolutionComment } = event;
    const settings = await this.settings.get();
    const url = this.ticketUrl(ticket.id);

    // Tickets created from an inbound email have no in-app account to notify —
    // email the original requester directly once resolved, independent of
    // anyone's digest/notification preferences.
    if (newStatus === 'resolved' && ticket.requesterEmail) {
      await this.mail.send(
        ticket.requesterEmail,
        `Tu ticket ${ticket.folio} ha sido resuelto`,
        ticketResolvedExternalTemplate(ticket.folio, ticket.title, resolutionComment),
        { ticketId: ticket.id },
      );
    }

    const recipients = new Set<string>();
    if (ticket.createdById !== actorId) recipients.add(ticket.createdById);
    if (ticket.assignedToId && ticket.assignedToId !== actorId) recipients.add(ticket.assignedToId);

    for (const userId of recipients) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) continue;
      await this.notifyAndMaybeEmail(
        user.id,
        user.email,
        'status_changed',
        `Cambio de estado en ${ticket.folio}`,
        `${STATUS_CONFIG_LABELS[oldStatus] ?? oldStatus} → ${STATUS_CONFIG_LABELS[newStatus] ?? newStatus}`,
        ticket.id,
        statusChangedTemplate(
          ticket.folio,
          ticket.title,
          STATUS_CONFIG_LABELS[oldStatus] ?? oldStatus,
          STATUS_CONFIG_LABELS[newStatus] ?? newStatus,
          url,
        ),
        settings.emailOnStatusChange,
      );
    }
  }

  @OnEvent(COMMENT_CREATED)
  async onCommentCreated(event: CommentCreatedEvent) {
    const { comment, ticket, actorId } = event;
    const recipientIds = new Set<string>();
    if (ticket.createdById !== actorId) recipientIds.add(ticket.createdById);
    if (ticket.assignedToId && ticket.assignedToId !== actorId) recipientIds.add(ticket.assignedToId);

    const author = await this.prisma.user.findUnique({ where: { id: actorId } });

    // New comments only notify in-app — no email, to avoid inbox noise on
    // every reply (unlike ticket_created/assigned/status_changed, which
    // still email per the user's settings toggles).
    for (const userId of recipientIds) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) continue;
      if (comment.type === 'internal' && user.role === 'user') continue;
      await this.notifications.create(
        user.id,
        'new_comment',
        `Nuevo comentario en ${ticket.folio}`,
        comment.content.slice(0, 140),
        ticket.id,
      );
    }

    // The external requester has no in-app account — email them directly on
    // public replies, unless this very comment came from their own email
    // reply (avoids an infinite reply loop).
    if (comment.type === 'public' && comment.source !== 'email' && ticket.requesterEmail) {
      await this.mail.send(
        ticket.requesterEmail,
        `Nueva respuesta en tu ticket ${ticket.folio}`,
        newCommentExternalTemplate(ticket.folio, ticket.title, author?.name ?? 'Un agente'),
        { ticketId: ticket.id },
      );
    }
  }
}
