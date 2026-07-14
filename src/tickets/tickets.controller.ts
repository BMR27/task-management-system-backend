import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { ChangePriorityDto } from './dto/change-priority.dto';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tickets')
export class TicketsController {
  constructor(
    private ticketsService: TicketsService,
    private prisma: PrismaService,
  ) {}

  @Get('count')
  async count(@CurrentUser() user: AuthUser) {
    const where: any = { status: { in: ['new', 'in_progress'] } };
    if (user.role === 'user') where.createdById = user.id;
    const count = await this.prisma.ticket.count({ where });
    return { count };
  }

  @Get()
  findAll(@Query() query: QueryTicketsDto, @CurrentUser() user: AuthUser) {
    return this.ticketsService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ticketsService.findOne(id, user);
  }

  @Permissions('create_ticket')
  @Post()
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: AuthUser) {
    return this.ticketsService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto, @CurrentUser() user: AuthUser) {
    return this.ticketsService.update(id, dto, user);
  }

  @Permissions('assign_ticket')
  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignTicketDto, @CurrentUser() user: AuthUser) {
    return this.ticketsService.assign(id, dto.userId ?? null, user);
  }

  @Permissions('change_status')
  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketsService.changeStatus(id, dto.status, user);
  }

  @Permissions('change_status')
  @Patch(':id/priority')
  changePriority(
    @Param('id') id: string,
    @Body() dto: ChangePriorityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketsService.changePriority(id, dto.priority, user);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ticketsService.getHistory(id, user);
  }

  @Permissions('delete_ticket')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(id);
  }
}
