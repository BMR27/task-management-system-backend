import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'supervisor' | 'agent' | 'user';
  groupId: string | null;
  canManageDocuments: boolean;
  /** Extra groups (beyond `groupId`) this user can view documents for. */
  documentViewGroupIds: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
