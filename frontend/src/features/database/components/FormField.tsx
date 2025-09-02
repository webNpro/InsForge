import React, { useState } from 'react';
import { Control, Controller, UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/radix/Input';
import { Label } from '@/components/radix/Label';
import { Badge } from '@/components/radix/Badge';
import { Button } from '@/components/radix/Button';
import { Calendar, Link2, X } from 'lucide-react';
import { BooleanCellEditor } from './BooleanCellEditor';
import { DateCellEditor } from './DateCellEditor';
import { JsonCellEditor } from './JsonCellEditor';
import { LinkRecordModal } from './LinkRecordModal';
import { ColumnSchema, ColumnType } from '@insforge/shared-schemas';
import { convertValueForColumn } from '@/lib/utils/utils';

// Type for database records
type DatabaseRecord = Record<string, any>;

// Form adapters for edit cell components
interface FormBooleanEditorProps {
  value: boolean | null;
  nullable: boolean;
  onChange: (value: boolean | null) => void;
  hasForeignKey?: boolean;
}

function FormBooleanEditor({ value, nullable, onChange, hasForeignKey }: FormBooleanEditorProps) {
  const [showEditor, setShowEditor] = useState(false);

  const handleValueChange = (newValue: string) => {
    if (newValue === 'null') {
      onChange(null);
    } else {
      onChange(newValue === 'true');
    }
    setShowEditor(false);
  };

  const handleCancel = () => {
    setShowEditor(false);
  };

  if (showEditor) {
    return (
      <BooleanCellEditor
        value={value}
        nullable={nullable}
        onValueChange={handleValueChange}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setShowEditor(true)}
      className={`w-full justify-start h-10 dark:text-white dark:placeholder:text-neutral-400 dark:border-neutral-700 ${hasForeignKey ? 'pr-20' : ''}`}
    >
      {value === null ? 'null' : value ? 'true' : 'false'}
    </Button>
  );
}

interface FormDateEditorProps {
  value: string | null;
  type?: 'date' | 'datetime';
  nullable: boolean;
  onChange: (value: string | null) => void;
  hasForeignKey?: boolean;
}

function FormDateEditor({
  value,
  type = 'datetime',
  nullable,
  onChange,
  hasForeignKey,
}: FormDateEditorProps) {
  const [showEditor, setShowEditor] = useState(false);

  const handleValueChange = (newValue: string | null) => {
    if (newValue === 'null' || newValue === null) {
      onChange(null);
    } else {
      onChange(newValue);
    }
    setShowEditor(false);
  };

  const handleCancel = () => {
    setShowEditor(false);
  };

  if (showEditor) {
    return (
      <DateCellEditor
        value={value}
        type={type}
        nullable={nullable}
        onValueChange={handleValueChange}
        onCancel={handleCancel}
      />
    );
  }

  const formatDisplayValue = () => {
    if (!value || value === 'null') {
      return 'Select date...';
    }

    const d = new Date(value);
    if (type === 'datetime') {
      return d.toLocaleString();
    }
    return d.toLocaleDateString();
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setShowEditor(true)}
      className={`w-full justify-start h-10 dark:text-white dark:placeholder:text-neutral-400 dark:border-neutral-700 ${hasForeignKey ? 'pr-20' : ''}`}
    >
      <Calendar className="mr-2 h-4 w-4" />
      {formatDisplayValue()}
    </Button>
  );
}

interface FormJsonEditorProps {
  value: string | null;
  nullable: boolean;
  onChange: (value: string | null) => void;
  hasForeignKey?: boolean;
}

function FormJsonEditor({ value, nullable, onChange, hasForeignKey }: FormJsonEditorProps) {
  const [showEditor, setShowEditor] = useState(false);

  const handleValueChange = (newValue: string) => {
    onChange(newValue);
    setShowEditor(false);
  };

  const handleCancel = () => {
    setShowEditor(false);
  };

  if (showEditor) {
    return (
      <JsonCellEditor
        value={value}
        nullable={nullable}
        onValueChange={handleValueChange}
        onCancel={handleCancel}
      />
    );
  }

  const formatDisplayValue = () => {
    if (!value || value === 'null') {
      return 'Empty JSON';
    }

    try {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return '{}';
      }
      if (keys.length === 1) {
        return `{ ${keys[0]}: ... }`;
      }
      return `{ ${keys.length} properties }`;
    } catch {
      return 'Invalid JSON';
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setShowEditor(true)}
      className={`w-full justify-start h-10 dark:text-white dark:placeholder:text-neutral-400 dark:border-neutral-700 ${hasForeignKey ? 'pr-20' : ''}`}
    >
      {formatDisplayValue()}
    </Button>
  );
}

