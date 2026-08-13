import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentPermissionLevel, UserRole } from '@prisma/client';

class DocumentPermissionInputDto {
  @IsString()
  @MinLength(1)
  groupId!: string;

  @IsEnum(DocumentPermissionLevel)
  level!: DocumentPermissionLevel;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  groupId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentPermissionInputDto)
  documentPermissions?: DocumentPermissionInputDto[];
}
