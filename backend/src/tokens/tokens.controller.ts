import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TokensService } from './tokens.service';
import { TokenStatus } from './token.entity';
import { TenantsService } from '../tenants/tenants.service';
import { SpecialistsService } from '../specialists/specialists.service';
import { DoctorStatusService } from '../doctor-status/doctor-status.service';
import { DoctorStatusType } from '../doctor-status/doctor-status.entity';
import {
  createTokenDtoSchema,
  type CreateTokenDto,
} from './tokens.validation';

@Controller()
export class TokensController {
  constructor(
    private readonly tokensService: TokensService,
    private readonly tenantsService: TenantsService,
    private readonly specialistsService: SpecialistsService,
    private readonly doctorStatusService: DoctorStatusService,
  ) {}

  // Public: Get clinic status
  @Get('public/:clinicSlug/status')
  async getClinicStatus(@Param('clinicSlug') clinicSlug: string) {
    const tenant = await this.tenantsService.findBySlug(clinicSlug);
    if (!tenant) {
      return { error: 'Clinic not found' };
    }

    const specialists = await this.specialistsService.findByTenant(tenant.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get general status first (null specialistId) - this applies to all specialists
    const hasGeneralStatus = await this.doctorStatusService.hasStatus(
      tenant.id,
      null,
      today,
    );
    const generalStatus = hasGeneralStatus
      ? await this.doctorStatusService.getStatus(tenant.id, null, today)
      : null;
    
    console.log(`getClinicStatus: General status exists: ${hasGeneralStatus}, status: ${generalStatus}, specialists count: ${specialists.length}`);

    // If no specialists exist, return general status as a single "doctor"
    if (specialists.length === 0) {
      const stats = await this.tokensService.getTodayStats(tenant.id);
      return {
        clinicName: tenant.name,
        qrActive: tenant.qrActive,
        doctors: [
          {
            id: null,
            name: 'General Practitioner',
            specialty: 'General',
            status: String(generalStatus || DoctorStatusType.OUT), // Explicitly convert to string
            waitingCount: 0,
          },
        ],
        maxTokensPerDay: 50,
        tokensIssuedToday: stats.total,
      };
    }

    const doctors = await Promise.all(
      specialists.map(async (spec) => {
        // Priority logic:
        // 1. If general status exists and is IN, use it (applies to all specialists)
        // 2. Otherwise, check specialist-specific status
        // 3. Otherwise, default to OUT
        let status = DoctorStatusType.OUT;
        
        if (hasGeneralStatus && generalStatus === DoctorStatusType.IN) {
          // General status is IN, use it for all specialists
          status = DoctorStatusType.IN;
        } else {
          // Check specialist-specific status
          const hasSpecialistStatus = await this.doctorStatusService.hasStatus(
            tenant.id,
            spec.id,
            today,
          );
          if (hasSpecialistStatus) {
            status = await this.doctorStatusService.getStatus(
              tenant.id,
              spec.id,
              today,
            );
          } else if (hasGeneralStatus) {
            // Use general status even if it's OUT (explicitly set)
            status = generalStatus!;
          }
        }
        
        const queue = await this.tokensService.getQueue(tenant.id, spec.id);
        const doctorEntry = {
          id: spec.id,
          name: spec.name,
          specialty: spec.specialty,
          status: String(status), // Explicitly convert to string to ensure JSON serialization works
          waitingCount: queue.length,
        };
        console.log(`Doctor entry for ${spec.name}: status=${status}, stringified=${String(status)}`);
        return doctorEntry;
      }),
    );

    const stats = await this.tokensService.getTodayStats(tenant.id);

    return {
      clinicName: tenant.name,
      qrActive: tenant.qrActive,
      doctors,
      maxTokensPerDay: 50, // TODO: get from tenant settings
      tokensIssuedToday: stats.total,
    };
  }

  // Public: Create token
  @Post('public/:clinicSlug/tokens')
  async createPublicToken(
    @Param('clinicSlug') clinicSlug: string,
    @Body() dto: any, // Use any to validate with Zod
  ) {
    // Validate DTO with Zod
    const validationResult = createTokenDtoSchema.safeParse(dto);
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err: z.ZodIssue) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      throw new BadRequestException({
        error: 'Validation failed',
        details: errors,
      });
    }

    const tenant = await this.tenantsService.findBySlug(clinicSlug);
    if (!tenant) {
      return { error: 'Clinic not found' };
    }

