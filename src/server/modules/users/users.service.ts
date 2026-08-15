import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { userRepository, UserRecord } from '../../repositories/user.repository';
import { generateToken } from '../../auth';
import { auditLogRepository } from '../../repositories/audit-log.repository';

@Injectable()
export class UsersService {
  async findAll(): Promise<Omit<UserRecord, 'password'>[]> {
    const users = await userRepository.findAll();
    return users.map(({ password, ...rest }) => rest);
  }

  async findById(id: string): Promise<Omit<UserRecord, 'password'> | null> {
    const user = await userRepository.findById(id);
    if (!user) return null;
    const { password, ...rest } = user;
    return rest;
  }

  async updateVisiblePanels(
    id: string,
    visiblePanels: string[] | null,
    isAdmin?: boolean,
    adminUser?: any
  ): Promise<Omit<UserRecord, 'password'>> {
    const updated = await userRepository.updateVisiblePanels(id, visiblePanels, isAdmin);
    if (!updated) {
      throw new HttpException({ error: 'User not found' }, HttpStatus.NOT_FOUND);
    }

    // Record Audit Log for panel access change
    await auditLogRepository.save({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: adminUser?.userId || 'admin',
      userName: adminUser?.name || 'مدیر سیستم',
      userRole: 'admin',
      action: 'UPDATE_USER_PANEL_PERMISSIONS',
      resourceType: 'User',
      resourceId: id,
      details: {
        targetUserId: id,
        newVisiblePanels: visiblePanels,
        newIsAdmin: isAdmin,
      },
      timestamp: new Date().toISOString(),
    });

    const { password, ...rest } = updated;
    return rest;
  }

  async loginAs(targetUserId: string, requestingUser?: any) {
    // (ب) Strict Environment Check: Disable in Production completely
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException(
        { error: 'Impersonation / login-as is disabled in production environment.' },
        HttpStatus.FORBIDDEN
      );
    }

    // Require Admin context
    if (!requestingUser?.isAdmin) {
      throw new HttpException(
        { error: 'Forbidden: Impersonation requires admin privileges.' },
        HttpStatus.FORBIDDEN
      );
    }

    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new HttpException({ error: 'Target user not found' }, HttpStatus.NOT_FOUND);
    }

    // (الف) Audit Logging with Real Admin Identity
    await auditLogRepository.save({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: requestingUser.userId || 'admin',
      userName: requestingUser.name || 'مدیر سیستم',
      userRole: 'admin',
      action: 'USER_IMPERSONATION_LOGIN_AS',
      resourceType: 'User',
      resourceId: targetUserId,
      details: {
        impersonatorId: requestingUser.userId,
        impersonatorName: requestingUser.name,
        targetUserId: targetUser.id,
        targetUserName: targetUser.name,
        targetRole: targetUser.role,
        targetVisiblePanels: targetUser.visiblePanels,
        environment: process.env.NODE_ENV || 'development',
      },
      timestamp: new Date().toISOString(),
    });

    const token = generateToken({
      userId: targetUser.id,
      user: targetUser.email,
      role: targetUser.role,
      isAdmin: targetUser.isAdmin,
      visiblePanels: targetUser.visiblePanels,
      impersonatedBy: requestingUser.userId,
      issuedAt: new Date().toISOString(),
    });

    return {
      status: 'success',
      impersonated: true,
      token,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isAdmin: targetUser.isAdmin,
        visiblePanels: targetUser.visiblePanels,
      },
    };
  }
}
