import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private from: string;

  constructor(private config: ConfigService) {
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

  async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.log(`[no-op email] to=${to} subject="${subject}"`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error(`Error enviando correo a ${to}: ${(err as Error).message}`);
    }
  }
}
