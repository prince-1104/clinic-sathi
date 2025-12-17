import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Practitioner } from '../practitioners/practitioner.entity';
import { TenantSubscription } from '../subscriptions/tenant-subscription.entity';

@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ type: 'decimal', nullable: true })
  geoLat?: number;

  @Column({ type: 'decimal', nullable: true })
  geoLng?: number;

  @Column({ type: 'decimal', nullable: true })
  locationRadiusMeters?: number; // Allowed radius in meters for location validation

  @Column({ default: true })
  qrActive: boolean;

  @OneToMany(() => Practitioner, (p) => p.tenant)
  practitioners: Practitioner[];

  @OneToMany(() => TenantSubscription, (s) => s.tenant)
  subscriptions: TenantSubscription[];
}


