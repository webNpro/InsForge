import { z } from 'zod';

// Common field schemas
export const emailSchema = z.string().min(1, 'Email is required').email('Invalid email address');

export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export const requiredStringSchema = z.string().min(1, 'This field is required');

export const optionalStringSchema = z.string().optional().nullable();

export const numberSchema = z.number().or(z.string().regex(/^\d+$/).transform(Number));

export const booleanSchema = z.boolean().or(z.string().transform((val) => val === 'true'));

export const dateSchema = z
  .string()
  .or(z.date())
  .transform((val) => new Date(val));

export const uuidSchema = z.string().uuid('Invalid UUID format');

// Common form schemas
export const loginFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const userFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: requiredStringSchema,
  role: z.enum(['admin', 'user']).default('user'),
});

export const tableFieldSchema = z.object({
  name: z
    .string()
    .min(1, 'Field name is required')
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      'Field name must start with a letter and contain only letters, numbers, and underscores'
    ),
  // type: z.enum(['string', 'integer', 'float', 'boolean', 'datetime', 'json', 'file']),
  type: z.enum(['string', 'integer', 'float', 'boolean', 'datetime', 'json']),
  nullable: z.boolean().default(true),
  unique: z.boolean().default(false),
  default_value: z.any().optional(),
});

export const tableFormSchema = z.object({
  name: z
    .string()
    .min(1, 'table name is required')
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      'table name must start with a letter and contain only letters, numbers, and underscores'
    ),
  fields: z.array(tableFieldSchema).min(1, 'At least one field is required'),
});

// Type exports
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type UserFormData = z.infer<typeof userFormSchema>;
export type tableFieldData = z.infer<typeof tableFieldSchema>;
export type tableFormData = z.infer<typeof tableFormSchema>;
