import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { DoctorStatus, DoctorStatusType } from './doctor-status.entity';

@Injectable()
export class DoctorStatusService {
  constructor(
    @InjectRepository(DoctorStatus)
    private doctorStatusRepo: Repository<DoctorStatus>,
  ) {}

  async getStatus(
    tenantId: string,
    specialistId: string | null,
    date: Date,
  ): Promise<DoctorStatusType> {
    const where: any = {
      tenantId,
      date,
    };
    if (specialistId) {
      where.specialistId = specialistId;
    } else {
      where.specialistId = IsNull();
    }

    const status = await this.doctorStatusRepo.findOne({
      where,
    });

    // Return the actual status if found, or OUT if not found
    return status?.status || DoctorStatusType.OUT;
  }

  async hasStatus(
    tenantId: string,
    specialistId: string | null,
    date: Date,
  ): Promise<boolean> {
    const where: any = {
      tenantId,
      date,
    };
    if (specialistId) {
      where.specialistId = specialistId;
    } else {
      where.specialistId = IsNull();
    }

    const status = await this.doctorStatusRepo.findOne({
      where,
    });

    return !!status;
  }

  async setStatus(
    tenantId: string,
    specialistId: string | null,
    date: Date,
    status: DoctorStatusType,
    setByPractitionerId: string,
  ): Promise<DoctorStatus> {
    const where: any = {
      tenantId,
      date,
    };
    if (specialistId) {
      where.specialistId = specialistId;
    } else {
      where.specialistId = IsNull();
    }

    let doctorStatus = await this.doctorStatusRepo.findOne({
      where,
    });

    if (doctorStatus) {
      doctorStatus.status = status;
      doctorStatus.setByPractitionerId = setByPractitionerId;
    } else {
      doctorStatus = this.doctorStatusRepo.create({
        tenantId,
        specialistId: specialistId || undefined,
        date,
        status,
        setByPractitionerId,
      });
    }

    const saved = await this.doctorStatusRepo.save(doctorStatus);
    console.log(`DoctorStatus saved: id=${saved.id}, tenantId=${saved.tenantId}, specialistId=${saved.specialistId || 'null'}, status=${saved.status}, date=${saved.date}`);
    return saved;
  }
}

