import { z } from 'zod';

export const auditLogSchema = z.object({
  id: z.string(),
  actor: z.string(),
  action: z.string(),
  module: z.string(),
  details: z.record(z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AuditLogSchema = z.infer<typeof auditLogSchema>;
