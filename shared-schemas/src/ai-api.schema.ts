import { z } from 'zod';
import { aiConfigurationSchema, aiUsageRecordSchema } from './ai.schema';

export const listModelsResponseSchema = z.object({
  text: z.array(
    z.object({
      provider: z.string(),
      configured: z.boolean(),
      models: z.array(z.string()),
    })
  ),
  image: z.array(
    z.object({
      provider: z.string(),
      configured: z.boolean(),
      models: z.array(z.string()),
    })
  ),
});

export const createAIConfigurationReqeustSchema = aiConfigurationSchema.omit({
  id: true,
});

export const updateAIConfigurationReqeustSchema = z.object({
  systemPrompt: z.string().nullable(),
});

export const listAIUsageResponseSchema = z.object({
  records: z.array(aiUsageRecordSchema),
  total: z.number(),
});

export const getAIUsageRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().regex(/^\d+$/).default('50'),
  offset: z.string().regex(/^\d+$/).default('0'),
});

export const getAIUsageSummaryRequestSchema = z.object({
  configId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type ListModelsResponse = z.infer<typeof listModelsResponseSchema>;
export type CreateAIConfigurationReqeust = z.infer<typeof createAIConfigurationReqeustSchema>;
export type UpdateAIConfigurationReqeust = z.infer<typeof updateAIConfigurationReqeustSchema>;
export type ListAIUsageResponse = z.infer<typeof listAIUsageResponseSchema>;
export type GetAIUsageRequest = z.infer<typeof getAIUsageRequestSchema>;
export type GetAIUsageSummaryRequest = z.infer<typeof getAIUsageSummaryRequestSchema>;
