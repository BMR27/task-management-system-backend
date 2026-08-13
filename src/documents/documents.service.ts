import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

const DOCUMENT_INCLUDE = {
  group: { select: { id: true, name: true, color: true } },
  uploadedBy: { select: { id: true, name: true } },
} satisfies Prisma.DocumentInclude;

@Injectable()
export class DocumentsService {
  private readonly uploadsDir = process.env.UPLOADS_DIR ?? './uploads';

  constructor(private prisma: PrismaService) {}

  /**
   * Own group is always viewable; any group with an explicit
   * documentPermissions row (view OR manage) is viewable too. Admins see
   * everything (optionally filtered).
   */
  findAll(user: AuthUser, groupId?: string) {
    const where: Prisma.DocumentWhereInput = {};
    if (user.role === 'admin') {
      if (groupId) where.groupId = groupId;
    } else {
      const viewableGroupIds = [user.groupId, ...user.documentPermissions.map((p) => p.groupId)].filter(
        (id): id is string => !!id,
      );
      if (!viewableGroupIds.length) return [];
      where.groupId = { in: viewableGroupIds };
    }

    return this.prisma.document.findMany({
      where,
      include: DOCUMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin can manage documents for any group; a supervisor for their own
   * group by default; anyone (any role) with an explicit 'manage' row for
   * that group in documentPermissions.
   */
  private assertManageScope(user: AuthUser, targetGroupId: string) {
    if (user.role === 'admin') return;
    if (user.role === 'supervisor' && user.groupId === targetGroupId) return;
    if (user.documentPermissions.some((p) => p.groupId === targetGroupId && p.level === 'manage')) return;
    throw new ForbiddenException('No tienes permiso para gestionar documentos de este grupo');
  }

  async create(dto: CreateDocumentDto, file: Express.Multer.File, user: AuthUser) {
    this.assertManageScope(user, dto.groupId);
    return this.prisma.document.create({
      data: {
        name: dto.name,
        description: dto.description,
        url: `/uploads/${file.filename}`,
        size: file.size,
        type: file.mimetype,
        groupId: dto.groupId,
        uploadedById: user.id,
      },
      include: DOCUMENT_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateDocumentDto, file: Express.Multer.File | undefined, user: AuthUser) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Documento no encontrado');
    }
    this.assertManageScope(user, existing.groupId);
    if (dto.groupId && dto.groupId !== existing.groupId) {
      this.assertManageScope(user, dto.groupId);
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        groupId: dto.groupId,
        ...(file ? { url: `/uploads/${file.filename}`, size: file.size, type: file.mimetype } : {}),
      },
      include: DOCUMENT_INCLUDE,
    });

    if (file) {
      await this.unlinkQuietly(existing.url);
    }

    return updated;
  }

  async remove(id: string, user: AuthUser) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Documento no encontrado');
    }
    this.assertManageScope(user, existing.groupId);
    await this.prisma.document.delete({ where: { id } });
    await this.unlinkQuietly(existing.url);
    return { ok: true };
  }

  private async unlinkQuietly(url: string) {
    await unlink(join(this.uploadsDir, url.replace(/^\/uploads\//, ''))).catch(() => {
      // File already missing/inaccessible — the DB row is gone/updated either way.
    });
  }
}
