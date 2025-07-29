import { z } from 'zod';
import { FieldType } from '@/lib/types/schema';

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  unique?: boolean;
  default_value: any;
}

// Foreign key schema
export const foreignKeySchema = z.object({
  table: z.string(),
  column: z.string(),
  on_delete: z.enum(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).default('NO ACTION'),
  on_update: z.enum(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).default('NO ACTION'),
});

// Field validation schema
export const fieldSchema = z.object({
  name: z
    .string()
    .min(1, 'Field name is required')
    .regex(/^[^"\x00-\x1F\x7F]+$/, 'Field name cannot contain quotes or control characters')
    .refine((name) => name.trim().length > 0, 'Field name cannot be only whitespace'),
  type: z.nativeEnum(FieldType),
  nullable: z.boolean().default(true),
  unique: z.boolean().default(false),
  default_value: z.string().optional(),
  foreign_key: foreignKeySchema.optional(),
  field_id: z.string().uuid().optional(),
  // Internal tracking field (not sent to backend), use to detect renames
  originalName: z.string().optional(),
  isSystemField: z.boolean().default(false),
});

// Table form schema
export const tableFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Table name is required')
    .regex(/^[^"\x00-\x1F\x7F]+$/, 'Table name cannot contain quotes or control characters')
    .refine((name) => name.trim().length > 0, 'Table name cannot be only whitespace'),
  fields: z.array(fieldSchema).min(1, 'At least one field is required'),
});

// Type exports
export type FieldFormData = z.infer<typeof fieldSchema>;
export type TableFormData = z.infer<typeof tableFormSchema>;
