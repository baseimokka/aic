import { z } from "zod";
import { locales } from "@/lib/i18n/config";

/** Contact form — server-side authoritative schema (§26). `company` is the honeypot. */
export const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10, "Tell us a little more.").max(2000),
  consent: z.boolean().refine((v) => v === true, "Consent is required."),
  // locale the form was submitted from — feeds assignment-rule "language" matching
  locale: z.enum(locales).optional(),
  challengeToken: z.string().min(1, "Please confirm you're not a robot."),
  company: z.string().max(0).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
