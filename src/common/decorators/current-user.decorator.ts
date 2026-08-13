import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'supervisor' | 'agent' | 'user';
  groupId: string | null;
  /** Explicit per-group Documents-module grants beyond the role defaults. */
  documentPermissions: { groupId: string; level: 'view' | 'manage' }[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
