import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // If JWT has tenantId, prefer that
    const user = (req as any).user as { tenantId?: string } | undefined;
    if (user?.tenantId) {
      (req as any).tenantId = user.tenantId;
      return next();
    }

    // Otherwise, try to resolve from :clinicSlug param when present
    const clinicSlug =
      (req.params && (req.params as any).clinicSlug) ||
      (req.params && (req.params as any).tenantSlug);

    if (clinicSlug) {
      const tenant = await this.tenantsRepo.findOne({
        where: { slug: clinicSlug },
      });
      if (tenant) {
        (req as any).tenantId = tenant.id;
      }
    }

    next();
  }
}


