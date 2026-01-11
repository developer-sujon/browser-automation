import { z } from "zod/v4";

export const FileItemSchema = z.object({
  id: z.string(), // Changed to string (UUID)
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  message: z.string(),
  status: z.enum(["created", "processing", "success", "failed"]).optional(),
  attempts: z.coerce.number().optional(),
  reason: z.string().optional(),
});

export type FileItem = z.infer<typeof FileItemSchema>;

export const SubmissionResultSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  message: z.string(),
});

export type SubmissionResult = z.infer<typeof SubmissionResultSchema>;
