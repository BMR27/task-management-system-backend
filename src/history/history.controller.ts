import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { HistoryService } from './history.service';

@UseGuards(JwtAuthGuard)
@Controller('history')
export class HistoryController {
  constructor(private historyService: HistoryService) {}

  @Get('recent')
  findRecent(@Query('limit') limit: string | undefined, @CurrentUser() user: AuthUser) {
    const parsed = limit ? parseInt(limit, 10) : undefined;
    const take = parsed && parsed > 0 ? Math.min(parsed, 50) : 10;
    return this.historyService.findRecent(user, take);
  }
}
