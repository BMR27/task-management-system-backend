import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  private async withCounts(groups: any[]) {
    return Promise.all(
      groups.map(async (g) => {
        const [memberCount, openTicketCount] = await Promise.all([
          this.prisma.user.count({ where: { groupId: g.id, isActive: true } }),
          this.prisma.ticket.count({
            where: { groupId: g.id, status: { notIn: ['closed'] } },
          }),
        ]);
        return { ...g, memberCount, openTicketCount };
      }),
    );
  }

  async findAll() {
    const groups = await this.prisma.group.findMany({ orderBy: { createdAt: 'asc' } });
    return this.withCounts(groups);
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }
    return (await this.withCounts([group]))[0];
  }

  create(dto: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        color: dto.color,
        leaderId: dto.leaderId || null,
        isActive: true,
      },
    });
  }

  async update(id: string, dto: UpdateGroupDto) {
    await this.findOne(id);
    return this.prisma.group.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        leaderId: dto.leaderId === undefined ? undefined : dto.leaderId || null,
        isActive: dto.isActive,
      },
    });
  }
}
