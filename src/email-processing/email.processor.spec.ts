import { EmailProcessor } from './email.processor';

describe('EmailProcessor', () => {
  function makeProcessor(overrides: any = {}) {
    const prisma = {
      emailMessage: {
        findUnique: jest.fn().mockResolvedValue({ id: 'em1', status: 'pending' }),
        update: jest.fn().mockResolvedValue({}),
      },
      emailIngestConfig: { findUnique: jest.fn().mockResolvedValue(null) },
      ...overrides.prisma,
    };
    const tickets = {
      getSystemUser: jest.fn().mockResolvedValue({ id: 'sys1', email: 'sistema@nextoshelpdesk.com.mx' }),
      createFromEmail: jest.fn().mockResolvedValue({
        id: 'newTicket',
        folio: 'TK-2026-000001',
        title: 'Asunto',
        group: { name: 'Help Desk TI' },
      }),
      changeStatus: jest.fn().mockResolvedValue({}),
      ...overrides.tickets,
    };
    const comments = {
      createFromEmail: jest.fn().mockResolvedValue({ id: 'comment1' }),
      ...overrides.comments,
    };
    const mail = { send: jest.fn().mockResolvedValue(undefined), ...overrides.mail };
    const attachments = {
      createForCommentFromInboundFiles: jest.fn().mockResolvedValue([]),
      createForTicketFromInboundFiles: jest.fn().mockResolvedValue([]),
      ...overrides.attachments,
    };
    const fetcher = {
      fetch: jest.fn().mockResolvedValue({
        messageId: '<msg1@resend>',
        fromEmail: 'cliente@example.com',
        fromName: 'Cliente',
        subject: 'No puedo acceder',
        text: 'No puedo entrar a mi cuenta',
        html: undefined,
        headers: {},
        inReplyTo: undefined,
        references: [],
        attachments: [],
      }),
      ...overrides.fetcher,
    };
    const threadMatcher = { findTicketForReply: jest.fn().mockResolvedValue(null), ...overrides.threadMatcher };
    const classifier = { classify: jest.fn().mockResolvedValue({}), ...overrides.classifier };
    const senderGuard = {
      isBlocked: jest.fn().mockResolvedValue(false),
      isRateLimited: jest.fn().mockResolvedValue(false),
      ...overrides.senderGuard,
    };

    const processor = new EmailProcessor(
      prisma as any,
      tickets as any,
      comments as any,
      mail as any,
      attachments as any,
      fetcher as any,
      threadMatcher as any,
      classifier as any,
      senderGuard as any,
    );
    return { processor, prisma, tickets, comments, mail, attachments, fetcher, threadMatcher, classifier, senderGuard };
  }

  it('creates a new ticket when no existing thread matches', async () => {
    const { processor, tickets, mail, prisma } = makeProcessor();

    await processor.process({ data: { emailMessageId: 'em1', resendEmailId: 'rs1' } } as any);

    expect(tickets.createFromEmail).toHaveBeenCalledWith(
      expect.objectContaining({ requesterEmail: 'cliente@example.com', title: 'No puedo acceder' }),
    );
    expect(mail.send).toHaveBeenCalledWith(
      'cliente@example.com',
      expect.stringContaining('TK-2026-000001'),
      expect.any(String),
      { ticketId: 'newTicket' },
    );
    expect(prisma.emailMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'em1' }, data: expect.objectContaining({ status: 'processed', ticketId: 'newTicket' }) }),
    );
  });

  it('adds a comment and reopens the ticket when replying to a resolved ticket', async () => {
    const existingTicket = { id: 'ticket1', status: 'resolved' };
    const { processor, comments, tickets, prisma } = makeProcessor({
      threadMatcher: { findTicketForReply: jest.fn().mockResolvedValue(existingTicket) },
    });

    await processor.process({ data: { emailMessageId: 'em1', resendEmailId: 'rs1' } } as any);

    expect(comments.createFromEmail).toHaveBeenCalledWith('ticket1', expect.any(String), 'sys1');
    expect(tickets.changeStatus).toHaveBeenCalledWith('ticket1', 'in_progress', expect.objectContaining({ id: 'sys1' }));
    expect(tickets.createFromEmail).not.toHaveBeenCalled();
    expect(prisma.emailMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'processed', ticketId: 'ticket1', commentId: 'comment1' }) }),
    );
  });

  it('does not reopen a ticket that is already open', async () => {
    const existingTicket = { id: 'ticket1', status: 'in_progress' };
    const { processor, tickets } = makeProcessor({
      threadMatcher: { findTicketForReply: jest.fn().mockResolvedValue(existingTicket) },
    });

    await processor.process({ data: { emailMessageId: 'em1', resendEmailId: 'rs1' } } as any);

    expect(tickets.changeStatus).not.toHaveBeenCalled();
  });

  it('skips automated/bounce emails without creating a ticket', async () => {
    const { processor, tickets, prisma } = makeProcessor({
      fetcher: {
        fetch: jest.fn().mockResolvedValue({
          messageId: '<bounce@resend>',
          fromEmail: 'mailer-daemon@example.com',
          subject: 'Undelivered Mail Returned to Sender',
          headers: {},
          references: [],
          attachments: [],
        }),
      },
    });

    await processor.process({ data: { emailMessageId: 'em1', resendEmailId: 'rs1' } } as any);

    expect(tickets.createFromEmail).not.toHaveBeenCalled();
    expect(prisma.emailMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'skipped' }) }),
    );
  });

  it('marks the email as failed and rethrows on unexpected errors', async () => {
    const { processor, prisma } = makeProcessor({
      fetcher: { fetch: jest.fn().mockRejectedValue(new Error('Resend caído')) },
    });

    await expect(processor.process({ data: { emailMessageId: 'em1', resendEmailId: 'rs1' } } as any)).rejects.toThrow(
      'Resend caído',
    );
    expect(prisma.emailMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
    );
  });
});
