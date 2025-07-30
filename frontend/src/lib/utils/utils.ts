import { FieldType } from '@/lib/types/schema';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const validateEmail = (email: string) => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
};

// Map database types to frontend FieldType
export const mapDatabaseTypeToFieldType = (dbType: string): FieldType => {
  const type = dbType.toLowerCase();

  // Handle various database type representations
  if (type.includes('text') || type.includes('varchar') || type.includes('character')) {
    return FieldType.STRING;
  }
  if (type.includes('timestamptz') || type.includes('datetime') || type.includes('date')) {
    return FieldType.DATETIME;
  }
  if (type.includes('int') && !type.includes('point')) {
    return FieldType.INTEGER;
  }
  if (
    type.includes('real') ||
    type.includes('float') ||
    type.includes('double') ||
    type.includes('decimal') ||
    type.includes('numeric')
  ) {
    return FieldType.FLOAT;
  }
  if (type.includes('bool')) {
    return FieldType.BOOLEAN;
  }
  if (type.includes('uuid')) {
    return FieldType.UUID;
  }
  if (type.includes('json')) {
    return FieldType.JSON;
  }

  // Default to string for unknown types
  return FieldType.STRING;
};
