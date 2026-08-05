import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

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

  @IsOptional()
  @IsString()
  defaultAssigneeId?: string | null;

  @IsOptional()
  @IsIn(PRIORITIES)
  defaultPriority?: (typeof PRIORITIES)[number] | null;
}
