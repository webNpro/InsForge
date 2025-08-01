import { Type, Calendar, Hash, Percent, ToggleLeft, Fingerprint, Code } from 'lucide-react';
import { ColumnTypeSchema } from '@schemas/database.schema';

// Icon mapping for field types
export const columnTypeIcons: Record<
  ColumnTypeSchema,
  React.ComponentType<{ className?: string }>
> = {
  STRING: Type,
  DATETIME: Calendar,
  INTEGER: Hash,
  FLOAT: Percent,
  BOOLEAN: ToggleLeft,
  UUID: Fingerprint,
  JSON: Code,
};

// Field type descriptions
export const columnTypeDescriptions: Record<ColumnTypeSchema, string> = {
  STRING: 'Text values of any length',
  INTEGER: 'Whole numbers without decimals',
  FLOAT: 'Numbers with decimal places',
  BOOLEAN: 'True or false values',
  DATETIME: 'Date and time values',
  UUID: 'Unique identifiers (auto-generated)',
  JSON: 'Complex structured data',
};
