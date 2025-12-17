import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Practitioner } from '../practitioners/practitioner.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Practitioner)
    private readonly practitionersRepo: Repository<Practitioner>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const practitioner = await this.practitionersRepo.findOne({
      where: { email },
      relations: ['tenant'],
    });
    if (!practitioner) {
      return { error: 'Invalid credentials' };
    }

    const isValid = await bcrypt.compare(password, practitioner.passwordHash);
    if (!isValid) {
      return { error: 'Invalid credentials' };
    }

    const payload = {
      sub: practitioner.id,
      tenantId: practitioner.tenant.id,
      email: practitioner.email,
      role: practitioner.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      practitioner: {
        id: practitioner.id,
        name: practitioner.name,
        email: practitioner.email,
        role: practitioner.role,
        tenantId: practitioner.tenant.id,
        tenantSlug: practitioner.tenant.slug,
      },
    };
  }

  placeholder(action: string) {
    return { message: `Auth ${action} endpoint not implemented yet.` };
  }
}


