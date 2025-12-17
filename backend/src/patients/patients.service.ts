import { Injectable } from '@nestjs/common';

@Injectable()
export class PatientsService {
  placeholder(action: string) {
    return { message: `Patients ${action} endpoint not implemented yet.` };
  }
}


