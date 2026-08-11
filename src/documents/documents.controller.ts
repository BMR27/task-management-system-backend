import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { attachmentsMulterOptions } from '../attachments/attachments.multer';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

// Write access isn't a plain per-role permission: admin can manage any
// group, a supervisor only their own group, and an individual agent can be
// granted the same group-scoped access via `canManageDocuments`. That mix
// can't be expressed by PermissionsGuard, so DocumentsService.assertManageScope
// does the actual authorization for create/update/remove below.
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('groupId') groupId?: string) {
    return this.documentsService.findAll(user, groupId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', attachmentsMulterOptions))
  create(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    return this.documentsService.create(dto, file, user);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('file', attachmentsMulterOptions))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.update(id, dto, file, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.remove(id, user);
  }
}
