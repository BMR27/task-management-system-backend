import { UserRole } from '@prisma/client';

export type PermissionKey =
  | 'view_dashboard'
  | 'create_ticket'
  | 'view_all_tickets'
  | 'assign_ticket'
  | 'change_status'
  | 'internal_comment'
  | 'manage_users'
  | 'manage_groups'
  | 'manage_categories'
  | 'view_reports'
  | 'system_settings';

// Port 1:1 of ROLE_PERMISSIONS from frontend lib/types.ts — single source of truth server-side.
export const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  admin: [
    'view_dashboard',
    'create_ticket',
    'view_all_tickets',
    'assign_ticket',
    'change_status',
    'internal_comment',
    'manage_users',
    'manage_groups',
    'manage_categories',
    'view_reports',
    'system_settings',
  ],
  supervisor: [
    'view_dashboard',
    'create_ticket',
    'view_all_tickets',
    'assign_ticket',
    'change_status',
    'internal_comment',
    'manage_users',
    'manage_groups',
    'manage_categories',
    'view_reports',
  ],
  agent: [
    'view_dashboard',
    'create_ticket',
    'view_all_tickets',
    'assign_ticket',
    'change_status',
    'internal_comment',
    'view_reports',
  ],
  user: ['view_dashboard', 'create_ticket'],
};

export function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const STAFF_ROLES: UserRole[] = ['admin', 'supervisor', 'agent'];
