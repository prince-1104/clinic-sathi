import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './patient.entity';
import { Appointment } from '../appointments/appointment.entity';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
  ) {}

  async findAllByTenant(tenantId: string) {
    console.log(`Finding all patients for tenant: ${tenantId}`);
    const patients = await this.patientRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    console.log(`Found ${patients.length} patients for tenant ${tenantId}`);

    // Load appointment counts for each patient
    for (const patient of patients) {
      const appointmentCount = await this.appointmentRepo.count({
        where: { patientId: patient.id, tenantId },
      });
      (patient as any).appointmentCount = appointmentCount;
    }

    return patients;
  }

  async findOneWithHistory(tenantId: string, patientId: string) {
    const patient = await this.patientRepo.findOne({
      where: { id: patientId, tenantId },
    });

    if (!patient) {
      return null;
    }

    // Load appointments with relations
    const appointments = await this.appointmentRepo.find({
      where: { patientId: patient.id, tenantId },
      relations: ['specialist', 'token'],
      order: { visitDate: 'DESC', createdAt: 'DESC' },
    });

    console.log(`Found ${appointments.length} appointments for patient ${patientId} in tenant ${tenantId}`);

    // Attach appointments to patient
    (patient as any).appointments = appointments;

    return patient;
  }

  async searchPatients(tenantId: string, query: string) {
    const patients = await this.patientRepo
      .createQueryBuilder('patient')
      .where('patient.tenantId = :tenantId', { tenantId })
      .andWhere(
        '(patient.name ILIKE :query OR patient.phone ILIKE :query OR patient.email ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('patient.createdAt', 'DESC')
      .getMany();

    // Load appointment counts for each patient
    for (const patient of patients) {
      const appointmentCount = await this.appointmentRepo.count({
        where: { patientId: patient.id, tenantId },
      });
      (patient as any).appointmentCount = appointmentCount;
    }

    return patients;
  }
}


