import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus, X, Link, MoveRight, Pencil } from 'lucide-react';
import { Button } from '@/components/radix/Button';
import { Input } from '@/components/radix/Input';
import { Alert, AlertDescription } from '@/components/radix/Alert';
import { databaseService } from '@/features/database/services/database.service';
import { tableFormSchema, TableFormData } from '../schema';
import { defaultField } from '../constants';
import { mapDatabaseTypeToFieldType } from '@/lib/utils/utils';
import { useToast } from '@/lib/hooks/useToast';
import { FieldRow } from './FieldRow';
import { ForeignKeyPopover } from './ForeignKeyPopover';
import { FieldType } from '@/lib/types/schema';
import { generateUUID } from '@/lib/utils/uuid';

// System fields that cannot be modified
const SYSTEM_FIELDS = ['id', 'created_at', 'updated_at'];

interface TableFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  mode?: 'create' | 'edit';
  editTable?: {
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      unique?: boolean;
      default_value?: string | null;
      foreign_key?: {
        table: string;
        column: string;
        on_delete?: string;
        on_update?: string;
      };
    }>;
  };
}

export function TableForm({
  open,
  onOpenChange,
  onSuccess,
  mode = 'create',
  editTable,
}: TableFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [showForeignKeyDialog, setShowForeignKeyDialog] = useState(false);
  const [editingForeignKey, setEditingForeignKey] = useState<string | null>(null);
  const [foreignKeys, setForeignKeys] = useState<
    Array<{
      id: string;
      field: string;
      references_table: string;
      references_column: string;
      on_delete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
      on_update: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    }>
  >([]);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const form = useForm<TableFormData>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      name: '',
      fields:
        mode === 'create'
          ? [
              {
                ...defaultField,
                name: 'id',
                type: FieldType.UUID,
                default_value: 'gen_random_uuid()',
                nullable: false,
                unique: true,
                isSystemField: true,
              },
              {
                ...defaultField,
                name: 'created_at',
                type: FieldType.DATETIME,
                default_value: 'CURRENT_TIMESTAMP',
                nullable: false,
                unique: false,
                isSystemField: true,
              },
              {
                ...defaultField,
                name: 'updated_at',
                type: FieldType.DATETIME,
                default_value: 'CURRENT_TIMESTAMP',
                nullable: false,
                unique: false,
                isSystemField: true,
              },
              { ...defaultField, name: '', type: FieldType.STRING, nullable: true, unique: false },
            ]
          : [{ ...defaultField }],
    },
  });

  // Reset form when switching between modes or when editTable changes
  useEffect(() => {
    // Clear error when effect runs
    setError(null);

    if (open && mode === 'edit' && editTable) {
      form.reset({
        name: editTable.name,
        fields: editTable.columns.map((col) => ({
          name: col.name,
          type: mapDatabaseTypeToFieldType(col.type),
          nullable: col.nullable,
          unique: col.unique || false,
          default_value: col.default_value || '',
          field_id: generateUUID(),
          originalName: col.name, // Track original name for rename detection
          isSystemField: SYSTEM_FIELDS.includes(col.name),
        })),
      });

      // Set foreign keys from editTable
      const existingForeignKeys = editTable.columns
        .filter((col) => !SYSTEM_FIELDS.includes(col.name) && col.foreign_key)
        .map((col) => ({
          id: generateUUID(),
          field: col.name,
          references_table: col.foreign_key?.table ?? '',
          references_column: col.foreign_key?.column ?? '',
          on_delete: (col.foreign_key?.on_delete || 'NO ACTION') as
            | 'CASCADE'
            | 'SET NULL'
            | 'RESTRICT'
            | 'NO ACTION',
          on_update: (col.foreign_key?.on_update || 'NO ACTION') as
            | 'CASCADE'
            | 'SET NULL'
            | 'RESTRICT'
            | 'NO ACTION',
        }));
      setForeignKeys(existingForeignKeys);
    } else {
      form.reset({
        name: '',
        fields: [
          {
            ...defaultField,
            name: 'id',
            type: FieldType.UUID,
            default_value: 'gen_random_uuid()',
            nullable: false,
            unique: true,
            isSystemField: true,
          },
          {
            ...defaultField,
            name: 'created_at',
            type: FieldType.DATETIME,
            default_value: 'CURRENT_TIMESTAMP',
            nullable: false,
            unique: false,
            isSystemField: true,
          },
          {
            ...defaultField,
            name: 'updated_at',
            type: FieldType.DATETIME,
            default_value: 'CURRENT_TIMESTAMP',
            nullable: false,
            unique: false,
            isSystemField: true,
          },
          { ...defaultField, name: '', type: FieldType.STRING, nullable: true, unique: false },
        ],
      });
      setForeignKeys([]);
    }
  }, [mode, editTable, form, open]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'fields',
  });

  const sortedFields = useMemo(() => {
    return [...fields].sort((a, b) => {
      // System fields come first
      if (a.isSystemField && !b.isSystemField) {
        return -1;
      }
      if (!a.isSystemField && b.isSystemField) {
        return 1;
      }

      // Within system fields, maintain the order: id, created_at, updated_at
      if (a.isSystemField && b.isSystemField) {
        const systemFieldOrder = ['id', 'created_at', 'updated_at'];
        return systemFieldOrder.indexOf(a.name) - systemFieldOrder.indexOf(b.name);
      }

      // Keep original order for non-system fields
      return 0;
    });
  }, [fields]);

  const createTableMutation = useMutation({
    mutationFn: async (data: TableFormData) => {
      const columns = data.fields.map((field) => {
        // Find foreign key for this field if it exists
        const foreignKey = foreignKeys.find((fk) => fk.field === field.name);

        return {
          name: field.name,
          type: field.type,
          nullable: field.nullable,
          unique: field.unique,
          default_value: field.default_value || null,
          // Embed foreign key information directly in the column
          ...(foreignKey && {
            foreign_key: {
              table: foreignKey.references_table,
              column: foreignKey.references_column,
              on_delete: foreignKey.on_delete,
              on_update: foreignKey.on_update,
            },
          }),
        };
      });

      return databaseService.createTable(data.name, columns);
    },
    onSuccess: (_) => {
      void queryClient.invalidateQueries({ queryKey: ['metadata'] });
      void queryClient.invalidateQueries({ queryKey: ['tables'] });

      showToast('Table created successfully!', 'success');

      onOpenChange(false);
      form.reset();
      setError(null);
      setForeignKeys([]);
      onSuccess?.();
    },
    onError: (err: any) => {
      const errorMessage = err.message || 'Failed to create table';
      setError(errorMessage);
      showToast('Failed to create table', 'error');
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: async (data: TableFormData) => {
      if (!editTable) {
        return;
      }

      // System columns that cannot be modified
      const SYSTEM_FIELDS = ['id', 'created_at', 'updated_at'];

      // Compare fields to determine what operations to perform
      const operations = {
        add_columns: [] as any[],
        drop_columns: [] as any[],
        rename_columns: {} as Record<string, string>,
        add_fkey_columns: [] as any[],
        drop_fkey_columns: [] as any[],
      };

      // Filter out system columns from existing fields for comparison
      const existingUserColumns = editTable.columns.filter(
        (col) => !SYSTEM_FIELDS.includes(col.name)
      );

      // Track which original columns we've seen
      const processedOriginalColumns = new Set<string>();

      // Process each field
      data.fields.forEach((field: any) => {
        if (field.originalName) {
          // This field existed before
          processedOriginalColumns.add(field.originalName);

          // Check if it was renamed
          if (field.originalName !== field.name) {
            operations['rename_columns'][field.originalName] = field.name;
          }
        } else {
          // This is a new field (added via Add Field button)
          const { originalName, ...fieldData } = field;
          operations['add_columns'].push({
            ...fieldData,
            default_value: fieldData.default_value || null,
          });
        }
      });

      // Find dropped columns
      existingUserColumns.forEach((col) => {
        if (!processedOriginalColumns.has(col.name)) {
          operations['drop_columns'].push({
            name: col.name,
          });
        }
      });

      // Handle foreign keys
      // Get existing foreign keys from editTable
      const existingForeignKeys = existingUserColumns
        .filter((col) => col.foreign_key)
        .map((col) => ({
          field: col.name,
          ...col.foreign_key,
        }));

      // Compare with new foreign keys
      foreignKeys.forEach((fk) => {
        const existingFK = existingForeignKeys.find((efk) => efk.field === fk.field);

        if (!existingFK) {
          // This is a new foreign key
          operations['add_fkey_columns'].push({
            name: fk.field,
            foreign_key: {
              table: fk.references_table,
              column: fk.references_column,
              on_delete: fk.on_delete,
              on_update: fk.on_update,
            },
          });
        }
      });

      // Check for dropped foreign keys
      existingForeignKeys.forEach((efk) => {
        const stillExists = foreignKeys.find((fk) => fk.field === efk.field);
        if (!stillExists) {
          // This foreign key was removed
          operations['drop_fkey_columns'].push({
            name: efk.field,
          });
        }
      });

      return databaseService.modifyTable(data.name, operations);
    },
    onSuccess: (_, data) => {
      void queryClient.invalidateQueries({ queryKey: ['metadata'] });
      void queryClient.invalidateQueries({ queryKey: ['tables'] });

      // Invalidate all table data queries for this table (with all parameter combinations)
      void queryClient.invalidateQueries({ queryKey: ['table', editTable?.name] });

      // Invalidate the separate table schema query used by AddRecordSheet
      void queryClient.invalidateQueries({ queryKey: ['table-schema', editTable?.name] });

      showToast(`Table "${data.name}" updated successfully!`, 'success');

      onOpenChange(false);
      form.reset();
      setError(null);
      setForeignKeys([]);
      onSuccess?.();
    },
    onError: (err: any) => {
      // Invalidate queries to ensure we have fresh data after failed request
      void queryClient.invalidateQueries({ queryKey: ['table', editTable?.name] });
      void queryClient.invalidateQueries({ queryKey: ['table-schema', editTable?.name] });

      const errorMessage = err.message || 'Failed to update table';
      setError(errorMessage);
      showToast('Failed to update table', 'error');
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    if (mode === 'edit') {
      updateTableMutation.mutate(data);
    } else {
      createTableMutation.mutate(data);
    }
  });

  const addField = () => {
    append({
      ...defaultField,
      name: '',
      type: FieldType.STRING,
      nullable: true,
      unique: false,
      isSystemField: false,
    });
  };

  const handleAddForeignKey = (fk: Omit<(typeof foreignKeys)[0], 'id'>) => {
    if (editingForeignKey) {
      // Update existing foreign key
      setForeignKeys(
        foreignKeys.map((existingFk) =>
          existingFk.id === editingForeignKey ? { ...existingFk, ...fk } : existingFk
        )
      );
      setEditingForeignKey(null);
    } else {
      // Add new foreign key
      setForeignKeys([
        ...foreignKeys,
        {
          id: generateUUID(),
          ...fk,
        },
      ]);
    }
  };

  const handleRemoveForeignKey = (id: string) => {
    setForeignKeys(foreignKeys.filter((fk) => fk.id !== id));
  };

  if (!open) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Content area with slate background */}
      <div className="flex-1 px-6 bg-slate-100 flex flex-col items-center overflow-auto">
        <div className="flex flex-col gap-6 w-full max-w-[1080px] px-6 py-6">
          {/* Title Bar */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-black">
              {mode === 'edit' ? 'Edit Table' : 'Create New Table'}
            </h1>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex items-center justify-center w-12 h-12 bg-white rounded-full border border-zinc-200 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Table Name */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-zinc-950">Table Name</label>
                <Input
                  {...form.register('name')}
                  placeholder="e.g., products, orders, customers"
                  className="h-10 rounded-md border-zinc-200 shadow-sm placeholder:text-zinc-500"
                  disabled={mode === 'edit'}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
            </div>

            {/* Columns Section */}
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              {/* Columns Header */}
              <div className="px-6 py-3 bg-white">
                <h2 className="text-base font-semibold text-black mb-3">Columns</h2>
              </div>

              {/* Columns Table */}
              <div className="pb-6">
                {/* Table Headers */}
                <div className="flex items-center gap-6 px-7 py-2 bg-slate-50 rounded-t text-sm font-medium text-zinc-950">
                  <div className="w-[280px]">Name</div>
                  <div className="w-[200px]">Type</div>
                  <div className="w-[200px]">Default Value</div>
                  <div className="flex-1 text-center">Nullable</div>
                  <div className="flex-1 text-center">Unique</div>
                  <div className="w-5" />
                </div>

                {/* Field Rows */}
                <div className="px-3 border-b border-zinc-200">
                  {sortedFields.map((field) => {
                    const originalIndex = fields.findIndex((f) => f.id === field.id);
                    return (
                      <FieldRow
                        key={field.id}
                        field={field}
                        index={originalIndex}
                        form={form}
                        onRemove={() => remove(originalIndex)}
                        isSystemField={field.isSystemField}
                        isNewField={!field.field_id}
                      />
                    );
                  })}
                </div>

                {/* Add Column Button */}
                <div className="flex justify-center mt-3">
                  <Button
                    type="button"
                    onClick={addField}
                    variant="outline"
                    className="w-50 h-10 px-3 text-sm font-medium text-zinc-700 hover:text-zinc-950"
                  >
                    <Plus className="w-4 h-4" />
                    Add Column
                  </Button>
                </div>
              </div>
            </div>

            {/* Foreign Keys Section */}
            <div className="bg-white rounded-xl border border-zinc-200">
              <div className="p-6">
                <h2 className="text-base font-semibold text-black">Foreign Keys</h2>
                <p className="text-sm text-zinc-500">
                  Create a relationship between this table and another table
                </p>
              </div>

              {/* Existing foreign keys */}
              {foreignKeys.length > 0 && (
                <div className="px-6 pb-6 space-y-3">
                  {foreignKeys.map((fk) => (
                    <div
                      key={fk.id}
                      className="group flex flex-wrap items-center gap-8 pl-4 pr-2 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 transition-colors duration-150"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Link className="w-5 h-5 text-zinc-500" />
                        <span className="font-medium text-sm text-zinc-950">{fk.field}</span>
                        <MoveRight className="w-5 h-5 text-zinc-950" />
                        <span className="font-medium text-sm text-zinc-950">
                          {fk.references_table}.{fk.references_column}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-medium text-sm text-zinc-950 whitespace-nowrap">
                          On Delete:
                        </span>
                        <span className="text-sm text-zinc-500">{fk.on_delete}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-medium text-sm text-zinc-950 whitespace-nowrap">
                          On Update:
                        </span>
                        <span className="text-sm text-zinc-500">{fk.on_update}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-10 px-3 gap-1.5 text-zinc-950 hover:bg-zinc-200 transition-colors rounded-md"
                          onClick={() => {
                            setEditingForeignKey(fk.id);
                            setShowForeignKeyDialog(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="font-medium text-sm">Edit</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveForeignKey(fk.id)}
                          className="h-10 px-3 gap-1.5 text-zinc-950 hover:bg-zinc-200 transition-colors rounded-md"
                        >
                          <X className="w-4 h-4" />
                          <span className="font-medium text-sm">Remove</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Foreign Key Button */}
              <div className="flex justify-center py-3 border-t border-zinc-200">
                <Button
                  type="button"
                  variant="outline"
                  className="w-[200px] h-10 px-3 gap-1.5 text-sm font-medium text-zinc-950 bg-white border-zinc-200 shadow-sm hover:bg-zinc-50"
                  onClick={() => setShowForeignKeyDialog(true)}
                >
                  <Link className="w-4 h-4 mr-1" />
                  Add Foreign Keys
                </Button>
              </div>

              {/* Foreign Key Popover */}
              <ForeignKeyPopover
                form={form}
                mode={mode}
                editTableName={editTable?.name}
                open={showForeignKeyDialog}
                onOpenChange={(open) => {
                  setShowForeignKeyDialog(open);
                  if (!open) {
                    setEditingForeignKey(null);
                  }
                }}
                onAddForeignKey={handleAddForeignKey}
                initialValue={
                  editingForeignKey
                    ? foreignKeys.find((fk) => fk.id === editingForeignKey)
                    : undefined
                }
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 border-t border-zinc-200 px-6 py-3 pb-6">
        <div className="flex justify-end gap-3 max-w-[1080px] mx-auto px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 text-sm font-medium border-zinc-200 shadow-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !form.formState.isValid ||
              createTableMutation.isPending ||
              updateTableMutation.isPending
            }
            className="h-10 px-4 text-sm font-medium bg-zinc-950 text-neutral-50 shadow-sm disabled:opacity-40"
          >
            {mode === 'edit' ? 'Update Table' : 'Save Table'}
          </Button>
        </div>
      </div>
    </div>
  );
}
