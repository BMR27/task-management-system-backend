import { Ticket } from '@prisma/client';

export const TICKET_CREATED = 'ticket.created';
export const TICKET_ASSIGNED = 'ticket.assigned';
export const TICKET_STATUS_CHANGED = 'ticket.status_changed';
export const COMMENT_CREATED = 'comment.created';

export class TicketCreatedEvent {
  constructor(
    public ticket: Ticket,
    public actorId: string,
  ) {}
}

export class TicketAssignedEvent {
  constructor(
    public ticket: Ticket,
    public previousAssigneeId: string | null,
    public newAssigneeId: string | null,
    public actorId: string,
  ) {}
}

export class TicketStatusChangedEvent {
  constructor(
    public ticket: Ticket,
    public oldStatus: string,
    public newStatus: string,
    public actorId: string,
  ) {}
}

export class CommentCreatedEvent {
  constructor(
    public comment: {
      id: string;
      ticketId: string;
      userId: string;
      content: string;
      type: string;
      source?: 'web' | 'email';
    },
    public ticket: Ticket,
    public actorId: string,
  ) {}
}
