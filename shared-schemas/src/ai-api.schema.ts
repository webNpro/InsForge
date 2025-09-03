import { z } from 'zod';

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

export type ListModelsResponse = z.infer<typeof listModelsResponseSchema>;
