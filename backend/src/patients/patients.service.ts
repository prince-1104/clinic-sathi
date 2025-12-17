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
    return this.patientRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      relations: ['appointments'],
    });
  }

  async findOneWithHistory(tenantId: string, patientId: string) {
    const patient = await this.patientRepo.findOne({
      where: { id: patientId, tenantId },
      relations: ['appointments', 'appointments.specialist', 'appointments.token'],
    });

    if (!patient) {
      return null;
    }

    // Sort appointments by visit date (most recent first)
    if (patient.appointments) {
      patient.appointments.sort((a, b) => {
        const dateA = new Date(a.visitDate).getTime();
        const dateB = new Date(b.visitDate).getTime();
        return dateB - dateA;
      });
    }

    return patient;
  }

  async searchPatients(tenantId: string, query: string) {
    return this.patientRepo
      .createQueryBuilder('patient')
      .where('patient.tenantId = :tenantId', { tenantId })
      .andWhere(
        '(patient.name ILIKE :query OR patient.phone ILIKE :query OR patient.email ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('patient.createdAt', 'DESC')
      .getMany();
  }
}