interface FormFieldProps {
  field: ColumnSchema;
  form: UseFormReturn<any>;
  tableName: string;
}

// Helper component to render field label with type badge
function FieldLabel({
  field,
  tableName,
  children,
}: {
  field: ColumnSchema;
  tableName: string;
  children?: React.ReactNode;
}) {
  return (
    <Label htmlFor={`${tableName}-${field.columnName}`} className="flex items-center gap-2">
      <Badge
        variant="database"
        size="sm"
        className="w-12 h-6 dark:bg-neutral-900 dark:border-neutral-700"
      >
        {field.type}
      </Badge>
      <span className="text-sm text-black dark:text-white truncate block w-9/10">
        {field.columnName}
        {!field.isNullable && field.columnName !== 'id' && (
          <span className="text-red-500 dark:text-red-400 ml-1">*</span>
        )}
      </span>
      {children}
    </Label>
  );
}

// Generic component for any field type with foreign key linking
interface FieldWithLinkProps {
  field: ColumnSchema;
  control: Control<any, any, any>;
  children: React.ReactNode;
}

function FieldWithLink({ field, control, children }: FieldWithLinkProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);

  if (!field.foreignKey) {
    // Regular field without foreign key
    return <>{children}</>;
  }

  // Field with foreign key linking capability - integrated design
  return (
    <>
      <Controller
        control={control}
        name={field.columnName}
        render={({ field: formField }) => {
          const hasLinkedValue = formField.value && formField.value !== '';

          // Clone children and add disabled state and padding for linked values
          const childElement = children as React.ReactElement<any>;
          const existingClassName = childElement.props.className || '';
          const paddingClass = hasLinkedValue ? 'pr-20' : 'pr-11';
          const modifiedChildren = React.cloneElement(childElement, {
            value: formField.value,
            disabled: hasLinkedValue,
            className: `${existingClassName} ${paddingClass}`.trim(),
          });

          return (
            <>
              <div className="space-y-1">
                <div className="relative">
                  {modifiedChildren}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
                    {hasLinkedValue && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => formField.onChange('')}
                        className="h-7 w-7 p-1 flex-shrink-0 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:text-neutral-400 dark:hover:text-red-400 dark:hover:bg-red-950/20"
                        title="Clear linked record"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowLinkModal(true)}
                      className="rounded-l-none h-9 w-9 p-2 flex-shrink-0 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 border-l border-zinc-200 dark:border-neutral-700"
                      title={
                        hasLinkedValue
                          ? `Change linked ${field.foreignKey?.referenceTable} record`
                          : `Link to ${field.foreignKey?.referenceTable} record`
                      }
                    >
                      <Link2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Foreign Key Relationship Info */}
                <div className="text-xs text-medium text-black dark:text-neutral-400 flex items-center gap-1.5">
                  <span>Has a Foreign Key relation to</span>
                  <Badge variant="database" size="sm" className="dark:bg-neutral-700">
                    {field.foreignKey?.referenceTable}.{field.foreignKey?.referenceColumn}
                  </Badge>
                </div>
              </div>

              <LinkRecordModal
                open={showLinkModal}
                onOpenChange={setShowLinkModal}
                referenceTable={field.foreignKey!.referenceTable}
                referenceColumn={field.foreignKey!.referenceColumn}
                currentValue={formField.value}
                onSelectRecord={(record: DatabaseRecord) => {
                  // Use the referenced column value instead of id
                  const referenceValue = record[field.foreignKey!.referenceColumn];
                  formField.onChange(referenceValue);
                }}
              />
            </>
          );
        }}
      />
    </>
  );
}

