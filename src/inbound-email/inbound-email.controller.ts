import { Controller, Post, Req, Headers, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Webhook } from 'svix';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_INBOUND_QUEUE } from '../email-processing/email-processing.constants';
import { EmailInboundJobData } from '../email-processing/email.processor';

@Controller('webhooks')
export class InboundEmailController {
  private readonly logger = new Logger(InboundEmailController.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    @InjectQueue(EMAIL_INBOUND_QUEUE) private queue: Queue<EmailInboundJobData>,
  ) {}

  @Post('resend-inbound')
  @HttpCode(HttpStatus.OK)
  async handleInbound(@Req() req: RawBodyRequest<Request>, @Headers() headers: Record<string, string>) {
    const secret = this.config.get<string>('RESEND_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('RESEND_WEBHOOK_SECRET no configurado — rechazando webhook de correo entrante');
      return { ok: false };
    }

    const payload = req.rawBody;
    if (!payload) {
      this.logger.error('El webhook llegó sin rawBody; revisa la config de body parsing');
      return { ok: false };
    }

    let event: any;
    try {
      const wh = new Webhook(secret);
      event = wh.verify(payload, {
        'svix-id': headers['svix-id'],
        'svix-timestamp': headers['svix-timestamp'],
        'svix-signature': headers['svix-signature'],
      });
    } catch (err) {
      this.logger.warn(`Firma de webhook inválida: ${(err as Error).message}`);
      return { ok: false };
    }

    if (event?.type !== 'email.received') {
      return { ok: true };
    }

    const resendEmailId = event.data?.email_id;
    if (!resendEmailId) return { ok: true };

    // The Message-ID header (when Resend forwards it) is the durable dedupe
    // key — falling back to Resend's own email id keeps every legacy event
    // without one still deduplicated, just scoped to Resend instead of SMTP.
    const messageId: string = event.data?.headers?.['Message-Id'] ?? event.data?.message_id ?? resendEmailId;

    const existing = await this.prisma.emailMessage.findUnique({ where: { messageId } });
    if (existing) {
      this.logger.log(`Correo ${messageId} ya fue recibido antes, se ignora (dedupe)`);
      return { ok: true };
    }

    let record;
    try {
      record = await this.prisma.emailMessage.create({
        data: {
          direction: 'inbound',
          messageId,
          status: 'pending',
          rawPayload: event,
          subject: event.data?.subject,
          fromEmail: event.data?.from,
        },
      });
    } catch (err) {
      // Unique constraint race (two webhook deliveries at once) — safe to
      // no-op, the other request already created the row and enqueued it.
      this.logger.warn(`No se pudo registrar EmailMessage ${messageId} (probable duplicado): ${(err as Error).message}`);
      return { ok: true };
    }

    await this.queue.add(
      'inbound-email',
      { emailMessageId: record.id, resendEmailId },
      { jobId: messageId },
    );

    return { ok: true };
  }
}
