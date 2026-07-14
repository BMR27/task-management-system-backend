import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    ticketId?: string,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, message, ticketId },
    });
  }

  async findByUser(userId: string, page = 1, pageSize = 20) {
    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { ticket: { select: { id: true, folio: true, title: true } } },
      }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } }).then((count) => ({
      count,
    }));
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException();
    }
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { ok: true };
  }
}
