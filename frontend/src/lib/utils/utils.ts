import { ColumnTypeSchema } from '@schemas/database.schema';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const validateEmail = (email: string) => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
};

// Map database types to frontend FieldType
export const mapDatabaseTypeToFieldType = (dbType: string): ColumnTypeSchema => {
  const type = dbType.toLowerCase();

  // Handle various database type representations
  if (type.includes('text') || type.includes('varchar') || type.includes('character')) {
    return 'STRING';
  }
  if (type.includes('timestamptz') || type.includes('datetime') || type.includes('date')) {
    return 'DATETIME';
  }
  if (type.includes('int') && !type.includes('point')) {
    return 'INTEGER';
  }
  if (
    type.includes('real') ||
    type.includes('float') ||
    type.includes('double') ||
    type.includes('decimal') ||
    type.includes('numeric')
  ) {
    return 'FLOAT';
  }
  if (type.includes('bool')) {
    return 'BOOLEAN';
  }
  if (type.includes('uuid')) {
    return 'UUID';
  }
  if (type.includes('json')) {
    return 'JSON';
  }

  // Default to string for unknown types
  return 'STRING';
};
