import { z } from "zod";
export const registerSchema = z.object({
  gymName: z.string().min(2), timezone: z.string().min(3), whatsappNumber: z.string().min(8),
  countryCode: z.string().default("+91"), ownerName: z.string().min(2),
  email: z.string().email(), phone: z.string().min(8), password: z.string().min(8),
});
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const customerSchema = z.object({
  name: z.string().trim().min(1), phone: z.string().min(8), status: z.enum(["active", "inactive"]).optional(),
});
export interface Progress { total: number; thisMonth: number; currentStreak: number; longestStreak: number; lastVisit: string | null }
export interface Day { date: string; present: boolean }
export type RegisterInput = z.infer<typeof registerSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
