import { Controller, Get, Param } from '@nestjs/common';
import { PatientsService } from './patients.service';

@Controller('tenants/:clinicSlug/patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  listPatients(@Param('clinicSlug') clinicSlug: string) {
    // TODO: list patients for a tenant (subscription tier ≥ ₹800)
    return this.patientsService.placeholder(`listPatients:${clinicSlug}`);
  }

  @Get(':patientId')
  getPatient(
    @Param('clinicSlug') clinicSlug: string,
    @Param('patientId') patientId: string,
  ) {
    // TODO: return patient profile and visit history
    return this.patientsService.placeholder(
      `getPatient:${clinicSlug}:${patientId}`,
    );
  }
}


