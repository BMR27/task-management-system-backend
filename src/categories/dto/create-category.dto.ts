import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsString()
  groupId!: string;

  @IsInt()
  @Min(1)
  slaHours!: number;

  @IsOptional()
  @IsString()
  defaultAssigneeId?: string | null;

  @IsOptional()
  @IsIn(PRIORITIES)
  defaultPriority?: (typeof PRIORITIES)[number] | null;
}
