import { InboundEmailController } from './inbound-email.controller';
import { Webhook } from 'svix';

jest.mock('svix', () => ({
  Webhook: jest.fn(),
}));

describe('InboundEmailController', () => {
  function makeController({ verifyImpl, existingEmailMessage = null }: any = {}) {
    (Webhook as unknown as jest.Mock).mockImplementation(() => ({
      verify: verifyImpl ?? jest.fn().mockReturnValue({ type: 'email.received', data: { email_id: 'rs1' } }),
    }));

    const config = {
      get: jest.fn((key: string) => (key === 'RESEND_WEBHOOK_SECRET' ? 'secret' : undefined)),
    };
    const prisma = {
      emailMessage: {
        findUnique: jest.fn().mockResolvedValue(existingEmailMessage),
        create: jest.fn().mockResolvedValue({ id: 'em1' }),
      },
    };
    const queue = { add: jest.fn().mockResolvedValue({}) };

    const controller = new InboundEmailController(config as any, prisma as any, queue as any);
    return { controller, config, prisma, queue };
  }

  it('rejects when RESEND_WEBHOOK_SECRET is missing', async () => {
    const { controller, config } = makeController();
    (config.get as jest.Mock).mockReturnValue(undefined);

    const result = await controller.handleInbound({ rawBody: Buffer.from('x') } as any, {});

    expect(result).toEqual({ ok: false });
  });

  it('rejects on invalid signature', async () => {
    const { controller } = makeController({
      verifyImpl: jest.fn(() => {
        throw new Error('bad signature');
      }),
    });

    const result = await controller.handleInbound({ rawBody: Buffer.from('x') } as any, {});

    expect(result).toEqual({ ok: false });
  });

  it('does not re-enqueue a message it already processed (dedupe)', async () => {
    const { controller, prisma, queue } = makeController({ existingEmailMessage: { id: 'em1' } });

    const result = await controller.handleInbound({ rawBody: Buffer.from('x') } as any, {});

    expect(result).toEqual({ ok: true });
    expect(prisma.emailMessage.create).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('creates an EmailMessage and enqueues a new inbound email', async () => {
    const { controller, prisma, queue } = makeController();

    const result = await controller.handleInbound({ rawBody: Buffer.from('x') } as any, {});

    expect(result).toEqual({ ok: true });
    expect(prisma.emailMessage.create).toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith(
      'inbound-email',
      { emailMessageId: 'em1', resendEmailId: 'rs1' },
      expect.objectContaining({ jobId: expect.any(String) }),
    );
  });

  it('ignores non email.received events', async () => {
    const { controller, prisma, queue } = makeController({
      verifyImpl: jest.fn().mockReturnValue({ type: 'email.bounced', data: {} }),
    });

    const result = await controller.handleInbound({ rawBody: Buffer.from('x') } as any, {});

    expect(result).toEqual({ ok: true });
    expect(prisma.emailMessage.create).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });
});
