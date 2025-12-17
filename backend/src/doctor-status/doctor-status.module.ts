import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorStatusService } from './doctor-status.service';
import { DoctorStatus } from './doctor-status.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorStatus])],
  providers: [DoctorStatusService],
  exports: [DoctorStatusService],
})
export class DoctorStatusModule {}

