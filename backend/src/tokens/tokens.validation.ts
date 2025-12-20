import { z } from 'zod';

// Patient data validation schema
export const patientSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'Name can only contain letters, spaces, hyphens, and apostrophes',
    )
    .trim(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(
      (date) => {
        const parsedDate = new Date(date);
        const today = new Date();
        const minDate = new Date('1900-01-01');
        return parsedDate <= today && parsedDate >= minDate;
      },
      {
        message: 'Date of birth must be between 1900-01-01 and today',
      },
    ),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')
    .refine(
      (phone) => {
        // Ensure it's not all zeros or all same digits
        const digits = phone.split('');
        return !digits.every((d) => d === digits[0]);
      },
      'Phone number cannot be all the same digit',
    ),
  address: z.string().max(500, 'Address must be less than 500 characters').optional(),
  email: z
    .string()
    .max(255, 'Email must be less than 255 characters')
    .refine(
      (val) => !val || z.string().email().safeParse(val).success,
      'Invalid email format',
    )
    .optional()
    .or(z.literal('')),
  gender: z
    .enum(['male', 'female', 'other', 'prefer-not-to-say'])
    .optional(),
});

// Location validation schema
export const locationSchema = z.object({
  lat: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

// Token creation DTO validation schema
export const createTokenDtoSchema = z.object({
  specialistId: z.string().uuid('Invalid specialist ID format').optional(),
  patient: patientSchema,
  location: locationSchema,
});

export type CreateTokenDto = z.infer<typeof createTokenDtoSchema>;

