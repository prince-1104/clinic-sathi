import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Specialist } from './specialist.entity';

@Injectable()
export class SpecialistsService {
  constructor(
    @InjectRepository(Specialist)
    private specialistRepo: Repository<Specialist>,
  ) {}

  async findByTenant(tenantId: string): Promise<Specialist[]> {
    return this.specialistRepo.find({
      where: { tenantId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Specialist | null> {
    return this.specialistRepo.findOne({
      where: { id, tenantId, isActive: true },
    });
  }
}

