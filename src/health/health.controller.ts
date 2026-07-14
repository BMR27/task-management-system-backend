import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Public()
  @Get()
  async check() {
    const smtpConfigured = !!this.config.get<string>('SMTP_HOST');
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok', smtpConfigured };
    } catch {
      return { status: 'error', db: 'unreachable', smtpConfigured };
    }
  }
}
