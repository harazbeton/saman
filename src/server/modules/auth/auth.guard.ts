import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY, IS_ADMIN_KEY } from './roles.decorator';
import { verifyToken } from '../../auth';
import { userRepository } from '../../repositories/user.repository';

function normalizeRoleOrPanel(val: string): string {
  const lower = (val || '').toLowerCase().trim();
  if (lower === 'receptionist' || lower === 'reception') {
    return 'reception';
  }
  return lower;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(@Optional() reflector?: Reflector) {
    this.reflector = reflector || new Reflector();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector
      ? this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
          context.getHandler(),
          context.getClass(),
        ])
      : false;

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const path = request.url || request.path || '';

    // Pass public routes
    if (path.startsWith('/api/health') || path.startsWith('/api/login')) {
      return true;
    }

    // Non-API routes pass through
    if (!path.startsWith('/api/')) {
      return true;
    }

    const authHeader = request.headers['authorization'] || request.headers['Authorization'];
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new HttpException(
        { error: 'Unauthorized: Missing token' },
        HttpStatus.UNAUTHORIZED
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      throw new HttpException(
        { error: 'Unauthorized: Invalid or expired token' },
        HttpStatus.UNAUTHORIZED
      );
    }

    // Load fresh user data from DB if available to reflect panel overrides immediately
    let effectiveUser = { ...decoded };
    if (decoded.userId) {
      const dbUser = await userRepository.findById(decoded.userId);
      if (dbUser) {
        effectiveUser.role = dbUser.role;
        effectiveUser.isAdmin = Boolean(dbUser.isAdmin);
        effectiveUser.visiblePanels = dbUser.visiblePanels;
      }
    }

    request.user = effectiveUser;

    // 1. Explicit Admin Check (Gated ONLY by isAdmin, NEVER by visiblePanels)
    const requireAdmin = this.reflector
      ? this.reflector.getAllAndOverride<boolean>(IS_ADMIN_KEY, [
          context.getHandler(),
          context.getClass(),
        ])
      : false;

    if (requireAdmin) {
      if (!effectiveUser.isAdmin) {
        throw new HttpException(
          { error: 'Forbidden: Admin privileges required' },
          HttpStatus.FORBIDDEN
        );
      }
      return true;
    }

    // 2. Panel / Role Authorization Check
    const requiredRoles = this.reflector
      ? this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
          context.getHandler(),
          context.getClass(),
        ])
      : null;

    if (requiredRoles && requiredRoles.length > 0) {
      // If the ONLY required role is 'admin', enforce isAdmin
      if (requiredRoles.length === 1 && requiredRoles[0] === 'admin') {
        if (!effectiveUser.isAdmin) {
          throw new HttpException(
            { error: 'Forbidden: Admin access required' },
            HttpStatus.FORBIDDEN
          );
        }
        return true;
      }

      // If user is Admin, they have super-user access to all operational role endpoints
      if (effectiveUser.isAdmin) {
        return true;
      }

      const normalizedRequired = requiredRoles.map(normalizeRoleOrPanel);
      const normalizedBaseRole = normalizeRoleOrPanel(effectiveUser.role);

      // Match base role
      const matchesBaseRole = normalizedRequired.includes(normalizedBaseRole);

      // Match visiblePanels override array
      const matchesVisiblePanels =
        Array.isArray(effectiveUser.visiblePanels) &&
        effectiveUser.visiblePanels.some((panel: string) =>
          normalizedRequired.includes(normalizeRoleOrPanel(panel))
        );

      if (!matchesBaseRole && !matchesVisiblePanels) {
        throw new HttpException(
          {
            error: 'Forbidden: Insufficient panel access permissions',
            requiredRoles,
            userRole: effectiveUser.role,
            visiblePanels: effectiveUser.visiblePanels || null,
          },
          HttpStatus.FORBIDDEN
        );
      }
    }

    return true;
  }
}
