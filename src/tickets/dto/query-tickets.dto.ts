import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

function toArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return Array.isArray(value) ? value : [value as string];
}

export class QueryTicketsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toArray(value))
  status?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toArray(value))
  priority?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toArray(value))
  groupId?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toArray(value))
  assignedToId?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toArray(value))
  categoryId?: string[];

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  pageSize?: number;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'priority', 'status'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
