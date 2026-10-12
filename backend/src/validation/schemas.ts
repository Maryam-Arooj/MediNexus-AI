import { z } from 'zod';
import { ALL_SYMPTOMS, DURATION_OPTIONS, GENDERS } from '../triage/triageConfig';

/** Pakistani CNIC: 13 digits, stored as #####-#######-#. Accepts input with or without dashes. */
export function normalizeCnic(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, '');
  if (!/^\d{13}$/.test(digits)) return null;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/** Pakistani mobile: 03XXXXXXXXX or +923XXXXXXXXX / 923XXXXXXXXX → stored as 03XXXXXXXXX. */
export function normalizePhone(raw: string): string | null {
  const compact = raw.replace(/[\s()-]/g, '');
  const m = compact.match(/^(?:\+?92|0)(3\d{9})$/);
  return m ? `0${m[1]}` : null;
}

const optionalTrimmed = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(100, 'Full name is too long.'),
    cnic: z
      .string({ required_error: 'CNIC is required.' })
      .transform((v, ctx) => {
        const n = normalizeCnic(v);
        if (!n) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CNIC must be 13 digits, e.g. 35202-1234567-1.' });
          return z.NEVER;
        }
        return n;
      }),
    phone: optionalTrimmed.transform((v, ctx) => {
      if (!v) return undefined;
      const n = normalizePhone(v);
      if (!n) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phone must be a Pakistani mobile number, e.g. 03001234567.' });
        return z.NEVER;
      }
      return n;
    }),
    email: optionalTrimmed.pipe(
      z.string().email('Please enter a valid email address.').max(254).transform((v) => v.toLowerCase()).optional()
    ),
    password: z
      .string({ required_error: 'Password is required.' })
      .min(8, 'Password must be at least 8 characters.')
      .max(72, 'Password must be at most 72 characters.')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
      .regex(/\d/, 'Password must contain at least one number.'),
    confirmPassword: z.string({ required_error: 'Please confirm your password.' }),
    // NOTE: any "role" field sent by the client is stripped — public sign-up is always PATIENT.
  })
  .strip()
  .refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });

export const loginSchema = z.object({
  identifier: z.string({ required_error: 'CNIC or email is required.' }).trim().min(1, 'CNIC or email is required.').max(254),
  password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.').max(200),
});

const symptomEnum = z.enum(ALL_SYMPTOMS as [string, ...string[]], {
  errorMap: () => ({ message: 'Please choose symptoms from the list.' }),
});

export const caseInputSchema = z
  .object({
    name: z.string().trim().max(100, 'Name is too long.').optional().default(''),
    age: z
      .union([z.number(), z.string().trim().regex(/^\d+$/, 'Age must be a whole number.').transform(Number)])
      .pipe(
        z
          .number({ invalid_type_error: 'Age must be a whole number.' })
          .int('Age must be a whole number.')
          .min(1, 'Age must be between 1 and 120.')
          .max(120, 'Age must be between 1 and 120.')
      ),
    gender: z.enum(GENDERS, { errorMap: () => ({ message: 'Please select a gender.' }) }),
    symptoms: z
      .array(symptomEnum, { invalid_type_error: 'Please select at least one symptom.' })
      .min(1, 'Please select at least one symptom.')
      .max(10, 'Too many symptoms selected.')
      .refine((a) => new Set(a).size === a.length, 'Each symptom can only be selected once.'),
    duration: z.enum(DURATION_OPTIONS, { errorMap: () => ({ message: 'Please select how long you have had symptoms.' }) }),
    clientRequestId: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9-]{8,64}$/, 'Invalid request id.')
      .optional(),
  })
  .strip();

export type CaseInput = z.infer<typeof caseInputSchema>;

export const reviewSchema = z
  .object({
    clinicalNotes: z.string().max(5000, 'Notes are too long.').optional(),
    recommendedAction: z.string().max(2000, 'Recommended action is too long.').optional(),
  })
  .strip();

export const approveSchema = z
  .object({
    clinicalNotes: z.string().max(5000, 'Notes are too long.').optional(),
  })
  .strip();

export const publicIdParam = z.string().regex(/^SC-\d{4}-\d{1,10}$/, 'Invalid patient id.');
