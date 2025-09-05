import { z } from 'zod';

export const modalitySchema = z.enum(['text', 'image', 'audio', 'video', 'multi']);

export const aiConfigurationSchema = z.object({
  id: z.string().uuid(),
  modality: modalitySchema,
  provider: z.string(),
  model: z.string(),
  systemPrompt: z.string().optional(),
});

export const aiConfigurationWithUsageSchema = aiConfigurationSchema.extend({
  usageStats: z
    .object({
      totalInputTokens: z.number(),
      totalOutputTokens: z.number(),
      totalTokens: z.number(),
      totalImageCount: z.number(),
      totalRequests: z.number(),
    })
    .optional(),
});

export const aiUsageDataSchema = z.object({
  configId: z.string().uuid(),
  inputTokens: z.number().int().optional(),
  outputTokens: z.number().int().optional(),
  imageCount: z.number().int().optional(),
  imageResolution: z.string().optional(),
});

export const aiUsageRecordSchema = aiUsageDataSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  model: z.string().optional(),
  provider: z.string().optional(),
  modality: z.string().optional(),
});

export const aiUsageSummarySchema = z.object({
  totalInputTokens: z.number(),
  totalOutputTokens: z.number(),
  totalTokens: z.number(),
  totalImageCount: z.number(),
  totalRequests: z.number(),
});

export type ModalitySchema = z.infer<typeof modalitySchema>;
export type AIConfigurationSchema = z.infer<typeof aiConfigurationSchema>;
export type AIConfigurationWithUsageSchema = z.infer<typeof aiConfigurationWithUsageSchema>;
export type AIUsageData = z.infer<typeof aiUsageDataSchema>;
export type AIUsageRecord = z.infer<typeof aiUsageRecordSchema>;
export type AIUsageSummary = z.infer<typeof aiUsageSummarySchema>;
