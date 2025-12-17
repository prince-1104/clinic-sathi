import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { SubscriptionPlan } from './subscriptions/subscription-plan.entity';
import { Tenant } from './tenants/tenant.entity';
import { Practitioner } from './practitioners/practitioner.entity';
import { TenantSubscription } from './subscriptions/tenant-subscription.entity';
import { Specialist } from './specialists/specialist.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const plansRepo = app.get<Repository<SubscriptionPlan>>(
    getRepositoryToken(SubscriptionPlan),
  );
  const tenantsRepo = app.get<Repository<Tenant>>(getRepositoryToken(Tenant));
  const practitionersRepo = app.get<Repository<Practitioner>>(
    getRepositoryToken(Practitioner),
  );
  const tenantSubsRepo = app.get<Repository<TenantSubscription>>(
    getRepositoryToken(TenantSubscription),
  );
  const specialistsRepo = app.get<Repository<Specialist>>(
    getRepositoryToken(Specialist),
  );

  // Seed subscription plans if missing
  const existingPlans = await plansRepo.find();
  if (existingPlans.length === 0) {
    await plansRepo.save([
      {
        code: 'BASIC_300',
        displayName: '₹300 / month – Token system only',
        pricePerMonth: 300,
        features: { tokens: true, records: false, aiAvatar: false },
      },
      {
        code: 'RECORDS_800',
        displayName: '₹800 / month – Tokens + patient records & vitals',
        pricePerMonth: 800,
        features: { tokens: true, records: true, aiAvatar: false },
      },
      {
        code: 'AI_3000',
        displayName: '₹3000+ / month – Tokens + records + AI avatar config',
        pricePerMonth: 3000,
        features: { tokens: true, records: true, aiAvatar: true },
      },
    ]);
    // eslint-disable-next-line no-console
    console.log('Seeded subscription plans');
  }

  // Seed a demo tenant + owner practitioner if none exist
  const existingTenants = await tenantsRepo.find();
  if (existingTenants.length === 0) {
    const tenant = tenantsRepo.create({
      slug: 'demo-clinic',
      name: 'Demo Clinic',
      address: 'Demo Address',
      geoLat: 28.6139, // Delhi coordinates (can be changed)
      geoLng: 77.2090,
      qrActive: true,
    });
    await tenantsRepo.save(tenant);

    const ownerPassword = await bcrypt.hash('password123', 10);
    const practitioner = practitionersRepo.create({
      tenant,
      name: 'Demo Owner',
      email: 'owner@demo.clinic',
      phone: '9999999999',
      passwordHash: ownerPassword,
      role: 'OWNER',
    });
    await practitionersRepo.save(practitioner);

    // Create default specialist
    const specialist = specialistsRepo.create({
      tenant,
      name: 'Dr. Demo',
      specialty: 'General Practitioner',
      practitionerId: practitioner.id,
      isActive: true,
      maxTokensPerDay: 50,
    });
    await specialistsRepo.save(specialist);

    const aiPlan = await plansRepo.findOne({
      where: { code: 'AI_3000' },
    });
    if (aiPlan) {
      const today = new Date();
      const nextYear = new Date(today);
      nextYear.setFullYear(today.getFullYear() + 1);

      const tenantSub = tenantSubsRepo.create({
        tenant,
        plan: aiPlan,
        startDate: today.toISOString().slice(0, 10),
        endDate: nextYear.toISOString().slice(0, 10),
        status: 'ACTIVE',
        autoRenew: false,
      });
      await tenantSubsRepo.save(tenantSub);
    }

    // eslint-disable-next-line no-console
    console.log(
      'Seeded demo tenant "demo-clinic" with owner user owner@demo.clinic / password123',
    );
  }

  await app.close();
}

bootstrap()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Seeding completed');
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });


