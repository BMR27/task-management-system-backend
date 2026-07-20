import { ThreadMatcherService } from './thread-matcher.service';

describe('ThreadMatcherService', () => {
  function makeService({ ticketByFolio = null, outboundMatch = null, ticketByOutbound = null }: any = {}) {
    const prisma = {
      emailMessage: { findFirst: jest.fn().mockResolvedValue(outboundMatch) },
      ticket: { findUnique: jest.fn().mockResolvedValue(ticketByOutbound) },
    } as any;
    const tickets = { findByFolio: jest.fn().mockResolvedValue(ticketByFolio) } as any;
    return { service: new ThreadMatcherService(prisma, tickets), prisma, tickets };
  }

  it('matches by folio in the subject first', async () => {
    const ticket = { id: 't1', folio: 'TK-2026-000123' };
    const { service, tickets, prisma } = makeService({ ticketByFolio: ticket });

    const result = await service.findTicketForReply({
      subject: 'Re: [TK-2026-000123] No enciende',
      inReplyTo: undefined,
      references: [],
    });

    expect(tickets.findByFolio).toHaveBeenCalledWith('TK-2026-000123');
    expect(result).toBe(ticket);
    expect(prisma.emailMessage.findFirst).not.toHaveBeenCalled();
  });

  it('falls back to In-Reply-To/References when subject has no folio', async () => {
    const ticket = { id: 't2' };
    const { service, prisma } = makeService({
      ticketByFolio: null,
      outboundMatch: { ticketId: 't2' },
      ticketByOutbound: ticket,
    });

    const result = await service.findTicketForReply({
      subject: 'Re: mi problema',
      inReplyTo: '<abc@dominio.com>',
      references: [],
    });

    expect(prisma.emailMessage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ direction: 'outbound', messageId: { in: ['<abc@dominio.com>'] } }),
      }),
    );
    expect(result).toBe(ticket);
  });

  it('returns null when nothing matches', async () => {
    const { service } = makeService({});
    const result = await service.findTicketForReply({ subject: 'Hola', inReplyTo: undefined, references: [] });
    expect(result).toBeNull();
  });
});
