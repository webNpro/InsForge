import { z } from 'zod';
import { storageBucketSchema } from './storage.schema';
import { databaseSchema } from './database.schema';

export const oAuthConfigSchema = z.object({
  enabled: z.boolean(),
  providers: z.array(z.string()),
  magicLink: z.boolean(),
});

export const storageConfigSchema = z.object({
  buckets: z.array(storageBucketSchema),
});

export const databaseMetadataSchema = z.object({
  tables: z.record(
    z.object({
      recordCount: z.number(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    })
  ),
  databaseSizeGb: z.number().optional(),
  storageSizeGb: z.number().optional(),
});

export const appMetaDataSchema = z.object({
  database: databaseSchema,
  auth: oAuthConfigSchema,
  storage: storageConfigSchema,
  version: z.string().optional(),
});

export type OAuthConfigSchema = z.infer<typeof oAuthConfigSchema>;
export type StorageConfigSchema = z.infer<typeof storageConfigSchema>;
export type DatabaseMetadataSchema = z.infer<typeof databaseMetadataSchema>;
export type AppMetadataSchema = z.infer<typeof appMetaDataSchema>;
