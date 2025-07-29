// Type definitions for schema management

export enum FieldType {
  STRING = 'string',
  DATETIME = 'datetime',
  INTEGER = 'integer',
  FLOAT = 'float',
  BOOLEAN = 'boolean',
  UUID = 'uuid',
  JSON = 'json',
  // FILE = 'file'
}

export interface FieldTypeInfo {
  type: FieldType;
  sqlType: string;
  defaultValue: string | null;
  description: string;
  icon?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// Map frontend types to SQLite types with metadata
export const FIELD_TYPES: Record<FieldType, FieldTypeInfo> = {
  [FieldType.STRING]: {
    type: FieldType.STRING,
    sqlType: 'TEXT',
    defaultValue: null,
    description: 'Text up to 255 characters',
    icon: 'text',
  },
  [FieldType.DATETIME]: {
    type: FieldType.DATETIME,
    sqlType: 'TEXT',
    defaultValue: 'CURRENT_TIMESTAMP',
    description: 'Date and time in ISO format',
    icon: 'calendar',
  },
  [FieldType.INTEGER]: {
    type: FieldType.INTEGER,
    sqlType: 'INTEGER',
    defaultValue: null,
    description: 'Whole numbers',
    icon: 'hash',
  },
  [FieldType.FLOAT]: {
    type: FieldType.FLOAT,
    sqlType: 'REAL',
    defaultValue: null,
    description: 'Decimal numbers',
    icon: 'percent',
  },
  [FieldType.BOOLEAN]: {
    type: FieldType.BOOLEAN,
    sqlType: 'INTEGER',
    defaultValue: '0',
    description: 'True/false values (stored as 0/1)',
    icon: 'toggle',
  },
  [FieldType.UUID]: {
    type: FieldType.UUID,
    sqlType: 'TEXT',
    defaultValue: 'AUTO_GENERATE',
    description: 'Unique identifier (auto-generated)',
    icon: 'fingerprint',
  },
  [FieldType.JSON]: {
    type: FieldType.JSON,
    sqlType: 'TEXT',
    defaultValue: null,
    description: 'Structured JSON data',
    icon: 'code',
  },
};

export interface ColumnDefinition {
  name: string;
  type: FieldType;
  nullable: boolean;
  unique?: boolean;
  defaultValue?: string;
  foreign_key?: {
    table: string;
    column: string;
    on_delete?: string;
    on_update?: string;
  };
}

export interface CreateTableRequest {
  table_name: string;
  columns: ColumnDefinition[];
}

// Export field types as an array for use in dropdowns
export const FIELD_TYPES_ARRAY = Object.values(FieldType);
