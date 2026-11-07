import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ShippingType, TicketPriority, TicketStatus } from '@prisma/client';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsString()
  assignedToId?: string | null;

  /** Full replacement of the ticket's collaborator list (people besides the primary assignee with full access). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collaboratorIds?: string[];

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  resolutionComment?: string;

  /** Only valid for tickets in the Operaciones group; locked for agents once set. */
  @IsOptional()
  @IsEnum(ShippingType)
  shippingType?: ShippingType | null;
}
