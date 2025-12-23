import { z } from "zod";

// Patient data validation schema
export const patientSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes")
    .trim(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine(
      (date) => {
        const parsedDate = new Date(date);
        const today = new Date();
        const minDate = new Date("1900-01-01");
        return parsedDate <= today && parsedDate >= minDate;
      },
      {
        message: "Date of birth must be between 1900-01-01 and today",
      }
    ),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits")
    .refine((phone) => {
      // Ensure it's not all zeros or all same digits
      const digits = phone.split("");
      return !digits.every((d) => d === digits[0]);
    }, "Phone number cannot be all the same digit"),
});

// Token creation schema (includes location)
export const createTokenSchema = z.object({
  patient: patientSchema,
  location: z.object({
    lat: z
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90"),
    lng: z
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180"),
  }),
});

export type PatientFormData = z.infer<typeof patientSchema>;
export type CreateTokenData = z.infer<typeof createTokenSchema>;

