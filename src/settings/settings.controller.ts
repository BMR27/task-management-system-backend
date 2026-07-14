import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.get();
  }

  @Permissions('system_settings')
  @Patch()
  update(@Body() dto: any) {
    return this.settingsService.update(dto);
  }
}
