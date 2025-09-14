import { Button } from '@/components/radix/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationControlsProps {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  totalRecords?: number;
  pageSize?: number;
  recordLabel?: string;
}

export function PaginationControls({
  currentPage = 0,
  totalPages = 0,
  onPageChange,
  totalRecords = 0,
  pageSize = 50,
  recordLabel = 'results',
}: PaginationControlsProps) {
  const hasNoRecords = totalRecords === 0;
  const startRecord = hasNoRecords ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = hasNoRecords ? 0 : Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 dark:bg-neutral-800 dark:border-neutral-700">
      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        Showing {startRecord} to {endRecord} of {totalRecords} {recordLabel}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage <= 1 || hasNoRecords}
          className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-700 dark:text-zinc-300">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage >= totalPages || hasNoRecords}
          className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
