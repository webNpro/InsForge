import { z } from 'zod';
import { aiConfigurationSchema, aiUsageRecordSchema, modalitySchema } from './ai.schema';

// ============= Chat Completion Schemas =============

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  images: z
    .array(
      z.object({
        url: z.string(),
      })
    )
    .optional(),
});

export const chatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(chatMessageSchema),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  stream: z.boolean().optional(),
});

export const chatCompletionResponseSchema = z.object({
  text: z.string(),
  metadata: z
    .object({
      model: z.string(),
      usage: z
        .object({
          promptTokens: z.number().optional(),
          completionTokens: z.number().optional(),
          totalTokens: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

// ============= Image Generation Schemas =============

export const imageGenerationRequestSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  images: z
    .array(
      z.object({
        url: z.string(),
      })
    )
    .optional(),
});

export const imageGenerationResponseSchema = z.object({
  text: z.string().optional(),
  images: z.array(
    z.object({
      type: z.literal('imageUrl'),
      imageUrl: z.string(),
    })
  ),
  metadata: z
    .object({
      model: z.string(),
      usage: z
        .object({
          promptTokens: z.number().optional(),
          completionTokens: z.number().optional(),
          totalTokens: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

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

export const aiModelSchema = z.object({
  id: z.string(),
  inputModality: z.array(modalitySchema).min(1),
  outputModality: z.array(modalitySchema).min(1),
  provider: z.string(),
  modelId: z.string(),
  priceLevel: z.number().min(0).max(3).optional(),
  systemPrompt: z.string().optional(),
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
export type ChatMessageSchema = z.infer<typeof chatMessageSchema>;
export type ChatCompletionRequest = z.infer<typeof chatCompletionRequestSchema>;
export type ChatCompletionResponse = z.infer<typeof chatCompletionResponseSchema>;
export type ImageGenerationRequest = z.infer<typeof imageGenerationRequestSchema>;
export type ImageGenerationResponse = z.infer<typeof imageGenerationResponseSchema>;
export type OpenRouterModel = z.infer<typeof openRouterModelSchema>;
export type AIModel = z.infer<typeof aiModelSchema>;
export type CreateAIConfigurationRequest = z.infer<typeof createAIConfigurationRequestSchema>;
export type UpdateAIConfigurationRequest = z.infer<typeof updateAIConfigurationRequestSchema>;
export type ListAIUsageResponse = z.infer<typeof listAIUsageResponseSchema>;
export type GetAIUsageRequest = z.infer<typeof getAIUsageRequestSchema>;
export type GetAIUsageSummaryRequest = z.infer<typeof getAIUsageSummaryRequestSchema>;
