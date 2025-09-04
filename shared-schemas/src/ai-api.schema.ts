import { z } from 'zod';
import { aiConfigurationSchema } from './ai.schema';

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

export const createAIConfiguarationReqeustSchema = aiConfigurationSchema.omit({
  id: true,
  tokenUsed: true,
  requestsCount: true,
});

export const updateAIConfiguarationReqeustSchema = z.object({
  systemPrompt: z.string().nullable(),
});

export type ListModelsResponse = z.infer<typeof listModelsResponseSchema>;
export type CreateAIConfiguarationReqeust = z.infer<typeof createAIConfiguarationReqeustSchema>;
export type UpdateAIConfiguarationReqeust = z.infer<typeof updateAIConfiguarationReqeustSchema>;
