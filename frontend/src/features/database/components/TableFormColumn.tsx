import { Controller, UseFormReturn } from 'react-hook-form';
import { X, Key } from 'lucide-react';
import { Input } from '@/components/radix/Input';
import Checkbox from '@/components/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/radix/Select';
import { columnTypeIcons } from '../constants';
import { TableFormColumnSchema, TableFormSchema } from '../schema';
import { columnTypeSchema } from '@schemas/database.schema';

const COLUMN_TYPES_ARRAY = columnTypeSchema.options;

interface TableFormColumnProps {
  index: number;
  form: UseFormReturn<TableFormSchema>;
  onRemove: () => void;
  isSystemColumn: boolean;
  isNewColumn: boolean;
  column: TableFormColumnSchema;
}

export function TableFormColumn({
  index,
  form,
  onRemove,
  isSystemColumn,
  isNewColumn,
  column,
}: TableFormColumnProps) {
  // System fields are the first 3 preset fields in create mode

  return (
    <div
      className={`flex items-center gap-6 px-4 py-2 border-t border-zinc-200 ${
        isNewColumn ? 'bg-slate-50' : 'bg-white'
      }`}
    >
      {/* Name */}
      <div className="w-[280px]">
        <div className="relative flex items-center">
          <Input
            {...form.register(`columns.${index}.name`)}
            placeholder="Enter column name"
            className={`h-10 rounded-md border-zinc-200 text-sm font-normal ${
              isSystemColumn ? 'bg-zinc-100 text-zinc-950' : 'bg-white text-zinc-950 shadow-sm'
            }`}
            disabled={isSystemColumn}
          />
          {/* Show key icon only for the first preset field in create mode (which is the system id) */}
          {isSystemColumn && column.name === 'id' && (
            <Key className="absolute left-[35px] top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Type */}
      <div className="w-[200px]">
        <Controller
          control={form.control}
          name={`columns.${index}.type`}
          render={({ field }) => {
            const Icon = columnTypeIcons[field.value];
            return (
              <Select disabled={!isNewColumn} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  className={`h-10 rounded-md border-zinc-200 text-sm font-normal ${
                    isSystemColumn ? 'bg-zinc-100' : 'bg-white shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-zinc-500" />}
                    <span>{field.value.toLocaleLowerCase()}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {COLUMN_TYPES_ARRAY.map((type) => {
                    const TypeIcon = columnTypeIcons[type];
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4" />
                          <span>{type.toLocaleLowerCase()}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            );
          }}
        />
      </div>

      {/* Default Value */}
      <div className="w-[200px]">
        <Input
          {...form.register(`columns.${index}.default_value`)}
          placeholder="Enter default value"
          className={`h-10 rounded-md border-zinc-200 text-sm font-normal placeholder:text-zinc-500 ${
            isSystemColumn ? 'bg-zinc-100' : 'bg-white shadow-sm'
          }`}
          disabled={isSystemColumn}
        />
      </div>

      {/* Nullable */}
      <div className="flex-1 flex justify-center">
        <Checkbox
          checked={form.watch(`columns.${index}.nullable`)}
          onChange={(checked) => form.setValue(`columns.${index}.nullable`, !!checked)}
          disabled={isSystemColumn}
          className={`rounded border-zinc-700 shadow-sm data-[state=checked]:bg-zinc-600 data-[state=checked]:border-zinc-600`}
        />
      </div>

      {/* Unique */}
      <div className="flex-1 flex justify-center">
        <Checkbox
          checked={form.watch(`columns.${index}.is_unique`)}
          onChange={(checked) => form.setValue(`columns.${index}.is_unique`, !!checked)}
          disabled={isSystemColumn}
          className={`rounded border-zinc-700 shadow-sm data-[state=checked]:bg-zinc-600 data-[state=checked]:border-zinc-600`}
        />
      </div>

      {/* Delete */}
      <div className="w-5 h-5">
        {!isSystemColumn && (
          <button
            type="button"
            onClick={onRemove}
            className="hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        )}
      </div>
    </div>
  );
}
