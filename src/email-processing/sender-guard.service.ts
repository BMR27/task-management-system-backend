import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SenderGuardService {
  constructor(private prisma: PrismaService) {}

  async isBlocked(fromEmail: string): Promise<boolean> {
    const config = await this.prisma.emailIngestConfig.findUnique({ where: { id: 1 } });
    if (!config) return false;
    const email = fromEmail.toLowerCase();
    const domain = email.split('@')[1];
    return config.senderBlocklist.some((entry) => {
      const blocked = entry.toLowerCase();
      return blocked === email || blocked === domain;
    });
  }

  async isRateLimited(fromEmail: string): Promise<boolean> {
    const config = await this.prisma.emailIngestConfig.findUnique({ where: { id: 1 } });
    const limit = config?.maxTicketsPerSenderPerHour ?? 20;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.prisma.emailMessage.count({
      where: { direction: 'inbound', fromEmail, receivedAt: { gte: oneHourAgo } },
    });
    return count >= limit;
  }
}
