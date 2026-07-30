import { z } from "zod";
import { isValidUsPhone } from "./phone";
import { goalOptions, experienceOptions } from "./config";

/**
 * One schema, both sides. React Hook Form validates against it in the browser
 * for instant feedback; the API route validates against it again because
 * anything arriving over HTTP is a stranger's opinion, not a fact.
 */

export const bookingSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(60, "That's a bit long"),

  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(60, "That's a bit long"),

  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("That doesn't look like an email address")
    .max(160),

  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine(isValidUsPhone, "Enter a 10-digit US phone number"),

  goal: z.enum(goalOptions).optional().or(z.literal("")),

  experienceLevel: z.enum(experienceOptions).optional().or(z.literal("")),

  notes: z.string().trim().max(1000, "Keep it under 1000 characters").optional(),

  /** UTC ISO instant of the chosen slot. */
  startsAt: z
    .string()
    .min(1, "Pick a time")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid time"),

  /** Honeypot: real humans never fill this in. Bots fill in everything. */
  website: z.string().max(0).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const availabilityQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD")
    .optional(),
  days: z.coerce.number().int().min(1).max(60).optional(),
});
