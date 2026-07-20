import { Controller, Get, Post, Param, Query, NotFoundException, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_INBOUND_QUEUE } from './email-processing.constants';
import { EmailInboundJobData } from './email.processor';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('email-messages')
export class EmailProcessingController {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(EMAIL_INBOUND_QUEUE) private queue: Queue<EmailInboundJobData>,
  ) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.prisma.emailMessage.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { receivedAt: 'desc' },
      take: 200,
    });
  }

  @Post(':id/reprocess')
  async reprocess(@Param('id') id: string) {
    const record = await this.prisma.emailMessage.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Correo no encontrado');
    if (record.direction !== 'inbound') {
      throw new BadRequestException('Solo se pueden reprocesar correos entrantes');
    }
    const resendEmailId = (record.rawPayload as any)?.data?.email_id;
    if (!resendEmailId) {
      throw new BadRequestException('No se encontró el identificador de Resend en el payload original');
    }
    await this.prisma.emailMessage.update({ where: { id }, data: { status: 'pending', errorMessage: null } });
    await this.queue.add(
      'inbound-email',
      { emailMessageId: record.id, resendEmailId },
      { jobId: `${record.messageId}:retry:${Date.now()}` },
    );
    return { ok: true };
  }
}
