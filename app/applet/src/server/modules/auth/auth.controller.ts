import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

@Controller('api')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { password?: string; userId?: string; email?: string }) {
    return this.authService.login(body.password, body.userId, body.email);
  }
}
