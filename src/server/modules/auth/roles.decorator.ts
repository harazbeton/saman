import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const IS_ADMIN_KEY = 'requireAdmin';
export const RequireAdmin = () => SetMetadata(IS_ADMIN_KEY, true);
