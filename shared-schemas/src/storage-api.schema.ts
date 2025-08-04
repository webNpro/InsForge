import { z } from "zod";
import { storageFileSchema } from "./storage.schema";

export const createBucketRequestSchema = z.object({
  bucket_name: z.string().min(1, "Bucket name cannot be empty"),
  is_public: z.boolean().default(true),
});

export const updateBucketRequestSchema = z.object({
  is_public: z.boolean(),
});

export const listObjectsResponseSchema = z.object({
  bucket_name: z.string().min(1, "Bucket name cannot be empty"),
  prefix: z.string().optional(),
  objects: z.array(storageFileSchema),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
  }),
});

export type CreateBucketRequest = z.infer<typeof createBucketRequestSchema>;
export type UpdateBucketRequest = z.infer<typeof updateBucketRequestSchema>;
export type ListObjectsResponseSchema = z.infer<
  typeof listObjectsResponseSchema
>;
