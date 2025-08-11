import { z } from 'zod';

/**
 * Core auth entity schemas (PostgreSQL structure)
 * These define the fundamental auth data models
 */

// ============================================================================
// Base field schemas
// ============================================================================

export const userIdSchema = z.string().uuid('Invalid user ID format');

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password must be less than 100 characters');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .trim();

export const roleSchema = z.enum(['authenticated', 'project_admin']);

export const oauthProviderSchema = z.enum(['google', 'github']);

// ============================================================================
// Core entity schemas
// ============================================================================

/**
 * User entity schema - represents the _user table in PostgreSQL
 */
export const userSchema = z.object({
  id: userIdSchema,
  email: emailSchema,
  name: z.string().nullable(),
  emailVerified: z.boolean(),
  createdAt: z.string(), // PostgreSQL timestamp
  updatedAt: z.string(), // PostgreSQL timestamp
});

/**
 * Session entity schema - represents user sessions
 */
export const sessionSchema = z.object({
  id: z.string(),
  userId: userIdSchema,
  token: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
});

/**
 * OAuth account entity schema - represents OAuth provider connections
 */
export const oauthAccountSchema = z.object({
  id: z.string(),
  userId: userIdSchema,
  provider: oauthProviderSchema,
  providerUserId: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * OAuth state for redirect handling
 */
export const oauthStateSchema = z.object({
  provider: oauthProviderSchema,
  redirectUrl: z.string().url().optional(),
});

/**
 * JWT token payload schema
 */
export const tokenPayloadSchema = z.object({
  sub: userIdSchema, // Subject (user ID)
  email: emailSchema,
  role: roleSchema,
  iat: z.number().optional(), // Issued at
  exp: z.number().optional(), // Expiration
});

// ============================================================================
// Type exports
// ============================================================================

export type UserId = z.infer<typeof userIdSchema>;
export type Email = z.infer<typeof emailSchema>;
export type Password = z.infer<typeof passwordSchema>;
export type Role = z.infer<typeof roleSchema>;
export type OauthProvider = z.infer<typeof oauthProviderSchema>;

export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type OauthAccount = z.infer<typeof oauthAccountSchema>;
export type OauthState = z.infer<typeof oauthStateSchema>;
export type TokenPayload = z.infer<typeof tokenPayloadSchema>;