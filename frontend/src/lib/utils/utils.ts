import { ColumnType } from '@insforge/shared-schemas';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const validateEmail = (email: string) => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
};

// Map database types to frontend FieldType
export const mapDatabaseTypeToFieldType = (dbType: string): ColumnType => {
  switch (dbType.toLocaleLowerCase()) {
    case 'uuid':
      return ColumnType.UUID;
    case 'timestamp with time zone':
      return ColumnType.DATETIME;
    case 'integer':
      return ColumnType.INTEGER;
    case 'double precision':
      return ColumnType.FLOAT;
    case 'boolean':
      return ColumnType.BOOLEAN;
    case 'jsonb':
      return ColumnType.JSON;
    case 'text':
    default:
      return ColumnType.STRING;
  }
};

// Map analytics log source names to display names
export const getSourceDisplayName = (sourceName: string): string => {
  const sourceMap: Record<string, string> = {
    'cloudflare.logs.prod': 'insforge.logs',
    'deno-relay-logs': 'function.logs',
    'postgREST.logs.prod': 'postgREST.logs',
    'postgres.logs': 'postgres.logs'
  };
  
  return sourceMap[sourceName] || sourceName;
};

// Map display names back to original source names for API calls
export const getOriginalSourceName = (displayName: string): string => {
  const reverseMap: Record<string, string> = {
    'insforge.logs': 'cloudflare.logs.prod',
    'function.logs': 'deno-relay-logs',
    'postgREST.logs': 'postgREST.logs.prod',
    'postgres.logs': 'postgres.logs'
  };
  
  return reverseMap[displayName] || displayName;
};
