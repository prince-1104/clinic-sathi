import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'TRIAL' | 'EXPIRED';

@Entity({ name: 'tenant_subscriptions' })
export class TenantSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.subscriptions, {
    nullable: false,
  })
  tenant: Tenant;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.tenantSubscriptions, {
    nullable: false,
  })
  plan: SubscriptionPlan;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  @Column({ type: 'varchar' })
  status: SubscriptionStatus;

  @Column({ default: false })
  autoRenew: boolean;
}


