import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { Token } from './token.entity';
import { Patient } from '../patients/patient.entity';
import { Specialist } from '../specialists/specialist.entity';
import { Tenant } from '../tenants/tenant.entity';
import { Appointment } from '../appointments/appointment.entity';
import { SpecialistsModule } from '../specialists/specialists.module';
import { DoctorStatusModule } from '../doctor-status/doctor-status.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token, Patient, Specialist, Tenant, Appointment]),
    SpecialistsModule,
    DoctorStatusModule,
    AppointmentsModule,
    TenantsModule,
  ],
  controllers: [TokensController],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}
