import { z } from 'zod';
import { aiConfigurationSchema, aiUsageRecordSchema } from './ai.schema';

// OpenRouter-specific model schema
export const openRouterModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  created: z.number(),
  description: z.string().optional(),
  architecture: z
    .object({
      inputModalities: z.array(z.string()),
      outputModalities: z.array(z.string()),
      tokenizer: z.string(),
      instructType: z.string(),
    })
    .optional(),
  topProvider: z
    .object({
      isModerated: z.boolean(),
      contextLength: z.number(),
      maxCompletionTokens: z.number(),
    })
    .optional(),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
    image: z.string().optional(),
    request: z.string().optional(),
    webSearch: z.string().optional(),
    internalReasoning: z.string().optional(),
    inputCacheRead: z.string().optional(),
    inputCacheWrite: z.string().optional(),
  }),
});

export const listModelsResponseSchema = z.object({
  text: z.array(
    z.object({
      provider: z.string(),
      configured: z.boolean(),
      models: z.array(openRouterModelSchema),
    })
  ),
  image: z.array(
    z.object({
      provider: z.string(),
      configured: z.boolean(),
      models: z.array(openRouterModelSchema),
    })
  ),
});

export const createAIConfigurationRequestSchema = aiConfigurationSchema.omit({
  id: true,
});

export const updateAIConfigurationRequestSchema = z.object({
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

// Export types
export type OpenRouterModel = z.infer<typeof openRouterModelSchema>;
export type ListModelsResponse = z.infer<typeof listModelsResponseSchema>;
export type CreateAIConfigurationRequest = z.infer<typeof createAIConfigurationRequestSchema>;
export type UpdateAIConfigurationRequest = z.infer<typeof updateAIConfigurationRequestSchema>;
export type ListAIUsageResponse = z.infer<typeof listAIUsageResponseSchema>;
export type GetAIUsageRequest = z.infer<typeof getAIUsageRequestSchema>;
export type GetAIUsageSummaryRequest = z.infer<typeof getAIUsageSummaryRequestSchema>;
