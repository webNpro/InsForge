import { z } from "zod";

export const storageFileSchema = z.object({
  key: z.string(),
  bucket: z.string(),
  size: z.number(),
  mime_type: z.string().optional(),
  uploaded_at: z.string(),
  url: z.string(),
});

export const storageBucketSchema = z.object({
  name: z.string(),
  public: z.boolean(),
  created_at: z.string(),
});

export type StorageFileSchema = z.infer<typeof storageFileSchema>;
export type StorageBucketSchema = z.infer<typeof storageBucketSchema>;
