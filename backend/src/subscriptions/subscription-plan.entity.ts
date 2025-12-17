import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TenantSubscription } from './tenant-subscription.entity';

@Entity({ name: 'subscription_plans' })
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. BASIC_300, RECORDS_800, AI_3000

  @Column()
  displayName: string;

  @Column({ type: 'numeric' })
  pricePerMonth: number;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  features: Record<string, any>;

  @OneToMany(() => TenantSubscription, (s) => s.plan)
  tenantSubscriptions: TenantSubscription[];
}


