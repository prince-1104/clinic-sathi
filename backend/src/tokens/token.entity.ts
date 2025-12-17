import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Patient } from '../patients/patient.entity';
import { Specialist } from '../specialists/specialist.entity';

export enum TokenStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  NO_SHOW = 'NO_SHOW',
}

@Entity({ name: 'tokens' })
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @Column({ unique: true })
  publicId: string; // Short alphanumeric for URL

  @Column({ type: 'date' })
  date: Date;

  @Column()
  tokenNumber: number; // Sequential per tenant+date+specialist

  @Column()
  specialistId: string;

  @ManyToOne(() => Specialist)
  specialist: Specialist;

  @Column({ nullable: true })
  patientId?: string;

  @ManyToOne(() => Patient, { nullable: true })
  patient?: Patient;

  @Column({
    type: 'enum',
    enum: TokenStatus,
    default: TokenStatus.WAITING,
  })
  status: TokenStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'decimal', nullable: true })
  createdLat?: number;

  @Column({ type: 'decimal', nullable: true })
  createdLng?: number;

  @Column({ default: 'QR_WEB' })
  source: string;
}

