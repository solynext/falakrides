import {z} from "zod";
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.").max(254));
export const resetRequestSchema = z.object({email});
export const resetVerifySchema = z.object({email, otp: z.string().regex(/^\d{5}$/, "Enter the 5-digit code from your email.")});
export const resetCompleteSchema = z.object({
  email,
  newPassword: z.string().min(4, "Use at least 4 characters.").max(128),
  confirmPassword: z.string().max(128),
}).refine(value => value.newPassword === value.confirmPassword, "Passwords do not match.");
