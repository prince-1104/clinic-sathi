import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Token, TokenStatus } from './token.entity';
import { Patient } from '../patients/patient.entity';
import { Specialist } from '../specialists/specialist.entity';
import { Tenant } from '../tenants/tenant.entity';
import { Appointment, AppointmentStatus } from '../appointments/appointment.entity';
import { SpecialistsService } from '../specialists/specialists.service';
import { DoctorStatusService } from '../doctor-status/doctor-status.service';
import { DoctorStatusType } from '../doctor-status/doctor-status.entity';
import { randomBytes } from 'crypto';
import { type CreateTokenDto } from './tokens.validation';

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(Token)
    private tokenRepo: Repository<Token>,
    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,
    @InjectRepository(Specialist)
    private specialistRepo: Repository<Specialist>,
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
    private specialistsService: SpecialistsService,
    private doctorStatusService: DoctorStatusService,
  ) {}

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Generate short public ID for token
   */
  private generatePublicId(): string {
    return randomBytes(8).toString('base64url').substring(0, 12);
  }

  /**
   * Get next token number for a given tenant, date, and specialist
   */
  private async getNextTokenNumber(
    tenantId: string,
    date: Date,
    specialistId: string,
  ): Promise<number> {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const lastToken = await this.tokenRepo.findOne({
      where: {
        tenantId,
        specialistId,
        date: today,
      },
      order: { tokenNumber: 'DESC' },
    });

    return lastToken ? lastToken.tokenNumber + 1 : 1;
  }

  /**
   * Validate clinic is ready to accept tokens
   */
  async validateClinicStatus(tenantId: string, specialistId?: string): Promise<void> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Clinic not found');
    }

    if (!tenant.qrActive) {
      throw new ForbiddenException('QR code is not active for this clinic');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const doctorStatus = await this.doctorStatusService.getStatus(
      tenantId,
      specialistId || null,
      today,
    );

    if (doctorStatus !== DoctorStatusType.IN) {
      throw new ForbiddenException('Doctor is currently OUT');
    }
  }

  /**
   * Validate location is within allowed radius
   */
  async validateLocation(
    tenantId: string,
    patientLat: number,
    patientLng: number,
  ): Promise<void> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Clinic not found');
    }

    // If clinic location is not configured, skip validation (for development/testing)
    // In production, this should be mandatory
    if (!tenant.geoLat || !tenant.geoLng) {
      console.warn(`Clinic ${tenantId} location not configured - skipping location validation`);
      return; // Allow token creation without location validation
    }

    const distance = this.calculateDistance(
      tenant.geoLat,
      tenant.geoLng,
      patientLat,
      patientLng,
    );

    // Use configured radius or default to 100 meters
    const allowedRadius = tenant.locationRadiusMeters || 100;

    if (distance > allowedRadius) {
      throw new ForbiddenException(
        `You must be within ${allowedRadius}m of the clinic to get a token. Current distance: ${Math.round(distance)}m`,
      );
    }

    console.log(`Location validated: patient is ${Math.round(distance)}m from clinic (within ${allowedRadius}m radius)`);
  }

  /**
   * Check daily token limit
   */
  async checkTokenLimit(tenantId: string, specialistId: string, date: Date): Promise<void> {
    const specialist = await this.specialistRepo.findOne({
      where: { id: specialistId, tenantId },
    });

    if (!specialist) {
      throw new NotFoundException('Specialist not found');
    }

    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tokensToday = await this.tokenRepo.count({
      where: {
        tenantId,
        specialistId,
        date: today,
      },
    });

    const maxTokens = specialist.maxTokensPerDay || 50; // Default limit

    if (tokensToday >= maxTokens) {
      throw new ForbiddenException('Daily token limit reached');
    }
  }

  /**
   * Create a new token
   */
  async createToken(tenantId: string, dto: CreateTokenDto): Promise<Token> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get or create specialist
    let specialist: Specialist | null = null;
    if (dto.specialistId) {
      specialist = await this.specialistRepo.findOne({
        where: { id: dto.specialistId, tenantId },
      });
      if (!specialist) {
        throw new NotFoundException('Specialist not found');
      }
    } else {
      // Get first active specialist or create default
      const specialists = await this.specialistsService.findByTenant(tenantId);
      if (specialists.length === 0) {
        // Create default specialist
        specialist = this.specialistRepo.create({
          tenantId,
          name: 'General Practitioner',
          specialty: 'General',
          isActive: true,
        });
        specialist = await this.specialistRepo.save(specialist);
      } else {
        specialist = specialists[0];
      }
    }

    if (!specialist) {
      throw new NotFoundException('Unable to find or create specialist');
    }

    // Validate clinic status
    await this.validateClinicStatus(tenantId, specialist.id);

    // Validate location
    await this.validateLocation(tenantId, dto.location.lat, dto.location.lng);

    // Check token limit
    await this.checkTokenLimit(tenantId, specialist.id, today);

    // Find or create patient
    let patient = await this.patientRepo.findOne({
      where: {
        tenantId,
        phone: dto.patient.phone,
      },
    });

    if (!patient) {
      patient = this.patientRepo.create({
        tenantId,
        name: dto.patient.name,
        dob: new Date(dto.patient.dob),
        phone: dto.patient.phone,
        address: dto.patient.address,
        email: dto.patient.email,
        gender: dto.patient.gender,
      });
      patient = await this.patientRepo.save(patient);
    }

    // Generate token
    const tokenNumber = await this.getNextTokenNumber(tenantId, today, specialist.id);
    const publicId = this.generatePublicId();

    const token = this.tokenRepo.create({
      tenantId,
      publicId,
      date: today,
      tokenNumber,
      specialistId: specialist.id,
      patientId: patient.id,
      status: TokenStatus.WAITING,
      createdLat: dto.location.lat,
      createdLng: dto.location.lng,
      expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // 24 hours
    });

    const savedToken = await this.tokenRepo.save(token);

    // Create appointment
    const appointment = this.appointmentRepo.create({
      tenantId,
      patientId: patient.id,
      specialistId: specialist.id,
      tokenId: savedToken.id,
      visitDate: today,
      status: AppointmentStatus.WAITING,
    });
    await this.appointmentRepo.save(appointment);

    return savedToken;
  }

  /**
   * Get token by public ID
   */
  async getTokenByPublicId(
    tenantId: string,
    publicId: string,
  ): Promise<Token | null> {
    return this.tokenRepo.findOne({
      where: { tenantId, publicId },
      relations: ['specialist', 'patient'],
    });
  }

  /**
   * Get queue for a tenant
   */
  async getQueue(tenantId: string, specialistId?: string, date?: Date): Promise<Token[]> {
    const queryDate = date || new Date();
    queryDate.setHours(0, 0, 0, 0);

    const where: any = {
      tenantId,
      date: queryDate,
      status: TokenStatus.WAITING,
    };

    if (specialistId) {
      where.specialistId = specialistId;
    }

    return this.tokenRepo.find({
      where,
      relations: ['specialist', 'patient'],
      order: { tokenNumber: 'ASC' },
    });
  }

  /**
   * Call next token
   */
  async callNextToken(tenantId: string, specialistId?: string): Promise<Token | null> {
    const queue = await this.getQueue(tenantId, specialistId);
    if (queue.length === 0) {
      return null;
    }

    const nextToken = queue[0];
    nextToken.status = TokenStatus.CALLED;
    await this.tokenRepo.save(nextToken);

    // Update appointment status
    const appointment = await this.appointmentRepo.findOne({
      where: { tokenId: nextToken.id },
    });
    if (appointment) {
      appointment.status = AppointmentStatus.IN_CONSULTATION;
      await this.appointmentRepo.save(appointment);
    }

    return nextToken;
  }

  /**
   * Update token status
   */
  async updateTokenStatus(
    tenantId: string,
    tokenId: string,
    status: TokenStatus,
  ): Promise<Token> {
    const token = await this.tokenRepo.findOne({
      where: { id: tokenId, tenantId },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    token.status = status;
    await this.tokenRepo.save(token);

    // Update appointment status
    const appointment = await this.appointmentRepo.findOne({
      where: { tokenId: token.id },
    });
    if (appointment) {
      if (status === TokenStatus.COMPLETED) {
        appointment.status = AppointmentStatus.COMPLETED;
      } else if (status === TokenStatus.NO_SHOW) {
        appointment.status = AppointmentStatus.NO_SHOW;
      }
      await this.appointmentRepo.save(appointment);
    }

    return token;
  }

  /**
   * Get today's statistics
   */
  async getTodayStats(tenantId: string, specialistId?: string): Promise<{
    total: number;
    waiting: number;
    completed: number;
    expired: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {
      tenantId,
      date: today,
    };

    if (specialistId) {
      where.specialistId = specialistId;
    }

    const [total, waiting, completed, expired] = await Promise.all([
      this.tokenRepo.count({ where }),
      this.tokenRepo.count({ where: { ...where, status: TokenStatus.WAITING } }),
      this.tokenRepo.count({ where: { ...where, status: TokenStatus.COMPLETED } }),
      this.tokenRepo.count({ where: { ...where, status: TokenStatus.EXPIRED } }),
    ]);

    return { total, waiting, completed, expired };
  }
}
