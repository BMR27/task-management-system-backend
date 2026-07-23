import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  groupId: true,
  avatar: true,
  isActive: true,
  createdAt: true,
  lastLogin: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string) {
    return this.prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        phone: dto.phone || null,
        role: dto.role ?? 'user',
        groupId: dto.groupId || null,
        isActive: true,
        mustChangePassword: true,
      },
      select: SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        role: dto.role,
        groupId: dto.groupId === undefined ? undefined : dto.groupId || null,
        isActive: dto.isActive,
        avatar: dto.avatar,
      },
      select: SAFE_SELECT,
    });
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    await this.findOne(id);
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
      select: SAFE_SELECT,
    });
  }

  async toggleActive(id: string) {
    const user = await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: SAFE_SELECT,
    });
  }

  async remove(id: string, currentUserId: string) {
    await this.findOne(id);
    if (id === currentUserId) {
      throw new ConflictException('No puedes eliminar tu propia cuenta');
    }
    const [createdTickets, comments, historyEntries] = await Promise.all([
      this.prisma.ticket.count({ where: { createdById: id } }),
      this.prisma.comment.count({ where: { userId: id } }),
      this.prisma.historyEntry.count({ where: { userId: id } }),
    ]);
    if (createdTickets > 0 || comments > 0 || historyEntries > 0) {
      throw new ConflictException(
        'No se puede eliminar: el usuario tiene tickets, comentarios o historial asociados. Desactívalo en su lugar.',
      );
    }
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }
}
