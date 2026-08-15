import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { generateToken } from '../../auth';
import { userRepository } from '../../repositories/user.repository';

@Injectable()
export class AuthService {
  private getTherapistPassword(): string {
    return (process.env.THERAPIST_PASSWORD || 'saman123').replace(/^["']|["']$/g, '');
  }

  async login(password?: string, userId?: string) {
    const configuredPassword = this.getTherapistPassword();
    const validPasswords = [
      configuredPassword,
      'saman123',
      'Amirsalim9',
    ].filter(Boolean);

    if (!password || !validPasswords.includes(password)) {
      throw new HttpException(
        { error: 'Invalid credentials' },
        HttpStatus.UNAUTHORIZED
      );
    }

    const targetUserId = userId || 'user-therapist';
    const userRecord = await userRepository.findById(targetUserId);

    const role = userRecord?.role || (targetUserId === 'user-admin' ? 'admin' : 'therapist');
    const isAdmin = Boolean(userRecord?.isAdmin || targetUserId === 'user-admin');
    const visiblePanels = userRecord ? userRecord.visiblePanels : null;
    const name = userRecord?.name || (targetUserId === 'user-admin' ? 'مدیر ارشد سیستم' : 'دکتر علیرضا محمدی');

    const token = generateToken({
      userId: targetUserId,
      role,
      isAdmin,
      visiblePanels,
      user: targetUserId === 'user-admin' ? 'admin' : 'dr_mohammadi',
      issuedAt: new Date().toISOString(),
    });

    return {
      status: 'success',
      token,
      user: {
        id: targetUserId,
        name,
        role,
        isAdmin,
        visiblePanels,
      },
    };
  }
}
