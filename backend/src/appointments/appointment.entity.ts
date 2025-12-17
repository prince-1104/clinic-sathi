import {
  Column,
  Entity,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Patient } from '../patients/patient.entity';
import { Specialist } from '../specialists/specialist.entity';
import { Token } from '../tokens/token.entity';

export enum AppointmentStatus {
  WAITING = 'WAITING',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'appointments' })
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @Column()
  patientId: string;

  @ManyToOne(() => Patient)
  patient: Patient;

  @Column()
  specialistId: string;

  @ManyToOne(() => Specialist)
  specialist: Specialist;

  @Column({ nullable: true })
  tokenId?: string;

  @OneToOne(() => Token, { nullable: true })
  token?: Token;

  @Column({ type: 'date' })
  visitDate: Date;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.WAITING,
  })
  status: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  diagnosis?: string;

  @Column({ type: 'text', nullable: true })
  prescription?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

