import { z } from 'zod';

export const modalitySchema = z.enum(['text', 'image', 'audio', 'video']);

export const aiConfigurationSchema = z.object({
  id: z.string().uuid(),
  modality: modalitySchema,
  provider: z.string(),
  model: z.string(),
  systemPrompt: z.string().optional(),
  tokenUsed: z.number().min(0),
});

export type ModalitySchema = z.infer<typeof modalitySchema>;
export type AIConfigurationSchema = z.infer<typeof aiConfigurationSchema>;
