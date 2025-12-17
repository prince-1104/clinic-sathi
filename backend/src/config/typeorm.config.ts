import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Practitioner } from '../practitioners/practitioner.entity';
import { SubscriptionPlan } from '../subscriptions/subscription-plan.entity';
import { TenantSubscription } from '../subscriptions/tenant-subscription.entity';
import { Patient } from '../patients/patient.entity';
import { Specialist } from '../specialists/specialist.entity';
import { Token } from '../tokens/token.entity';
import { Appointment } from '../appointments/appointment.entity';
import { DoctorStatus } from '../doctor-status/doctor-status.entity';

export function buildTypeOrmConfig(): TypeOrmModuleOptions {
  const hasDatabaseUrl = !!process.env.DATABASE_URL;

  if (hasDatabaseUrl) {
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      entities: [
        Tenant,
        Practitioner,
        SubscriptionPlan,
        TenantSubscription,
        Patient,
        Specialist,
        Token,
        Appointment,
        DoctorStatus,
      ],
      synchronize: true, // TODO: disable in production and use migrations instead
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'clinic_saathi',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [Tenant, Practitioner, SubscriptionPlan, TenantSubscription],
    synchronize: true, // TODO: disable in production and use migrations instead
  };
}


