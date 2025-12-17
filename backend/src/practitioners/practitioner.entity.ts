import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

export type PractitionerRole = 'OWNER' | 'ADMIN' | 'DOCTOR' | 'STAFF';

@Entity({ name: 'practitioners' })
export class Practitioner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.practitioners, {
    nullable: false,
  })
  tenant: Tenant;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar' })
  role: PractitionerRole;
}


