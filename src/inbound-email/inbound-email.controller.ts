import { Controller, Post, Req, Headers, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { TicketsService } from '../tickets/tickets.service';
import { MailService } from '../mail/mail.service';
import { ticketReceivedTemplate } from '../mail/templates/templates';

function parseFromHeader(from: string): { email: string; name?: string } {
  const match = from.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1].replace(/"/g, '').trim();
    return { email: match[2].trim(), name: name || undefined };
  }
  return { email: from.trim() };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Controller('webhooks')
export class InboundEmailController {
  private readonly logger = new Logger(InboundEmailController.name);

  constructor(
    private config: ConfigService,
    private ticketsService: TicketsService,
    private mail: MailService,
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

    const emailId = event.data?.email_id;
    if (!emailId) return { ok: true };

    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      this.logger.error(`No se pudo obtener el correo ${emailId} de Resend: ${res.status}`);
      return { ok: false };
    }
    const email = (await res.json()) as { from?: string; subject?: string; text?: string | null; html?: string };

    const fromRaw = email.from ?? event.data.from ?? '';
    const { email: requesterEmail, name: requesterName } = parseFromHeader(fromRaw);
    if (!requesterEmail) {
      this.logger.warn(`Correo entrante ${emailId} sin remitente identificable, se descarta`);
      return { ok: true };
    }

    const subject = email.subject || event.data.subject || '(Sin asunto)';
    const description = email.text?.trim() || (email.html ? stripHtml(email.html) : '') || '(Sin contenido)';

    const ticket = await this.ticketsService.createFromEmail({
      title: subject,
      description,
      requesterEmail,
      requesterName,
    });

    await this.mail.send(
      requesterEmail,
      `Hemos recibido tu solicitud — ${ticket.folio}`,
      ticketReceivedTemplate(ticket.folio, ticket.title),
    );

    return { ok: true };
  }
}
