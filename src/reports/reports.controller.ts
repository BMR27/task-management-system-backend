import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Permissions('view_dashboard')
  @Get('dashboard/stats')
  dashboardStats() {
    return this.reportsService.dashboardStats();
  }

  @Permissions('view_reports')
  @Get('reports/summary')
  summary() {
    return this.reportsService.summary();
  }

  @Permissions('view_reports')
  @Get('reports/by-category')
  byCategory() {
    return this.reportsService.byCategory();
  }

  @Permissions('view_reports')
  @Get('reports/by-group')
  byGroup() {
    return this.reportsService.byGroup();
  }

  @Permissions('view_reports')
  @Get('reports/agents')
  agents() {
    return this.reportsService.topAgents();
  }

  @Permissions('view_reports')
  @Get('reports/trend')
  trend(@Query('days') days?: string) {
    return this.reportsService.trend(days ? parseInt(days, 10) : 30);
  }

  @Permissions('view_reports')
  @Get('reports/export')
  async export(@Res() res: Response) {
    const csv = await this.reportsService.exportCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tickets.csv"');
    res.send(csv);
  }
}
