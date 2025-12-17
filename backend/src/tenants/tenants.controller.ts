import { Controller, Get, Param, Post, Put, UseGuards, Req, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantsService } from './tenants.service';
import { DoctorStatusService } from '../doctor-status/doctor-status.service';
import { DoctorStatusType } from '../doctor-status/doctor-status.entity';

@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly doctorStatusService: DoctorStatusService,
  ) {}

  @Post()
  createTenant() {
    // TODO: implement self-provisioning clinic creation
    return { message: 'Self-provisioning not implemented yet' };
  }

  @Get(':clinicSlug')
  async getTenantPublic(@Param('clinicSlug') clinicSlug: string) {
    const tenant = await this.tenantsService.findBySlug(clinicSlug);
    if (!tenant) {
      return { error: 'Clinic not found' };
    }
    return {
      name: tenant.name,
      qrActive: tenant.qrActive,
    };
  }

  // Doctor: Set doctor IN/OUT status
  @UseGuards(JwtAuthGuard)
  @Put(':clinicSlug/doctor-status')
  async setDoctorStatus(
    @Param('clinicSlug') clinicSlug: string,
    @Body() body: { specialistId?: string; status: 'IN' | 'OUT' },
    @Req() req: any,
  ) {
    const tenant = await this.tenantsService.findBySlug(clinicSlug);
    if (!tenant || tenant.id !== req.user.tenantId) {
      return { error: 'Unauthorized' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const statusType = body.status === 'IN' ? DoctorStatusType.IN : DoctorStatusType.OUT;
    const status = await this.doctorStatusService.setStatus(
      tenant.id,
      body.specialistId || null,
      today,
      statusType,
      req.user.userId,
    );

    console.log(`Doctor status set: ${statusType} for tenant ${tenant.id}, specialistId: ${status.specialistId || 'null'}, date: ${today.toISOString()}`);

    return {
      status: status.status,
      specialistId: status.specialistId,
      date: status.date,
    };
  }

  // Doctor: Set QR active/inactive
  @UseGuards(JwtAuthGuard)
  @Put(':clinicSlug/qr-status')
  async setQrStatus(
    @Param('clinicSlug') clinicSlug: string,
    @Body() body: { active: boolean },
    @Req() req: any,
  ) {
    const tenant = await this.tenantsService.findBySlug(clinicSlug);
    if (!tenant || tenant.id !== req.user.tenantId) {
      return { error: 'Unauthorized' };
    }

    await this.tenantsService.update(tenant.id, { qrActive: body.active });

    return {
      qrActive: body.active,
    };
  }
}
