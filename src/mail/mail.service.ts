import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private from: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.from = this.config.get<string>('SMTP_FROM') ?? 'no-reply@nextos.local';
  }

  onModuleInit() {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn(
        'SMTP_HOST no configurado: MailService operará en modo no-op (los correos solo se registrarán en el log).',
      );
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
      secure: Number(this.config.get<string>('SMTP_PORT') ?? 587) === 465,
      auth: this.config.get<string>('SMTP_USER')
        ? {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASS'),
          }
        : undefined,
    });
  }

  /**
   * `options.ticketId`, when provided, makes the send threadable: a
   * Message-ID is generated and persisted as an outbound EmailMessage so
   * that a later reply (matched by In-Reply-To/References in
   * ThreadMatcherService) can be routed back to this exact ticket.
   */
  async send(to: string, subject: string, html: string, options?: { ticketId?: string }) {
    const messageId = options?.ticketId ? this.generateMessageId() : undefined;

    if (!this.transporter) {
      this.logger.log(`[no-op email] to=${to} subject="${subject}"`);
    } else {
      try {
        await this.transporter.sendMail({ from: this.from, to, subject, html, messageId });
      } catch (err) {
        this.logger.error(`Error enviando correo a ${to}: ${(err as Error).message}`);
      }
    }

    if (options?.ticketId && messageId) {
      await this.prisma.emailMessage
        .create({
          data: {
            direction: 'outbound',
            messageId,
            ticketId: options.ticketId,
            fromEmail: this.from,
            subject,
            status: 'processed',
          },
        })
        .catch((err) =>
          this.logger.warn(`No se pudo registrar el EmailMessage saliente: ${(err as Error).message}`),
        );
    }
  }

  private generateMessageId(): string {
    const domain = this.config.get<string>('MAIL_DOMAIN') ?? 'nextoshelpdesk.com.mx';
    return `<${randomUUID()}@${domain}>`;
  }
}
