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

// Chat request/response schemas
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

export const chatRequestSchema = z.object({
  model: z.string(),
  message: z.string().optional(),
  messages: z.array(chatMessageSchema).optional(),
  stream: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  systemPrompt: z.string().optional(),
});

export const chatResponseSchema = z.object({
  success: z.boolean(),
  response: z.string(),
  model: z.string(),
  tokenUsage: z
    .object({
      promptTokens: z.number().optional(),
      completionTokens: z.number().optional(),
      totalTokens: z.number().optional(),
    })
    .optional(),
});

// Image generation schemas
export const imageGenerationRequestSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  numImages: z.number().positive().max(10).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  style: z.enum(['vivid', 'natural']).optional(),
  responseFormat: z.enum(['url', 'b64_json']).optional(),
  size: z.string().optional(),
  steps: z.number().positive().optional(),
  guidanceScale: z.number().positive().optional(),
  seed: z.number().optional(),
});

export const imageGenerationResponseSchema = z.object({
  model: z.string(),
  images: z.array(
    z.object({
      url: z.string().optional(),
      imageData: z.string().optional(),
      revisedPrompt: z.string().optional(),
    })
  ),
  count: z.number(),
  nextActions: z.string(),
});

// Export types
export type OpenRouterModel = z.infer<typeof openRouterModelSchema>;
export type ListModelsResponse = z.infer<typeof listModelsResponseSchema>;
export type CreateAIConfigurationRequest = z.infer<typeof createAIConfigurationRequestSchema>;
export type UpdateAIConfigurationRequest = z.infer<typeof updateAIConfigurationRequestSchema>;
export type ListAIUsageResponse = z.infer<typeof listAIUsageResponseSchema>;
export type GetAIUsageRequest = z.infer<typeof getAIUsageRequestSchema>;
export type GetAIUsageSummaryRequest = z.infer<typeof getAIUsageSummaryRequestSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ImageGenerationRequest = z.infer<typeof imageGenerationRequestSchema>;
export type ImageGenerationResponse = z.infer<typeof imageGenerationResponseSchema>;