export function FormField({ field, form, tableName }: FormFieldProps) {
  const {
    control,
    register,
    formState: { errors },
  } = form;

  // TODO: This is a mess, we need to clean it up. To fix in future.
  const renderField = () => {
    // Infer frontend type from field name and SQLite type

    switch (field.type) {
      case ColumnType.BOOLEAN:
        return (
          <div className="grid grid-cols-6 gap-x-10">
            <div className="col-span-2">
              <FieldLabel field={field} tableName={tableName} />
            </div>
            <div className="col-span-4">
              <FieldWithLink field={field} control={control}>
                <Controller
                  control={control}
                  name={field.columnName}
                  render={({ field: formField }) => (
                    <FormBooleanEditor
                      value={formField.value}
                      nullable={field.isNullable}
                      onChange={formField.onChange}
                      hasForeignKey={!!field.foreignKey}
                    />
                  )}
                />
              </FieldWithLink>
            </div>
          </div>
        );

      case ColumnType.INTEGER:
      case ColumnType.FLOAT:
        return (
          <div className="grid grid-cols-6 gap-x-10">
            <div className="col-span-2">
              <FieldLabel field={field} tableName={tableName} />
            </div>
            <div className="col-span-4">
              <FieldWithLink field={field} control={control}>
                <Controller
                  control={control}
                  name={field.columnName}
                  render={({ field: formField }) => (
                    <Input
                      id={`${tableName}-${field.columnName}`}
                      type="number"
                      step={field.type === ColumnType.FLOAT ? '0.01' : '1'}
                      value={formField.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          // Handle empty value based on nullability
                          formField.onChange(field.isNullable ? null : 0);
                        } else {
                          const numValue =
                            field.type === ColumnType.INTEGER
                              ? parseInt(value, 10)
                              : parseFloat(value);
                          formField.onChange(
                            isNaN(numValue) ? (field.isNullable ? null : 0) : numValue
                          );
                        }
                      }}
                      placeholder={field.isNullable ? 'Optional' : 'Required'}
                      className="dark:text-white dark:placeholder:text-neutral-400 dark:border-neutral-700"
                    />
                  )}
                />
              </FieldWithLink>
            </div>
          </div>
        );

      case ColumnType.DATETIME:
        return (
          <div className="grid grid-cols-6 gap-x-10">
            <div className="col-span-2">
              <FieldLabel field={field} tableName={tableName} />
            </div>
            <div className="col-span-4">
              <FieldWithLink field={field} control={control}>
                <Controller
                  control={control}
                  name={field.columnName}
                  render={({ field: formField }) => (
                    <FormDateEditor
                      value={formField.value}
                      type="datetime"
                      nullable={field.isNullable}
                      onChange={formField.onChange}
                      hasForeignKey={!!field.foreignKey}
                    />
                  )}
                />
              </FieldWithLink>
            </div>
          </div>
        );

      case ColumnType.JSON:
        return (
          <div className="grid grid-cols-6 gap-x-10">
            <div className="col-span-2">
              <FieldLabel field={field} tableName={tableName} />
            </div>
            <div className="col-span-4">
              <FieldWithLink field={field} control={control}>
                <Controller
                  control={control}
                  name={field.columnName}
                  render={({ field: formField }) => {
                    return (
                      <FormJsonEditor
                        value={formField.value}
                        nullable={field.isNullable}
                        onChange={(newValue) => {
                          const result = convertValueForColumn(ColumnType.JSON, newValue);
                          if (result.success) {
                            formField.onChange(result.value as JSON);
                          } else {
                            // If parsing fails, keep the string value
                            formField.onChange(newValue);
                          }
                        }}
                      />
                    );
                  }}
                />
              </FieldWithLink>
            </div>
          </div>
        );

      case ColumnType.UUID:
        return (
          <div className="grid grid-cols-6 gap-x-10">
            <div className="col-span-2">
              <FieldLabel field={field} tableName={tableName} />
            </div>
            <div className="col-span-4">
              <FieldWithLink field={field} control={control}>
                <Input
                  id={`${tableName}-${field.columnName}`}
                  type="text"
                  {...register(field.columnName)}
                  placeholder="Auto-generated if empty"
                  className="dark:text-white dark:placeholder:text-neutral-400 dark:bg-neutral-900 dark:border-neutral-700"
                />
              </FieldWithLink>
            </div>
          </div>
        );

      case ColumnType.STRING:
      default:
        return (
          <div className="grid grid-cols-6 gap-x-10">
            <div className="col-span-2">
              <FieldLabel field={field} tableName={tableName} />
            </div>
            <div className="col-span-4">
              <FieldWithLink field={field} control={control}>
                <Input
                  id={`${tableName}-${field.columnName}`}
                  type={field.columnName === 'password' ? 'password' : 'text'}
                  {...register(field.columnName)}
                  placeholder={field.isNullable ? 'Optional' : 'Required'}
                  className="dark:text-white dark:placeholder:text-neutral-400 dark:bg-neutral-900 dark:border-neutral-700"
                />
              </FieldWithLink>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      {renderField()}
      {errors[field.columnName] && (
        <p className="text-sm text-red-500 dark:text-red-400">
          {(errors[field.columnName] as any)?.message || `${field.columnName} is required`}
        </p>
      )}
    </div>
  );
}
