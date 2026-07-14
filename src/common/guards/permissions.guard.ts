import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, } from '../decorators/permissions.decorator';
import { PermissionKey, ROLE_PERMISSIONS } from '../constants/role-permissions.constant';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionKey[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('No autenticado');
    }
    const granted = ROLE_PERMISSIONS[user.role] ?? [];
    const ok = requiredPermissions.every((p) => granted.includes(p));
    if (!ok) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción');
    }
    return true;
  }
}
