import { Module, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { TokensModule } from './tokens/tokens.module';
import { PatientsModule } from './patients/patients.module';
import { AiConfigModule } from './ai-config/ai-config.module';
import { SpecialistsModule } from './specialists/specialists.module';
import { DoctorStatusModule } from './doctor-status/doctor-status.module';
import { buildTypeOrmConfig } from './config/typeorm.config';
import { SubscriptionPlan } from './subscriptions/subscription-plan.entity';
import { Tenant } from './tenants/tenant.entity';
import { Practitioner } from './practitioners/practitioner.entity';
import { TenantSubscription } from './subscriptions/tenant-subscription.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => buildTypeOrmConfig(),
    }),
    TypeOrmModule.forFeature([
      SubscriptionPlan,
      Tenant,
      Practitioner,
      TenantSubscription,
    ]),
    AuthModule,
    TenantsModule,
    TokensModule,
    PatientsModule,
    AiConfigModule,
    SpecialistsModule,
    DoctorStatusModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(_consumer: MiddlewareConsumer) {
    // We will register tenant middleware here later once routes are finalized.
  }
}
