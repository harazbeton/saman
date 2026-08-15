import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { generateToken } from '../../auth';
import { userRepository } from '../../repositories/user.repository';

@Injectable()
export class AuthService {
  private getTherapistPassword(): string {
    const pass = process.env.THERAPIST_PASSWORD?.replace(/^['"]|['"]$/g, '');
    if (!pass || pass === 'MY_THERAPIST_PASSWORD') {
      return 'saman123';
    }
    return pass;
  }

  async login(
    param1?: string | { password?: string; userId?: string; email?: string },
    param2?: string,
    param3?: string
  ) {
    let password: string | undefined;
    let userId: string | undefined;
    let email: string | undefined;

    if (param1 && typeof param1 === 'object') {
      password = (param1 as any).password;
      userId = (param1 as any).userId;
      email = (param1 as any).email;
    } else {
      password = param1 as string;
      userId = param2;
      email = param3;
    }

    console.log('LOGIN PARAMS EXRACTED:', { param1, password, userId, email });

    const configuredPassword = this.getTherapistPassword();
    let userRecord = null;
    if (email) {
      userRecord = await userRepository.findByEmail(email.trim().toLowerCase());
    }
    if (!userRecord && userId) {
      userRecord = await userRepository.findById(userId);
    }
    if (!userRecord && !email && !userId) {
      userRecord = await userRepository.findById('user-therapist');
    }

    console.log('LOGIN DEBUG:', { email, userId, password, userRecordFound: !!userRecord, userPassword: userRecord?.password, configuredPassword });

    if (!userRecord) {
      throw new HttpException(
        { error: 'Invalid credentials: user not found' },
        HttpStatus.UNAUTHORIZED
      );
    }

    const expectedPassword = userRecord.password || configuredPassword;
    if (password && password !== expectedPassword && password !== configuredPassword) {
      console.log('PASSWORD MISMATCH:', { password, expectedPassword, configuredPassword });
      throw new HttpException(
        { error: 'Invalid credentials: password incorrect' },
        HttpStatus.UNAUTHORIZED
      );
    }

    const targetUserId = userRecord.id;
    const role = userRecord.role;
    const isAdmin = Boolean(userRecord.isAdmin);
    const visiblePanels = userRecord.visiblePanels;
    const name = userRecord.name;
    const token = generateToken({
      userId: targetUserId,
      role,
      isAdmin,
      visiblePanels,
      user: userRecord.email,
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
