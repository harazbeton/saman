import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Req,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RequireAdmin } from '../auth/roles.decorator';

@Controller('api/users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get()
  @RequireAdmin()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequireAdmin()
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/panels')
  @RequireAdmin()
  @HttpCode(HttpStatus.OK)
  async updateVisiblePanels(
    @Param('id') id: string,
    @Body() body: { visiblePanels: string[] | null; isAdmin?: boolean },
    @Req() req: any
  ) {
    return this.usersService.updateVisiblePanels(id, body.visiblePanels, body.isAdmin, req?.user);
  }

  @Post('login-as')
  @RequireAdmin()
  @HttpCode(HttpStatus.OK)
  async loginAs(@Body() body: { userId: string }, @Req() req: any) {
    return this.usersService.loginAs(body.userId, req?.user);
  }
}
