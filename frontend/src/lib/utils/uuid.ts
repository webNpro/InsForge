import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a UUID v4 using the uuid library
 * Works in all browsers and contexts (secure and non-secure)
 * Uses crypto.getRandomValues when available, falls back to Math.random
 */
export function generateUUID(): string {
  return uuidv4();
}
