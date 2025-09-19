import { z } from 'zod';
import { storageBucketSchema } from './storage.schema';
import { tableSchema } from './database.schema';

export const authMetadataSchema = z.object({
  google: z.object({
    enabled: z.boolean(),
  }),
  github: z.object({
    enabled: z.boolean(),
  }),
});

export const databaseMetadataSchema = z.object({
  tables: z.array(tableSchema),
  totalSize: z.number(),
});

export const bucketMetadataSchema = storageBucketSchema.extend({
  objectCount: z.number().optional(),
});

export const storageMetadataSchema = z.object({
  buckets: z.array(bucketMetadataSchema),
  totalSize: z.number(),
});

export const edgeFunctionMetadataSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
});

export const aiMetadataSchema = z.object({
  models: z.array(
    z.object({
      modality: z.string(),
      modelId: z.string(),
    })
  ),
});

export const appMetaDataSchema = z.object({
  database: databaseMetadataSchema,
  auth: authMetadataSchema,
  storage: storageMetadataSchema,
  aiIntegration: aiMetadataSchema.optional(),
  functions: z.array(edgeFunctionMetadataSchema),
  version: z.string().optional(),
});

export type AuthMetadataSchema = z.infer<typeof authMetadataSchema>;
export type DatabaseMetadataSchema = z.infer<typeof databaseMetadataSchema>;
export type BucketMetadataSchema = z.infer<typeof bucketMetadataSchema>;
export type StorageMetadataSchema = z.infer<typeof storageMetadataSchema>;
export type EdgeFunctionMetadataSchema = z.infer<typeof edgeFunctionMetadataSchema>;
export type AIMetadataSchema = z.infer<typeof aiMetadataSchema>;
export type AppMetadataSchema = z.infer<typeof appMetaDataSchema>;
