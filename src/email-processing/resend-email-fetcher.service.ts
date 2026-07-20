import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FetchedEmailAttachment {
  filename: string;
  contentType: string;
  buffer: Buffer;
}

export interface FetchedEmail {
  messageId: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  text?: string;
  html?: string;
  headers: Record<string, string>;
  inReplyTo?: string;
  references: string[];
  attachments: FetchedEmailAttachment[];
}

function parseFromHeader(from: string): { email: string; name?: string } {
  const match = from.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1].replace(/"/g, '').trim();
    return { email: match[2].trim(), name: name || undefined };
  }
  return { email: from.trim() };
}

/**
 * Wraps Resend's "get inbound email" REST call. The exact attachment/header
 * field names below follow Resend's documented inbound-email payload as of
 * this writing; if their API evolves, this is the single place to adjust —
 * everything downstream works off the normalized `FetchedEmail` shape.
 */
@Injectable()
export class ResendEmailFetcherService {
  private readonly logger = new Logger(ResendEmailFetcherService.name);

  constructor(private config: ConfigService) {}

  async fetch(emailId: string): Promise<FetchedEmail | null> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      this.logger.error(`No se pudo obtener el correo ${emailId} de Resend: ${res.status}`);
      return null;
    }
    const email = (await res.json()) as Record<string, any>;

    const fromRaw: string = email.from ?? '';
    const { email: fromEmail, name: fromName } = parseFromHeader(fromRaw);

    const headers: Record<string, string> = {};
    for (const h of email.headers ?? []) {
      if (h?.name && h?.value) headers[h.name] = h.value;
    }

    const messageId: string = email.message_id ?? headers['Message-Id'] ?? headers['Message-ID'] ?? emailId;
    const inReplyTo: string | undefined = email.in_reply_to ?? headers['In-Reply-To'] ?? undefined;
    const referencesRaw: string = email.references ?? headers['References'] ?? '';
    const references = referencesRaw
      .split(/\s+/)
      .map((r: string) => r.trim())
      .filter(Boolean);

    const attachments: FetchedEmailAttachment[] = [];
    for (const att of email.attachments ?? []) {
      try {
        const filename = att.filename ?? att.name ?? 'adjunto';
        const contentType = att.content_type ?? att.contentType ?? att.type ?? 'application/octet-stream';
        const buffer = att.content
          ? Buffer.from(att.content, 'base64')
          : att.url
            ? await this.downloadAttachment(att.url)
            : null;
        if (buffer) attachments.push({ filename, contentType, buffer });
      } catch (err) {
        this.logger.warn(`No se pudo procesar un adjunto del correo ${emailId}: ${(err as Error).message}`);
      }
    }

    return {
      messageId,
      fromEmail,
      fromName,
      subject: email.subject ?? '(Sin asunto)',
      text: email.text ?? undefined,
      html: email.html ?? undefined,
      headers,
      inReplyTo,
      references,
      attachments,
    };
  }

  private async downloadAttachment(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo descargar adjunto: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
}
