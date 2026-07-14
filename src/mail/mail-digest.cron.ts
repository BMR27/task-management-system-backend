import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { SettingsService } from '../settings/settings.service';
import { digestTemplate } from './templates/templates';

@Injectable()
export class MailDigestCron {
  private readonly logger = new Logger(MailDigestCron.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private settings: SettingsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async dailyDigest() {
    const settings = await this.settings.get();
    if (settings.digestFrequency !== 'daily') return;
    await this.sendDigest(24);
  }

  @Cron('0 7 * * 1')
  async weeklyDigest() {
    const settings = await this.settings.get();
    if (settings.digestFrequency !== 'weekly') return;
    await this.sendDigest(24 * 7);
  }

  private async sendDigest(sinceHours: number) {
    const since = new Date(Date.now() - sinceHours * 3_600_000);
    const notifications = await this.prisma.notification.findMany({
      where: { createdAt: { gte: since } },
      include: { user: { select: { id: true, email: true } } },
    });
    const byUser = new Map<string, { email: string; items: { title: string; message: string }[] }>();
    for (const n of notifications) {
      if (!byUser.has(n.userId)) {
        byUser.set(n.userId, { email: n.user.email, items: [] });
      }
      byUser.get(n.userId)!.items.push({ title: n.title, message: n.message });
    }
    for (const [, { email, items }] of byUser) {
      if (items.length === 0) continue;
      await this.mail.send(email, 'Resumen de notificaciones — NEXT OS Help Desk', digestTemplate(items));
    }
    this.logger.log(`Digest enviado a ${byUser.size} usuarios`);
  }
}
