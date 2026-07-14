import { IsEnum } from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class ChangePriorityDto {
  @IsEnum(TicketPriority)
  priority!: TicketPriority;
}
