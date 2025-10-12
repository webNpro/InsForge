import { SortDesc, SortAsc } from 'lucide-react';
import { ReactNode } from 'react';

export interface LogsTableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

export interface LogsTableProps<T = Record<string, unknown>> {
  columns: LogsTableColumn<T>[];
  data: T[];
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function LogsTable<T = Record<string, unknown>>({
  columns,
  data,
  sortDirection = 'desc',
  onSort,
  isLoading,
  emptyMessage = 'No data available',
}: LogsTableProps<T>) {
  return (
    <div className="flex flex-col h-full rounded overflow-hidden">
      {/* Scrollable container */}
      <div className="flex-1 overflow-auto">
        {/* Header - sticky inside scroll container */}
        <div className="bg-neutral-900 flex items-center sticky top-0 z-10">
          {columns.map((column, index) => (
            <div
              key={column.key}
              className={`
                flex items-center gap-1 px-3 py-1.5
                ${index < columns.length - 1 ? 'border-r border-neutral-700' : ''}
              `}
              style={{
                width: column.width,
                minWidth: column.width,
                maxWidth: column.width,
                flex: column.width ? '0 0 auto' : '1 1 0',
              }}
            >
              <p className="text-sm text-neutral-400 font-normal leading-6 whitespace-nowrap">
                {column.label}
              </p>
              {column.sortable && (
                <button
                  onClick={() => onSort?.(column.key)}
                  className="p-1 rounded hover:bg-neutral-800 transition-colors"
                  aria-label={`Sort by ${column.label}`}
                >
                  {sortDirection === 'asc' ? (
                    <SortAsc className="h-4 w-4 text-neutral-400" />
                  ) : (
                    <SortDesc className="h-4 w-4 text-neutral-400" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
              <p className="text-sm text-neutral-400">Loading...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <p className="text-sm text-neutral-400">{emptyMessage}</p>
          </div>
        ) : (
          data.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="bg-neutral-800 border-b border-neutral-700 flex items-stretch hover:bg-neutral-750 transition-colors"
            >
              {columns.map((column, colIndex) => (
                <div
                  key={column.key}
                  className={`
                    flex items-center px-3 py-1.5
                    ${colIndex < columns.length - 1 ? 'border-r border-neutral-700' : ''}
                  `}
                  style={{
                    width: column.width,
                    minWidth: column.width,
                    maxWidth: column.width,
                    flex: column.width ? '0 0 auto' : '1 1 0',
                  }}
                >
                  {column.render ? (
                    column.render(row)
                  ) : (
                    <p className="text-sm text-white font-normal leading-6 break-all">
                      {String((row as Record<string, unknown>)[column.key] ?? '')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
