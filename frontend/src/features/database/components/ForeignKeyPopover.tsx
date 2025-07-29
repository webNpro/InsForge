import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/radix/Button';
import { Label } from '@/components/radix/Label';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/radix/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/radix/Select';
import { metadataService } from '@/features/dashboard/services/metadata.service';
import { apiClient } from '@/lib/api/client';
import { UseFormReturn } from 'react-hook-form';
import { TableFormData } from '../schema';

interface ForeignKey {
  id: string;
  field: string;
  references_table: string;
  references_column: string;
  on_delete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  on_update: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

interface ForeignKeyPopoverProps {
  form: UseFormReturn<TableFormData>;
  mode: 'create' | 'edit';
  editTableName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddForeignKey: (fk: Omit<ForeignKey, 'id'>) => void;
  initialValue?: Omit<ForeignKey, 'id'>;
}

export function ForeignKeyPopover({
  form,
  mode,
  editTableName,
  open,
  onOpenChange,
  onAddForeignKey,
  initialValue,
}: ForeignKeyPopoverProps) {
  const [newForeignKey, setNewForeignKey] = useState<Omit<ForeignKey, 'id'>>({
    field: '',
    references_table: '',
    references_column: '',
    on_delete: 'NO ACTION' as const,
    on_update: 'NO ACTION' as const,
  });

  const fields = form.watch('fields');

  // Set initial values when editing
  useEffect(() => {
    if (open && initialValue) {
      setNewForeignKey({
        field: initialValue.field,
        references_table: initialValue.references_table,
        references_column: initialValue.references_column,
        on_delete: initialValue.on_delete,
        on_update: initialValue.on_update,
      });
    } else if (!open) {
      // Reset when closing
      setNewForeignKey({
        field: '',
        references_table: '',
        references_column: '',
        on_delete: 'NO ACTION',
        on_update: 'NO ACTION',
      });
    }
  }, [open, initialValue]);

  // Get available tables
  const { data: metadata } = useQuery({
    queryKey: ['metadata'],
    queryFn: () => metadataService.getAppMetadata(),
    enabled: open,
  });

  const availableTables = metadata?.tables
    ? Object.keys(metadata.tables).filter((table) => mode === 'create' || table !== editTableName)
    : [];

  // Get columns for selected reference table
  const { data: referenceTableSchema } = useQuery({
    queryKey: ['schema', newForeignKey.references_table],
    queryFn: async () => {
      if (!newForeignKey.references_table) {
        return null;
      }
      const response = await apiClient.request(
        `/database/tables/${newForeignKey.references_table}/schema`,
        {
          headers: apiClient.withApiKey(),
        }
      );
      return response;
    },
    enabled: !!newForeignKey.references_table && open,
  });

  // Calculate if the button should be enabled
  const isAddButtonEnabled = Boolean(
    newForeignKey.field &&
      newForeignKey.references_table &&
      newForeignKey.references_column &&
      newForeignKey.field !== '' &&
      newForeignKey.references_table !== '' &&
      newForeignKey.references_column !== ''
  );

  const handleAddForeignKey = () => {
    if (newForeignKey.field && newForeignKey.references_table && newForeignKey.references_column) {
      onAddForeignKey(newForeignKey);
      setNewForeignKey({
        field: '',
        references_table: '',
        references_column: '',
        on_delete: 'NO ACTION',
        on_update: 'NO ACTION',
      });
      onOpenChange(false);
    }
  };

  const handleCancelAddForeignKey = () => {
    setNewForeignKey({
      field: '',
      references_table: '',
      references_column: '',
      on_delete: 'NO ACTION',
      on_update: 'NO ACTION',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] p-0 gap-0">
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex flex-col gap-1.5 px-6 pt-6 pb-0">
            <DialogTitle className="text-base font-semibold">
              {initialValue ? 'Edit Foreign Key' : 'Add Foreign Key'}
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">
              {initialValue
                ? 'Modify the relationship between tables'
                : 'Create a relationship between this table and another table'}
            </DialogDescription>
          </div>

          {/* Form Content */}
          <div className="flex flex-col gap-6 px-6 py-6">
            {/* Column selector */}
            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium">Column</Label>
              <Select
                value={newForeignKey.field === '' ? undefined : newForeignKey.field}
                onValueChange={(value) => setNewForeignKey((prev) => ({ ...prev, field: value }))}
              >
                <SelectTrigger className="h-10 border-zinc-200 shadow-sm">
                  <SelectValue placeholder="Select column" className="text-zinc-500" />
                </SelectTrigger>
                <SelectContent>
                  {fields
                    .filter((field) => field.name)
                    .map((field, index) => (
                      <SelectItem key={field.name || index} value={field.name}>
                        {field.name} ({field.type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference Table selector */}
            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium">Reference Table</Label>
              <Select
                value={
                  newForeignKey.references_table === '' ? undefined : newForeignKey.references_table
                }
                onValueChange={(value) => {
                  setNewForeignKey((prev) => ({
                    ...prev,
                    references_table: value,
                    references_column: '', // Reset column when table changes
                  }));
                }}
              >
                <SelectTrigger className="h-10 border-zinc-200 shadow-sm">
                  <SelectValue placeholder="Select table" className="text-zinc-500" />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference Column selector - only shown after table is selected */}
            {newForeignKey.references_table && (
              <div className="flex flex-col gap-3">
                <Label className="text-sm font-medium">Reference Column</Label>
                <Select
                  key={`column-select-${newForeignKey.references_table}`}
                  value={
                    newForeignKey.references_column === ''
                      ? undefined
                      : newForeignKey.references_column
                  }
                  onValueChange={(value) =>
                    setNewForeignKey((prev) => ({ ...prev, references_column: value }))
                  }
                >
                  <SelectTrigger className="h-10 border-zinc-200 shadow-sm">
                    <SelectValue placeholder="Select column" className="text-zinc-500" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const allColumns = referenceTableSchema?.columns || [];

                      if (allColumns.length > 0) {
                        // const sourceType = getSourceFieldType();

                        return allColumns.map((col: any) => {
                          // Check if types match exactly
                          // const typesMatch =
                          //   !sourceType || col.type.toLowerCase() === sourceType.toLowerCase();

                          //Disable if not a valid reference or types don't match
                          const isDisabled = !col.unique; //|| !typesMatch; This is not working because FieldType and Schema Column Type are incompatible

                          return (
                            <SelectItem key={col.name} value={col.name} disabled={isDisabled}>
                              {col.name} ({col.type}){col.primary_key && ' (PK)'}
                              {col.unique && ' (Unique)'}
                            </SelectItem>
                          );
                        });
                      }

                      return (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No columns available
                        </div>
                      );
                    })()}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* On Delete action */}
            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium">On Delete</Label>
              <Select
                value={newForeignKey.on_delete}
                onValueChange={(value: any) =>
                  setNewForeignKey((prev) => ({ ...prev, on_delete: value }))
                }
              >
                <SelectTrigger className="h-10 border-zinc-200 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO ACTION">No Action</SelectItem>
                  <SelectItem value="CASCADE">Cascade</SelectItem>
                  <SelectItem value="SET NULL">Set Null</SelectItem>
                  <SelectItem value="RESTRICT">Restrict</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* On Update action */}
            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium">On Update</Label>
              <Select
                value={newForeignKey.on_update}
                onValueChange={(value: any) =>
                  setNewForeignKey((prev) => ({ ...prev, on_update: value }))
                }
              >
                <SelectTrigger className="h-10 border-zinc-200 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO ACTION">No Action</SelectItem>
                  <SelectItem value="CASCADE">Cascade</SelectItem>
                  <SelectItem value="SET NULL">Set Null</SelectItem>
                  <SelectItem value="RESTRICT">Restrict</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelAddForeignKey}
              className="h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddForeignKey}
              disabled={!isAddButtonEnabled}
              className={`h-10 px-4 ${
                !isAddButtonEnabled ? 'bg-zinc-950/40' : 'bg-zinc-950'
              } text-white shadow-sm`}
            >
              {initialValue ? 'Update Foreign Key' : 'Add Foreign Key'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
