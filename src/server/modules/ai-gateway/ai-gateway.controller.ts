import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { AiGatewayService } from './ai-gateway.service';
import { Roles } from '../auth/roles.decorator';

@Controller('api/ai')
@Roles('patient', 'therapist')
export class AiGatewayController {
  constructor(
    @Inject(AiGatewayService)
    private readonly aiGatewayService: AiGatewayService
  ) {}

  @Post('gateway')
  @HttpCode(HttpStatus.OK)
  async handleGateway(@Body() body: { action: string; payload?: any }) {
    return this.aiGatewayService.execute(body?.action, body?.payload);
  }
}
