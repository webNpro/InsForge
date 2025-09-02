import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/radix/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/radix/Popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/radix/Tooltip';
import { databaseService } from '@/features/database/services/database.service';
import { DataGrid } from '@/components/DataGrid';
import { convertSchemaToColumns } from '@/features/database/components/DatabaseDataGrid';

interface ForeignKeyCellProps {
  value: string;
  foreignKey: {
    table: string;
    column: string;
  };
  onJumpToTable?: (tableName: string) => void;
}

export function ForeignKeyCell({ value, foreignKey, onJumpToTable }: ForeignKeyCellProps) {
  const [open, setOpen] = useState(false);

  // Fetch the referenced record when popover opens
  const {
    data: recordData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['foreign-key-record', foreignKey.table, foreignKey.column, value],
    queryFn: async () => {
      if (!value) return null;
      
      console.log('Fetching foreign key record:', {
        table: foreignKey.table,
        column: foreignKey.column,
        value: value
      });
      
      try {
        // First try the direct getRecord method (assuming it looks up by ID)
        const response = await databaseService.getRecord(foreignKey.table, value);
        console.log('Direct getRecord response:', response);
        return Array.isArray(response) ? response[0] : response;
      } catch (error) {
        console.warn('Direct getRecord failed, trying alternative approach:', error);
        
        // Fallback: Use getRecords with PostgREST query format
        const queryParams = `${foreignKey.column}=eq.${value}&limit=1`;
        console.log('Fallback query params:', queryParams);
        const response = await databaseService.getRecords(foreignKey.table, queryParams);
        console.log('Fallback getRecords response:', response);
        return Array.isArray(response) && response.length > 0 ? response[0] : null;
      }
    },
    enabled: open && !!value,
  });

  const record = recordData;

  // Fetch schema for the referenced table
  const { data: schema } = useQuery({
    queryKey: ['schema', foreignKey.table],
    queryFn: () => databaseService.getTableSchema(foreignKey.table),
    enabled: open && !!value,
  });

  if (!value) {
    return <span className="text-muted-foreground">null</span>;
  }

  // Convert schema to columns for the mini DataGrid
  const columns = useMemo(() => {
    if (!schema) return [];
    // Use convertSchemaToColumns but disable foreign keys to prevent nested popovers
    return convertSchemaToColumns(schema, undefined, undefined).map(col => ({
      ...col,
      width: 120, // Smaller widths for mini grid
      minWidth: 80,
      resizable: false,
      editable: false, // Disable editing in preview
    }));
  }, [schema]);

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs truncate" title={value}>
        {value ? (value.length > 8 ? `${value.substring(0, 8)}...` : value) : 'null'}
      </span>

      <Popover open={open} onOpenChange={setOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>View linked record</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <PopoverContent 
          className="w-[500px] p-0 shadow-lg border" 
          align="start"
          side="bottom"
          sideOffset={5}
        >
          <div className="flex flex-col max-h-[400px]">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-gray-50 dark:bg-neutral-800">
              <div>
                <h4 className="font-medium text-sm">Linked Record</h4>
                <p className="text-xs text-muted-foreground">
                  from <span className="font-mono">{foreignKey.table}</span>
                </p>
              </div>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed to load record</span>
                </div>
              )}

              {record && schema && columns.length > 0 && (
                <div className="h-full flex flex-col">
                  {/* Mini DataGrid */}
                  <div className="flex-1 min-h-[120px]">
                    <DataGrid
                      data={[record]} // Single record array
                      columns={columns}
                      loading={false}
                      showSelection={false}
                      showPagination={false}
                      className="mini-reference-grid"
                    />
                  </div>
                  
                  {/* Jump to Table Button */}
                  {onJumpToTable && (
                    <div className="p-3 border-t bg-gray-50 dark:bg-neutral-800">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          onJumpToTable(foreignKey.table);
                          setOpen(false);
                        }}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Open {foreignKey.table} Table
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
