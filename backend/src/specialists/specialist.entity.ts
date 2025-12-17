import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Practitioner } from '../practitioners/practitioner.entity';
import { Token } from '../tokens/token.entity';

@Entity({ name: 'specialists' })
export class Specialist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @Column()
  name: string;

  @Column()
  specialty: string;

  @Column({ nullable: true })
  practitionerId?: string;

  @ManyToOne(() => Practitioner, { nullable: true })
  practitioner?: Practitioner;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  schedule?: Record<string, { start: string; end: string }>;

  @Column({ nullable: true })
  maxTokensPerDay?: number;

  @OneToMany(() => Token, (token) => token.specialist)
  tokens: Token[];
}

