import { Controller, Post, Body, Req, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('api/sync')
export class SyncController {
  constructor(@Inject(SyncService) private readonly syncService: SyncService) {}

  @Post('outbox')
  @HttpCode(HttpStatus.OK)
  async syncOutbox(@Body() body: { items?: any }, @Req() req: any) {
    return this.syncService.processOutbox(body?.items, req?.user);
  }
}
