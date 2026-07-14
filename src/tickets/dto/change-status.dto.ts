import { IsEnum } from 'class-validator';
import { TicketStatus } from '@prisma/client';

export class ChangeStatusDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