    try {
      // Use validated data
      const validatedDto: CreateTokenDto = validationResult.data;
      const token = await this.tokensService.createToken(tenant.id, validatedDto);
      const queue = await this.tokensService.getQueue(tenant.id, token.specialistId);
      const position = queue.findIndex((t) => t.id === token.id) + 1;

      return {
        tokenPublicId: token.publicId,
        tokenNumber: token.tokenNumber,
        status: token.status,
        positionInQueue: position,
        specialist: {
          id: token.specialistId,
          name: token.specialist?.name || 'Unknown',
        },
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to create token',
      };
    }
  }

  // Public: Get token status
  @Get('public/:clinicSlug/tokens/:tokenPublicId')
  async getPublicToken(
    @Param('clinicSlug') clinicSlug: string,
    @Param('tokenPublicId') tokenPublicId: string,
  ) {
    const tenant = await this.tenantsService.findBySlug(clinicSlug);
    if (!tenant) {
      return { error: 'Clinic not found' };
    }

    const token = await this.tokensService.getTokenByPublicId(tenant.id, tokenPublicId);
    if (!token) {
      return { error: 'Token not found' };
    }

    return {
      tokenNumber: token.tokenNumber,
      status: token.status,
      specialist: {
        name: token.specialist?.name || 'Unknown',
      },
      updatedAt: token.updatedAt,
    };
  }

  // Doctor: Get queue
  @UseGuards(JwtAuthGuard)
  @Get('tenants/:clinicSlug/queue')
  async getQueue(
    @Param('clinicSlug') clinicSlug: string,
    @Req() req: any,
  ) {
    const tenant = await this.tenantsService.findBySlug(clinicSlug);
    if (!tenant || tenant.id !== req.user.tenantId) {
      return { error: 'Unauthorized' };
    }

    const queue = await this.tokensService.getQueue(tenant.id);
    return queue.map((token) => ({
      id: token.id,
      publicId: token.publicId,
      tokenNumber: token.tokenNumber,
      status: token.status,
      patient: token.patient
        ? {
            name: token.patient.name,
            phone: token.patient.phone,
          }
        : null,
      specialist: token.specialist
        ? {
            name: token.specialist.name,
          }
        : null,
      createdAt: token.createdAt,
    }));
  }

  // Doctor: Call next token
  @UseGuards(JwtAuthGuard)
  @Post('tenants/:clinicSlug/queue/call-next')
  async callNextToken(
    @Param('clinicSlug') clinicSlug: string,
    @Body() body: { specialistId?: string },
    @Req() req: any,
  ) {
    const tenant = await this.tenantsService.findBySlug(clinicSlug);
    if (!tenant || tenant.id !== req.user.tenantId) {
      return { error: 'Unauthorized' };
    }

    const token = await this.tokensService.callNextToken(
      tenant.id,
      body.specialistId,
    );

    if (!token) {
      return { message: 'No tokens in queue' };
    }

    return {
      id: token.id,
      tokenNumber: token.tokenNumber,
      status: token.status,
      patient: token.patient
        ? {
            id: token.patient.id,
            name: token.patient.name,
            dob: token.patient.dob,
            phone: token.patient.phone,
            address: token.patient.address,
            email: token.patient.email,
            gender: token.patient.gender,
          }
        : null,
    };
  }

  // Doctor: Update token status
  @UseGuards(JwtAuthGuard)
  @Put('tenants/:clinicSlug/tokens/:tokenId/status')
  async updateTokenStatus(
    @Param('clinicSlug') clinicSlug: string,
    @Param('tokenId') tokenId: string,
    @Body() body: { status: TokenStatus },
    @Req() req: any,
  ) {
    const tenant = await this.tenantsService.findBySlug(clinicSlug);
    if (!tenant || tenant.id !== req.user.tenantId) {
      return { error: 'Unauthorized' };
    }

    const token = await this.tokensService.updateTokenStatus(
      tenant.id,
      tokenId,
      body.status,
    );

    return {
      id: token.id,
      tokenNumber: token.tokenNumber,
      status: token.status,
    };
  }

  // Doctor: Get today's stats
  @UseGuards(JwtAuthGuard)
  @Get('tenants/:clinicSlug/stats')
  async getStats(
    @Param('clinicSlug') clinicSlug: string,
    @Req() req: any,
  ) {
    const tenant = await this.tenantsService.findBySlug(clinicSlug);
    if (!tenant || tenant.id !== req.user.tenantId) {
      return { error: 'Unauthorized' };
    }

    return this.tokensService.getTodayStats(tenant.id);
  }
}
