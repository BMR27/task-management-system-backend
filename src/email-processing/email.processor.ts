import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { CommentsService } from '../comments/comments.service';
import { MailService } from '../mail/mail.service';
import { AttachmentsService, InboundAttachmentFile } from '../attachments/attachments.service';
import { ResendEmailFetcherService } from './resend-email-fetcher.service';
import { ThreadMatcherService } from './thread-matcher.service';
import { ClassificationRulesService } from './classification-rules.service';
import { SenderGuardService } from './sender-guard.service';
import { isAutomatedEmail } from './automated-email-detector';
import { extractPlainTextBody } from './email-html.util';
import { isAllowedAttachmentMimeType } from '../attachments/attachment-validation.util';
import { ticketReceivedTemplate } from '../mail/templates/templates';
import { EMAIL_INBOUND_QUEUE } from './email-processing.constants';

export interface EmailInboundJobData {
  emailMessageId: string;
  resendEmailId: string;
}

@Processor(EMAIL_INBOUND_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private prisma: PrismaService,
    private tickets: TicketsService,
    private comments: CommentsService,
    private mail: MailService,
    private attachments: AttachmentsService,
    private fetcher: ResendEmailFetcherService,
    private threadMatcher: ThreadMatcherService,
    private classifier: ClassificationRulesService,
    private senderGuard: SenderGuardService,
  ) {
    super();
  }

  async process(job: Job<EmailInboundJobData>): Promise<void> {
    const { emailMessageId, resendEmailId } = job.data;
    const record = await this.prisma.emailMessage.findUnique({ where: { id: emailMessageId } });
    if (!record) {
      this.logger.warn(`EmailMessage ${emailMessageId} no existe, se descarta el job`);
      return;
    }

    await this.prisma.emailMessage.update({ where: { id: emailMessageId }, data: { status: 'processing' } });

    try {
      await this.processEmail(emailMessageId, resendEmailId);
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Error procesando correo entrante ${emailMessageId}: ${message}`);
      await this.prisma.emailMessage.update({
        where: { id: emailMessageId },
        data: { status: 'failed', errorMessage: message, retryCount: { increment: 1 } },
      });
      throw err; // let BullMQ retry with backoff
    }
  }

  private async processEmail(emailMessageId: string, resendEmailId: string): Promise<void> {
    const email = await this.fetcher.fetch(resendEmailId);
    if (!email) {
      throw new Error(`No se pudo obtener el contenido del correo ${resendEmailId} desde Resend`);
    }

    await this.prisma.emailMessage.update({
      where: { id: emailMessageId },
      data: {
        fromEmail: email.fromEmail,
        fromName: email.fromName,
        subject: email.subject,
        inReplyTo: email.inReplyTo,
        references: email.references,
      },
    });

    if (!email.fromEmail) {
      await this.markSkipped(emailMessageId, 'Sin remitente identificable');
      return;
    }

    if (isAutomatedEmail({ fromEmail: email.fromEmail, subject: email.subject, headers: email.headers })) {
      await this.markSkipped(emailMessageId, 'Correo automático/rebote/fuera de oficina detectado');
      return;
    }

    if (await this.senderGuard.isBlocked(email.fromEmail)) {
      await this.markSkipped(emailMessageId, `Remitente bloqueado: ${email.fromEmail}`);
      return;
    }

    if (await this.senderGuard.isRateLimited(email.fromEmail)) {
      await this.markSkipped(emailMessageId, `Límite de correos por remitente excedido: ${email.fromEmail}`);
      return;
    }

    const body = extractPlainTextBody(email);
    const config = await this.prisma.emailIngestConfig.findUnique({ where: { id: 1 } });
    const maxAttachments = config?.maxAttachmentsPerEmail ?? 5;
    const maxSizeBytes = (config?.maxAttachmentSizeMb ?? 10) * 1024 * 1024;

    const validAttachments: InboundAttachmentFile[] = email.attachments
      .filter((att) => isAllowedAttachmentMimeType(att.contentType) && att.buffer.length <= maxSizeBytes)
      .slice(0, maxAttachments)
      .map((att) => ({ name: att.filename, mimeType: att.contentType, buffer: att.buffer }));

    const existingTicket = await this.threadMatcher.findTicketForReply({
      subject: email.subject,
      inReplyTo: email.inReplyTo,
      references: email.references,
    });

    const systemUser = await this.tickets.getSystemUser();

    if (existingTicket) {
      const comment = await this.comments.createFromEmail(existingTicket.id, body, systemUser.id);
      await this.attachments.createForCommentFromInboundFiles(comment.id, validAttachments);

      if (existingTicket.status === 'resolved' || existingTicket.status === 'closed') {
        await this.tickets.changeStatus(existingTicket.id, 'in_progress', {
          id: systemUser.id,
          email: systemUser.email,
          role: 'admin',
          groupId: null,
        });
      }

      await this.prisma.emailMessage.update({
        where: { id: emailMessageId },
        data: { status: 'processed', ticketId: existingTicket.id, commentId: comment.id },
      });
      return;
    }

    const classification = await this.classifier.classify({
      subject: email.subject,
      body,
      fromEmail: email.fromEmail,
    });

    const ticket = await this.tickets.createFromEmail({
      title: email.subject,
      description: body,
      requesterEmail: email.fromEmail,
      requesterName: email.fromName,
      categoryId: classification.categoryId,
      groupId: classification.groupId,
      priority: classification.priority,
    });
    await this.attachments.createForTicketFromInboundFiles(ticket.id, validAttachments);

    await this.mail.send(
      email.fromEmail,
      `Hemos recibido tu solicitud — ${ticket.folio}`,
      ticketReceivedTemplate(ticket.folio, ticket.title, ticket.group?.name),
      { ticketId: ticket.id },
    );

    await this.prisma.emailMessage.update({
      where: { id: emailMessageId },
      data: { status: 'processed', ticketId: ticket.id },
    });
  }

  private async markSkipped(emailMessageId: string, reason: string) {
    this.logger.log(`Correo ${emailMessageId} omitido: ${reason}`);
    await this.prisma.emailMessage.update({
      where: { id: emailMessageId },
      data: { status: 'skipped', errorMessage: reason },
    });
  }
}
