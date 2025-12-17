import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET') || 'dev-secret';
    console.log('JWT Strategy initialized with secret:', jwtSecret.substring(0, 10) + '...');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    // Attach basic user info to request; in a real app we might look up the practitioner
    if (!payload) {
      console.error('JWT validation failed: No payload');
      return null;
    }
    console.log('JWT validated successfully for user:', payload.email, 'tenant:', payload.tenantId);
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
    };
  }
}


