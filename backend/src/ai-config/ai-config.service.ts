import { Injectable } from '@nestjs/common';

@Injectable()
export class AiConfigService {
  placeholder(action: string) {
    return { message: `AI config ${action} endpoint not implemented yet.` };
  }
}


