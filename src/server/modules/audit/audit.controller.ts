import { Controller, Post, Get, Body, Req, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../auth/roles.decorator';

@Controller('api/audit-logs')
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  /**
   * Record Audit Log Endpoint.
   * Server-verified identity from JWT (req.user) ALWAYS takes precedence over client-supplied
   * body fields for userId, userName, userRole, and impersonatedBy to prevent identity spoofing.
   * Any authenticated role may record operational audit logs, with identity tamper-proofed.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async recordLog(@Body() body: any, @Req() req: any) {
    const user = req?.user;

    const entry = {
      id: body.id,
      action: body.action,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      details: body.details,
      timestamp: body.timestamp || new Date().toISOString(),
      // Server-verified identity overrides client body:
      userId: user?.userId || body.userId || '',
      userName: user?.name || user?.user || body.userName || '',
      userRole: user?.role || body.userRole || '',
      impersonatedBy: user?.impersonatedBy || '', // Never trust client body for this field
    };

    return this.auditService.log(entry);
  }

  @Get()
  @Roles('therapist', 'admin')
  async getLogs() {
    return this.auditService.findAll();
  }
}
