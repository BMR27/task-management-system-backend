import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CommentType } from '@prisma/client';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsEnum(CommentType)
  type?: CommentType;
}
