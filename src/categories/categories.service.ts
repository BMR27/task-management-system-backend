import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string) {
    const categories = await this.prisma.category.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { name: 'asc' },
    });
    const withCounts = await Promise.all(
      categories.map(async (c) => ({
        ...c,
        ticketCount: await this.prisma.ticket.count({ where: { categoryId: c.id } }),
      })),
    );
    return withCounts;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return category;
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        icon: dto.icon ?? 'folder',
        groupId: dto.groupId,
        slaHours: dto.slaHours,
        isActive: true,
        defaultAssigneeId: dto.defaultAssigneeId || null,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        groupId: dto.groupId,
        slaHours: dto.slaHours,
        isActive: dto.isActive,
        defaultAssigneeId: dto.defaultAssigneeId !== undefined ? dto.defaultAssigneeId || null : undefined,
      },
    });
  }
}
