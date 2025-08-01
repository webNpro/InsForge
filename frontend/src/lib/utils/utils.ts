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
  switch (dbType.toLocaleLowerCase()) {
    case 'uuid':
      return 'UUID';
    case 'text':
      return 'STRING';
    case 'timestamp with time zone':
      return 'DATETIME';
    case 'integer':
      return 'INTEGER';
    case 'double precision':
      return 'FLOAT';
    case 'boolean':
      return 'BOOLEAN';
    case 'jsonb':
      return 'JSON';
    default:
      return 'STRING';
  }
};
