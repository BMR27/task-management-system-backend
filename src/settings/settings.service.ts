import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_GENERAL = {
  systemName: 'NEXT OS Help Desk',
  companyName: 'Mi Empresa',
  defaultLanguage: 'es',
  timezone: 'America/Mexico_City',
  ticketPrefix: 'TK',
  autoAssign: false,
  allowSelfAssign: true,
};

const DEFAULT_SECURITY = {
  sessionTimeout: 60,
  requireMfa: false,
  passwordExpiry: 0,
  minPasswordLength: 6,
  allowPasswordReset: true,
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const settings = await this.prisma.settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        general: DEFAULT_GENERAL,
        security: DEFAULT_SECURITY,
      },
      update: {},
    });
    return settings;
  }

  async update(dto: {
    emailOnNewTicket?: boolean;
    emailOnAssignment?: boolean;
    emailOnStatusChange?: boolean;
    emailOnComment?: boolean;
    digestFrequency?: 'none' | 'daily' | 'weekly';
    general?: Record<string, unknown>;
    security?: Record<string, unknown>;
  }) {
    const current = await this.get();
    return this.prisma.settings.update({
      where: { id: 1 },
      data: {
        emailOnNewTicket: dto.emailOnNewTicket,
        emailOnAssignment: dto.emailOnAssignment,
        emailOnStatusChange: dto.emailOnStatusChange,
        emailOnComment: dto.emailOnComment,
        digestFrequency: dto.digestFrequency,
        general: dto.general
          ? ({ ...(current.general as object), ...dto.general } as any)
          : undefined,
        security: dto.security
          ? ({ ...(current.security as object), ...dto.security } as any)
          : undefined,
      },
    });
  }
}
