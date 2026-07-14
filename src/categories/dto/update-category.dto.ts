import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  slaHours?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
