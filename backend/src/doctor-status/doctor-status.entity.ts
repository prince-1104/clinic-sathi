import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Specialist } from '../specialists/specialist.entity';
import { Practitioner } from '../practitioners/practitioner.entity';

export enum DoctorStatusType {
  IN = 'IN',
  OUT = 'OUT',
}

@Entity({ name: 'doctor_status' })
@Unique(['tenantId', 'specialistId', 'date'])
export class DoctorStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @Column({ nullable: true })
  specialistId?: string;

  @ManyToOne(() => Specialist, { nullable: true })
  specialist?: Specialist;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'enum',
    enum: DoctorStatusType,
    default: DoctorStatusType.OUT,
  })
  status: DoctorStatusType;

  @Column()
  setByPractitionerId: string;

  @ManyToOne(() => Practitioner)
  setByPractitioner: Practitioner;
}

