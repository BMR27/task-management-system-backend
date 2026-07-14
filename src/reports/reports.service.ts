import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async dashboardStats() {
    const [total, statusGroups, priorityGroups, groupGroups, resolvedToday, recentActivity, trend] =
      await Promise.all([
        this.prisma.ticket.count(),
        this.prisma.ticket.groupBy({ by: ['status'], _count: true }),
        this.prisma.ticket.groupBy({ by: ['priority'], _count: true }),
        this.prisma.ticket.groupBy({ by: ['groupId'], _count: true }),
        this.prisma.ticket.count({
          where: { resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        }),
        this.prisma.historyEntry.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true } },
            ticket: { select: { id: true, folio: true, title: true } },
          },
        }),
        this.ticketsTrend(14),
      ]);

    const ticketsByStatus: Record<string, number> = { new: 0, in_progress: 0, resolved: 0, closed: 0 };
    for (const g of statusGroups) ticketsByStatus[g.status] = g._count;

    const ticketsByPriority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    for (const g of priorityGroups) ticketsByPriority[g.priority] = g._count;

    const openTickets = ticketsByStatus.new + ticketsByStatus.in_progress;

    const resolvedTickets = await this.prisma.ticket.findMany({
      where: { resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    });
    const avgResolutionTime = this.averageHours(resolvedTickets);

    return {
      totalTickets: total,
      openTickets,
      resolvedToday,
      avgResolutionTime,
      ticketsByStatus,
      ticketsByPriority,
      ticketsByGroup: groupGroups.map((g) => ({ groupId: g.groupId, count: g._count })),
      recentActivity,
      ticketsTrend: trend,
    };
  }

  private averageHours(tickets: { createdAt: Date; resolvedAt: Date | null }[]) {
    if (tickets.length === 0) return 0;
    const totalHours = tickets.reduce((sum, t) => {
      if (!t.resolvedAt) return sum;
      return sum + (t.resolvedAt.getTime() - t.createdAt.getTime()) / 3_600_000;
    }, 0);
    return Math.round((totalHours / tickets.length) * 10) / 10;
  }

  private async ticketsTrend(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const [created, resolved] = await Promise.all([
      this.prisma.ticket.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.ticket.findMany({
        where: { resolvedAt: { gte: since } },
        select: { resolvedAt: true },
      }),
    ]);

    const buckets: Record<string, { created: number; resolved: number }> = {};
    for (let i = 0; i <= days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      buckets[d.toISOString().slice(0, 10)] = { created: 0, resolved: 0 };
    }
    for (const t of created) {
      const key = t.createdAt.toISOString().slice(0, 10);
      if (buckets[key]) buckets[key].created++;
    }
    for (const t of resolved) {
      if (!t.resolvedAt) continue;
      const key = t.resolvedAt.toISOString().slice(0, 10);
      if (buckets[key]) buckets[key].resolved++;
    }
    return Object.entries(buckets).map(([date, v]) => ({ date, ...v }));
  }

  async summary() {
    const tickets = await this.prisma.ticket.findMany({ include: { category: true } });
    const total = tickets.length;
    const open = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length;
    const resolvedTickets = tickets.filter((t) => t.resolvedAt);
    const avgResolutionTime = this.averageHours(resolvedTickets);
    const unassigned = tickets.filter((t) => !t.assignedToId && t.status !== 'closed').length;

    const withinSla = resolvedTickets.filter((t) => {
      const hours = (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 3_600_000;
      return hours <= t.category.slaHours;
    });
    const slaCompliance =
      resolvedTickets.length > 0
        ? Math.round((withinSla.length / resolvedTickets.length) * 1000) / 10
        : 100;

    const atRisk = tickets.filter((t) => {
      if (t.status === 'resolved' || t.status === 'closed') return false;
      const hours = (Date.now() - t.createdAt.getTime()) / 3_600_000;
      return hours > t.category.slaHours * 0.8;
    }).length;

    const sortedByResolutionTime = resolvedTickets
      .map((t) => ({
        folio: t.folio,
        title: t.title,
        hours: (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 3_600_000,
      }))
      .sort((a, b) => a.hours - b.hours);

    return {
      total,
      open,
      avgResolutionTime,
      slaCompliance,
      unassigned,
      atRisk,
      fastest: sortedByResolutionTime[0] ?? null,
      slowest: sortedByResolutionTime[sortedByResolutionTime.length - 1] ?? null,
    };
  }

  async byCategory() {
    const categories = await this.prisma.category.findMany();
    return Promise.all(
      categories.map(async (c) => {
        const tickets = await this.prisma.ticket.findMany({ where: { categoryId: c.id } });
        const resolved = tickets.filter((t) => t.resolvedAt);
        const withinSla = resolved.filter(
          (t) => (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 3_600_000 <= c.slaHours,
        );
        return {
          categoryId: c.id,
          name: c.name,
          slaHours: c.slaHours,
          total: tickets.length,
          resolved: resolved.length,
          slaCompliance: resolved.length > 0 ? Math.round((withinSla.length / resolved.length) * 100) : 100,
        };
      }),
    );
  }

  async byGroup() {
    const groups = await this.prisma.group.findMany();
    return Promise.all(
      groups.map(async (g) => ({
        groupId: g.id,
        name: g.name,
        color: g.color,
        total: await this.prisma.ticket.count({ where: { groupId: g.id } }),
        open: await this.prisma.ticket.count({
          where: { groupId: g.id, status: { notIn: ['resolved', 'closed'] } },
        }),
      })),
    );
  }

  async topAgents(limit = 5) {
    const agents = await this.prisma.user.findMany({
      where: { role: { in: ['agent', 'supervisor', 'admin'] }, isActive: true },
    });
    const withCounts = await Promise.all(
      agents.map(async (a) => {
        const resolved = await this.prisma.ticket.count({
          where: { assignedToId: a.id, status: { in: ['resolved', 'closed'] } },
        });
        const assigned = await this.prisma.ticket.count({ where: { assignedToId: a.id } });
        return { id: a.id, name: a.name, avatar: a.avatar, resolved, assigned };
      }),
    );
    return withCounts.sort((a, b) => b.resolved - a.resolved).slice(0, limit);
  }

  trend(days = 30) {
    return this.ticketsTrend(days);
  }

  async exportCsv() {
    const tickets = await this.prisma.ticket.findMany({
      include: {
        category: true,
        group: true,
        assignedTo: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const header = [
      'Folio',
      'Titulo',
      'Estado',
      'Prioridad',
      'Categoria',
      'Grupo',
      'Asignado',
      'Creado por',
      'Creado',
      'Resuelto',
      'Cerrado',
    ];
    const rows = tickets.map((t) => [
      t.folio,
      t.title.replace(/"/g, "'"),
      t.status,
      t.priority,
      t.category.name,
      t.group.name,
      t.assignedTo?.name ?? '',
      t.createdBy.name,
      t.createdAt.toISOString(),
      t.resolvedAt?.toISOString() ?? '',
      t.closedAt?.toISOString() ?? '',
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    return csv;
  }
}
