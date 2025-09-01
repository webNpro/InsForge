import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/radix/Dialog';
import { Button } from '@/components/radix/Button';
import { databaseService } from '@/features/database/services/database.service';
import { convertSchemaToColumns } from '@/features/database/components/DatabaseDataGrid';
import { SearchInput, DataGrid } from '@/components';
import { SortColumn } from 'react-data-grid';

// Type for database records
type DatabaseRecord = Record<string, any>;

interface LinkRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  referenceColumn: string;
  onSelectRecord: (record: DatabaseRecord) => void;
  currentValue?: string | null;
}

export function LinkRecordModal({
  open,
  onOpenChange,
  tableName,
  referenceColumn,
  onSelectRecord,
}: LinkRecordModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<DatabaseRecord | null>(null);
  const [sortColumns, setSortColumns] = useState<SortColumn[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Fetch table schema
  const { data: schema } = useQuery({
    queryKey: ['table-schema', tableName],
    queryFn: () => databaseService.getTableSchema(tableName),
    enabled: open,
  });

  // Fetch records from the reference table
  const { data: recordsData, isLoading } = useQuery({
    queryKey: [
      'records',
      tableName,
      currentPage,
      pageSize,
      searchQuery,
      JSON.stringify(sortColumns),
    ],
    queryFn: async () => {
      const offset = (currentPage - 1) * pageSize;
      const response = await databaseService.getTableRecords(
        tableName,
        pageSize,
        offset,
        searchQuery || undefined,
        sortColumns
      );
      return response;
    },
    enabled: open,
  });

  // Reset selection when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedRecord(null);
      setSearchQuery('');
      setSortColumns([]);
      setCurrentPage(1);
    }
  }, [open]);

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const records = recordsData?.records || [];
  const totalRecords = recordsData?.total || 0;
  const totalPages = Math.ceil(totalRecords / pageSize);

  // Create selected rows set for highlighting
  const selectedRows = useMemo(() => {
    if (!selectedRecord) {
      return new Set<string>();
    }
    return new Set([selectedRecord.id]);
  }, [selectedRecord]);

  // Handle cell click to select record
  const handleCellClick = useCallback(
    (args: any) => {
      const record = records.find((r: DatabaseRecord) => r.id === args.row.id);
      if (record) {
        setSelectedRecord(record);
      }
    },
    [records]
  );

  // Convert schema to columns for the DataGrid with proper widths
  const columns = useMemo(() => {
    return convertSchemaToColumns(schema);
  }, [schema]);

  const handleConfirmSelection = () => {
    if (selectedRecord) {
      onSelectRecord(selectedRecord);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[calc(100vh-48px)] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-3 border-b border-zinc-200 dark:border-neutral-700 flex-shrink-0 flex flex-col gap-1">
          <DialogTitle className="text-lg font-semibold text-zinc-950 dark:text-white">
            Link Record
          </DialogTitle>
          <p className="text-sm text-zinc-500 dark:text-neutral-400 flex items-center gap-1">
            Select a record to reference from
            <span className="font-mono bg-zinc-200 text-black dark:bg-neutral-700 dark:text-neutral-400 px-1.5 py-0.5 rounded text-xs">
              {tableName}.{referenceColumn}
            </span>
          </p>
        </DialogHeader>

        {/* Search Bar */}
        <div className="p-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search records..."
            className="w-60 dark:bg-neutral-900 dark:border-neutral-700"
            debounceTime={300}
          />
        </div>

        {/* Records DataGrid */}
        <div className="flex-1 overflow-hidden">
          <DataGrid
            data={records}
            columns={columns}
            loading={isLoading && !records.length}
            selectedRows={selectedRows}
            onSelectedRowsChange={(newSelectedRows) => {
              // Handle selection changes from cell clicks
              const selectedId = Array.from(newSelectedRows)[0];
              if (selectedId) {
                const record = records.find((r: DatabaseRecord) => r.id === selectedId);
                if (record) {
                  setSelectedRecord(record);
                }
              } else {
                setSelectedRecord(null);
              }
            }}
            sortColumns={sortColumns}
            onSortColumnsChange={setSortColumns}
            onCellClick={handleCellClick}
            searchQuery={searchQuery}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalRecords={totalRecords}
            onPageChange={setCurrentPage}
            showSelection={true} // Enable selection for row highlighting
            hideSelectionColumn={true} // Hide checkbox column but keep row highlighting
            showPagination={true}
            emptyStateTitle="No records found"
            emptyStateDescription={
              searchQuery
                ? 'No records match your search criteria'
                : 'This table contains no records'
            }
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-neutral-700 flex justify-end gap-3 flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="dark:bg-neutral-600 dark:text-white dark:border-transparent dark:hover:bg-neutral-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSelection}
            disabled={!selectedRecord}
            className="bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-emerald-300 dark:text-zinc-950 dark:hover:bg-emerald-400"
          >
            Add Record
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
