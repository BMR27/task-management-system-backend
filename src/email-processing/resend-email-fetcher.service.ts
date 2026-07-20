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

    // Resend returns `headers` as a flat { headerName: value } map, not a list.
    const headers: Record<string, string> = email.headers ?? {};

    const messageId: string = email.message_id ?? headers['message-id'] ?? emailId;
    const inReplyTo: string | undefined = email.in_reply_to ?? headers['in-reply-to'] ?? undefined;
    const referencesRaw: string = email.references ?? headers['references'] ?? '';
    const references = referencesRaw
      .split(/\s+/)
      .map((r: string) => r.trim())
      .filter(Boolean);

    const attachments: FetchedEmailAttachment[] = [];
    for (const att of email.attachments ?? []) {
      try {
        const filename = att.filename ?? att.name ?? 'adjunto';
        const contentType = att.content_type ?? att.contentType ?? att.type ?? 'application/octet-stream';
        // Resend's email payload only lists attachment metadata — the actual
        // bytes come from a signed download_url obtained via a per-attachment call.
        const buffer = await this.downloadAttachmentContent(emailId, att.id);
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

  private async downloadAttachmentContent(emailId: string, attachmentId: string): Promise<Buffer | null> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const metaRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments/${attachmentId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!metaRes.ok) {
      throw new Error(`No se pudo obtener metadata del adjunto ${attachmentId}: ${metaRes.status}`);
    }
    const meta = (await metaRes.json()) as { download_url?: string };
    if (!meta.download_url) return null;

    const fileRes = await fetch(meta.download_url);
    if (!fileRes.ok) throw new Error(`No se pudo descargar adjunto: ${fileRes.status}`);
    return Buffer.from(await fileRes.arrayBuffer());
  }
}
