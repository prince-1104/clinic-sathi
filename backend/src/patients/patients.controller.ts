import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantsService } from '../tenants/tenants.service';

@Controller('tenants/:clinicSlug/patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Get()
  async listPatients(
    @Param('clinicSlug') clinicSlug: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    const tenant = await this.tenantsService.findBySlug(clinicSlug);
    if (!tenant || tenant.id !== req.user.tenantId) {
      return { error: 'Unauthorized' };
    }

    if (search) {
      return this.patientsService.searchPatients(tenant.id, search);
    }

    return this.patientsService.findAllByTenant(tenant.id);
  }

  @Get(':patientId')
  async getPatient(
    @Param('clinicSlug') clinicSlug: string,
    @Param('patientId') patientId: string,
    @Req() req?: any,
  ) {
    const tenant = await this.tenantsService.findBySlug(clinicSlug);
    if (!tenant || tenant.id !== req.user.tenantId) {
      return { error: 'Unauthorized' };
    }

    const patient = await this.patientsService.findOneWithHistory(
      tenant.id,
      patientId,
    );

    if (!patient) {
      return { error: 'Patient not found' };
    }

    return patient;
  }
}


