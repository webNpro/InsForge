import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/radix/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/radix/Popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/radix/Tooltip';
import { Badge } from '@/components/radix/Badge';
import { databaseService } from '@/features/database/services/database.service';

interface ReferenceCellPopoverProps {
  value: string;
  foreignKey: {
    table: string;
    column: string;
  };
}

export function ReferenceCellPopover({ value, foreignKey }: ReferenceCellPopoverProps) {
  const [open, setOpen] = useState(false);

  // Fetch the referenced record when popover opens
  const {
    data: record,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['record', foreignKey.table, value],
    queryFn: () => databaseService.getRecord(foreignKey.table, value),
    enabled: open && !!value,
  });

  // Fetch schema for the referenced table
  const { data: schema } = useQuery({
    queryKey: ['schema', foreignKey.table],
    queryFn: () => databaseService.getTableSchema(foreignKey.table),
    enabled: open && !!value,
  });

  if (!value) {
    return <span className="text-muted-foreground">null</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs" title={value}>
        {value.substring(0, 8)}...
      </span>

      <Popover open={open} onOpenChange={setOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>View referenced record</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <PopoverContent className="w-100 max-h-125 overflow-auto" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h4 className="font-medium">Referenced Record</h4>
                <p className="text-sm text-muted-foreground">
                  from <span className="font-mono">{foreignKey.table}</span>
                </p>
              </div>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Failed to load record</span>
              </div>
            )}

            {record && schema && (
              <div className="space-y-2">
                {schema.columns.map((col: any) => (
                  <div key={col.name} className="grid grid-cols-3 gap-2 text-sm">
                    <div className="font-medium text-muted-foreground">{col.name}</div>
                    <div className="col-span-2">
                      <RecordValue value={record[col.name]} type={col.type} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function RecordValue({ value, type }: { value: any; type: string }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">null</span>;
  }

  if (typeof value === 'boolean' || (type === 'INTEGER' && (value === 0 || value === 1))) {
    const boolValue = Boolean(value);
    return (
      <Badge variant={boolValue ? 'default' : 'secondary'}>{boolValue ? 'true' : 'false'}</Badge>
    );
  }

  if (typeof value === 'object') {
    return (
      <code className="text-xs bg-muted px-1 py-0.5 rounded">{JSON.stringify(value, null, 2)}</code>
    );
  }

  const stringValue = String(value);

  // Format dates
  if (type === 'TEXT' && stringValue.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
    return <span>{new Date(stringValue).toLocaleString()}</span>;
  }

  // Truncate long strings
  if (stringValue.length > 100) {
    return <span title={stringValue}>{stringValue.substring(0, 100)}...</span>;
  }

  return <span>{stringValue}</span>;
}
