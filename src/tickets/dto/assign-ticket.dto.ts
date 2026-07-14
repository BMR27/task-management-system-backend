import { IsOptional, IsString } from 'class-validator';

export class AssignTicketDto {
  @IsOptional()
  @IsString()
  userId?: string | null;
}
