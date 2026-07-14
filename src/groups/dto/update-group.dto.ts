import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  leaderId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
