import { SenderGuardService } from './sender-guard.service';

describe('SenderGuardService', () => {
  function makeService(config: any) {
    const prisma = {
      emailIngestConfig: { findUnique: jest.fn().mockResolvedValue(config) },
      emailMessage: { count: jest.fn().mockResolvedValue(0) },
    };
    return { service: new SenderGuardService(prisma as any), prisma };
  }

  it('blocks an email explicitly listed', async () => {
    const { service } = makeService({ senderBlocklist: ['spam@bad.com'], maxTicketsPerSenderPerHour: 20 });
    expect(await service.isBlocked('spam@bad.com')).toBe(true);
  });

  it('blocks an entire domain', async () => {
    const { service } = makeService({ senderBlocklist: ['bad.com'], maxTicketsPerSenderPerHour: 20 });
    expect(await service.isBlocked('someone@bad.com')).toBe(true);
  });

  it('allows senders not in the blocklist', async () => {
    const { service } = makeService({ senderBlocklist: ['bad.com'], maxTicketsPerSenderPerHour: 20 });
    expect(await service.isBlocked('someone@good.com')).toBe(false);
  });

  it('rate-limits senders over the configured hourly cap', async () => {
    const { service, prisma } = makeService({ senderBlocklist: [], maxTicketsPerSenderPerHour: 5 });
    (prisma.emailMessage.count as jest.Mock).mockResolvedValue(5);
    expect(await service.isRateLimited('a@b.com')).toBe(true);
  });

  it('does not rate-limit senders under the cap', async () => {
    const { service, prisma } = makeService({ senderBlocklist: [], maxTicketsPerSenderPerHour: 5 });
    (prisma.emailMessage.count as jest.Mock).mockResolvedValue(2);
    expect(await service.isRateLimited('a@b.com')).toBe(false);
  });
});
