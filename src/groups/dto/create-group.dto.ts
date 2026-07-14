import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  color!: string;

  @IsOptional()
  @IsString()
  leaderId?: string;
}
