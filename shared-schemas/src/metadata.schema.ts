import { z } from 'zod';
import { databaseSchema } from './database.schema';
import { storageBucketSchema } from './storage.schema';

export const authConfigSchema = z.object({
  enabled: z.boolean(),
  providers: z.array(z.string()),
  magicLink: z.boolean(),
});

export const storageConfigSchema = z.object({
  buckets: z.array(storageBucketSchema),
});

export const appMetaDataSchema = z.object({
  database: databaseSchema,
  auth: authConfigSchema,
  storage: storageConfigSchema,
  version: z.string().optional(),
});

export type AuthConfigSchema = z.infer<typeof authConfigSchema>;
export type StorageConfigSchema = z.infer<typeof storageConfigSchema>;
export type AppMetadataSchema = z.infer<typeof appMetaDataSchema>;
