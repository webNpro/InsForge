import { Type, Calendar, Hash, Percent, ToggleLeft, Fingerprint, Code } from 'lucide-react';
import { FieldType } from '@/lib/types/schema';

// Icon mapping for field types
export const fieldIcons: Record<FieldType, React.ComponentType<{ className?: string }>> = {
  [FieldType.STRING]: Type,
  [FieldType.DATETIME]: Calendar,
  [FieldType.INTEGER]: Hash,
  [FieldType.FLOAT]: Percent,
  [FieldType.BOOLEAN]: ToggleLeft,
  [FieldType.UUID]: Fingerprint,
  [FieldType.JSON]: Code,
  // [FieldType.FILE]: FileText,
};

// Default field values
export const defaultField = {
  name: '',
  type: FieldType.STRING,
  nullable: true,
  unique: false,
  default_value: '',
};

// Field type descriptions
export const fieldTypeDescriptions: Record<FieldType, string> = {
  [FieldType.STRING]: 'Text values of any length',
  [FieldType.INTEGER]: 'Whole numbers without decimals',
  [FieldType.FLOAT]: 'Numbers with decimal places',
  [FieldType.BOOLEAN]: 'True or false values',
  [FieldType.DATETIME]: 'Date and time values',
  [FieldType.UUID]: 'Unique identifiers (auto-generated)',
  [FieldType.JSON]: 'Complex structured data',
  // [FieldType.FILE]: 'File attachments with metadata',
};
