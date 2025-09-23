import { ColumnType } from '@insforge/shared-schemas';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';
import {
  uuidSchema,
  integerSchema,
  floatSchema,
  booleanSchema,
  dateSchema,
  dateTimeSchema,
  jsonSchema,
  stringSchema,
} from './validation-schemas';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ConvertedValue = string | number | boolean | null | JSON;

export type ValueConversionResult =
  | { success: true; value: ConvertedValue }
  | { success: false; error: string };

/**
 * Convert and validate a string value based on the specified ColumnType
 */
export function convertValueForColumn(
  type: ColumnType | string,
  value: string | null | undefined
): ValueConversionResult {
  try {
    let convertedValue;

    switch (type) {
      case ColumnType.UUID:
        convertedValue = uuidSchema.parse(value);
        break;
      case ColumnType.INTEGER:
        convertedValue = integerSchema.parse(value);
        break;
      case ColumnType.FLOAT:
        convertedValue = floatSchema.parse(value);
        break;
      case ColumnType.BOOLEAN:
        convertedValue = booleanSchema.parse(value);
        break;
      case ColumnType.DATE:
        convertedValue = dateSchema.parse(value);
        break;
      case ColumnType.DATETIME:
        convertedValue = dateTimeSchema.parse(value);
        break;
      case ColumnType.JSON:
        convertedValue = jsonSchema.parse(value);
        break;
      case ColumnType.STRING:
        convertedValue = stringSchema.parse(value);
        break;
      default:
        return {
          success: false,
          error: `Unsupported column type: ${type}`,
        };
    }

    return {
      success: true,
      value: convertedValue,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Validation failed',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown conversion error',
    };
  }
}

/**
 * Generate a UUID v4 using the uuid library
 * Works in all browsers and contexts (secure and non-secure)
 * Uses crypto.getRandomValues when available, falls back to Math.random
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Check if a value is considered empty for database purposes
 */
export function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

export const isInsForgeCloudProject = () => {
  return window.location.hostname.endsWith('.insforge.app');
};
