import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
  ) {}

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({
      where: { slug },
      relations: ['practitioners', 'subscriptions'],
    });
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({
      where: { id },
      relations: ['practitioners', 'subscriptions'],
    });
  }

  async create(data: Partial<Tenant>): Promise<Tenant> {
    const tenant = this.tenantRepo.create(data);
    return this.tenantRepo.save(tenant);
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
    await this.tenantRepo.update(id, data);
    const tenant = await this.findById(id);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    return tenant;
  }
}
