import { Controller, Get, Param, Put } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';

@Controller('tenants/:clinicSlug/ai-config')
export class AiConfigController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  @Get()
  getConfig(@Param('clinicSlug') clinicSlug: string) {
    // TODO: return AI avatar configuration for this tenant (tier ≥ ₹3000)
    return this.aiConfigService.placeholder(`getConfig:${clinicSlug}`);
  }

  @Put()
  updateConfig(@Param('clinicSlug') clinicSlug: string) {
    // TODO: update AI avatar configuration (placeholders only)
    return this.aiConfigService.placeholder(`updateConfig:${clinicSlug}`);
  }
}


